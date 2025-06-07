// Update imports
import { Inject, Injectable, NotFoundException, RequestTimeoutException, HttpException, HttpStatus } from '@nestjs/common';
import { CreateDeviceDto } from './dto/create-device.dto';
import { Device, DeviceDocument } from 'src/schema/device.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from 'src/schema/user.schema';
import { DELETE_FINGERPRINT, IMPORT_FINGERPRINT } from 'src/shared/constants/mqtt.constant';
import { ClientProxy } from '@nestjs/microservices';
import { EventPattern } from '@nestjs/microservices';
import { UserDevice, UserDeviceDocument } from 'src/schema/user-device.schema';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { MqttService } from '../mqtt/mqtt.service';

@Injectable()
export class DevicesService {
  private readonly verificationTimeouts: Map<string, NodeJS.Timeout> =
    new Map();

  private readonly verificationCallbacks: Map<
    string,
    (verified: boolean) => void
  > = new Map();

  constructor(
    @Inject('MQTT_CLIENT') private readonly mqttClient: ClientProxy,
    private readonly mqttService: MqttService,
    @InjectModel(Device.name)
    private readonly deviceModel: Model<DeviceDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(UserDevice.name)
    private readonly userDeviceModel : Model<UserDeviceDocument>
  ){}

  async getDeviceByMac(deviceMac: string): Promise<DeviceDocument> {
    try {
      return await this.deviceModel.findOne({deviceMac});
    }
    catch (error) {
      throw new Error(`Failed to find device: ${error.message}`);
    }
  }

    async createDevice(createDeviceDto: CreateDeviceDto) {
    const { deviceMac, description, status } = createDeviceDto;

    const existingDevice = await this.deviceModel.findOne({ deviceMac });
    if (existingDevice) {
      throw new HttpException('Thiết bị đã tồn tại', HttpStatus.CONFLICT);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.cleanupVerification(deviceMac);
        reject(new RequestTimeoutException('Verification timeout'));
      }, 30000);

      this.verificationTimeouts.set(deviceMac, timeout);

      this.verificationCallbacks.set(deviceMac, async (verified: boolean) => {
        if (verified) {
          try {
            const newDevice = { 
              deviceMac,
              description,
              status: status || 'online',
            };
            const createdDevice = await this.deviceModel.create(newDevice);
            
            resolve(createdDevice);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new HttpException('Device verification failed', HttpStatus.BAD_REQUEST));
        }
      });

      this.publishVerifyDevice(deviceMac);
    });
  }

  publishVerifyDevice(deviceMac: string) {
    const topic = `verify_device_${deviceMac}`;
    const message = { deviceMac, action: 'verify' };
    return this.mqttClient.emit(topic, message);
  }

  handleVerificationResponse(deviceMac: string, verified: boolean) {
    const callback = this.verificationCallbacks.get(deviceMac);
    if (callback) {
      callback(verified);
      this.cleanupVerification(deviceMac);
    }
  }

  private cleanupVerification(deviceMac: string) {
    const timeout = this.verificationTimeouts.get(deviceMac);
    if (timeout) clearTimeout(timeout);
    this.verificationTimeouts.delete(deviceMac);
    this.verificationCallbacks.delete(deviceMac);
  }

    async findAllDevices(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<{ devices: DeviceDocument[]; total: number; page: number; totalPages: number }> {
    try {
      const query = search
        ? {
            $or: [
              { deviceMac: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } },
            ],
          }
        : {};

      const skip = (page - 1) * limit;
      const [devices, total] = await Promise.all([
        this.deviceModel
          .find(query)
          .populate({
            path: 'users',
            select: 'name email userId'
          })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        this.deviceModel.countDocuments(query),
      ]);

      return {
        devices,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new Error(`Failed to find devices: ${error.message}`);
    }
  }
   async addUserToDevice(deviceId: string, userId: string) {
    try {
      const [device, user] = await Promise.all([
        this.deviceModel.findById(deviceId),
        this.userModel.findById(userId)
      ]);

      if (!device) {
        throw new NotFoundException('Device not found');
      }
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (device.status !== "online") {
        throw new HttpException('Device is offline, cannot connect', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);
      if (!device.users.some(id => id.equals(userObjectId))) {
        device.users.push(userObjectId);
        
        let newFingerId = 1;
        const lastUserDevice = await this.userDeviceModel
          .findOne({ device: device._id })
          .sort({ fingerId: -1 });
          
        if (lastUserDevice) {
          newFingerId = lastUserDevice.fingerId + 1;
        }

        const userDevice = new this.userDeviceModel({
          user: userObjectId,
          device: device._id,
          fingerId: newFingerId
        });
        await userDevice.save();

        this.mqttClient.emit(`import-fingerprint/${device.deviceMac}`, JSON.stringify({
          userId: String(user._id),
          fingerId: newFingerId
        }));
        
        await device.save();
      }

      return device;
    } catch (error) {
      console.error('Error in addUserToDevice:', error);
      throw error;
    }
  }

  async removeUserFromDevice(deviceId: string, userId: string) {
    try {
      const [device, user] = await Promise.all([
        this.deviceModel.findById(deviceId),
        this.userModel.findById(userId)
      ]);

      if (!device) {
        throw new NotFoundException('Device not found');
      }

      if (device.status !== "online") {
        throw new HttpException('Device is offline, cannot connect', HttpStatus.BAD_REQUEST);
      }
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const userObjectId = new Types.ObjectId(userId);
      const userIndex = device.users.findIndex(id => id.equals(userObjectId));
      
      if (userIndex === -1) {
        throw new NotFoundException('User not found in device');
      }

      const userDevice = await this.userDeviceModel.findOne({
        user: userObjectId,
        device: device._id
      });

      if (userDevice) {
        this.mqttClient.emit(`${DELETE_FINGERPRINT}/${device.deviceMac}`, JSON.stringify({
          fingerId: userDevice.fingerId
        }));
        
        await this.userDeviceModel.findByIdAndDelete(userDevice._id);
      }

      device.users.splice(userIndex, 1);
      await device.save();

      return device;
    } catch (error) {
      console.error('Error in removeUserFromDevice:', error);
      throw error;
    }
  }

  async syncAllUser(deviceId: string) {
    try {
      const device = await this.deviceModel.findById(deviceId);
      if (!device) {
        throw new NotFoundException('Device not found');
      }

      if (device.status !== "online") {
        throw new HttpException('Device is offline, cannot connect', HttpStatus.BAD_REQUEST);
      }

      const allUsers = await this.userModel.find({});

      const currentUserIds = device.users.map(id => id.toString());

      const usersToAdd = allUsers.filter(user => !currentUserIds.includes(user._id.toString()));

      for (const user of usersToAdd) {

        let newFingerId = 1;
        const lastUserDevice = await this.userDeviceModel
          .findOne({ device: device._id })
          .sort({ fingerId: -1 });
          
        if (lastUserDevice) {
          newFingerId = lastUserDevice.fingerId + 1;
        }

        const userDevice = new this.userDeviceModel({
          user: user._id,
          device: device._id,
          fingerId: newFingerId
        });
        await userDevice.save();

        device.users.push(user._id);

        this.mqttClient.emit(`${IMPORT_FINGERPRINT}/${device.deviceMac}`, JSON.stringify({
          userId: String(user._id),
          fingerId: newFingerId
        }));
      }

      await device.save();
      
      return {
        message: `Successfully synced ${usersToAdd.length} users to device`,
        syncedUsers: usersToAdd.length,
        totalUsers: allUsers.length
      };
    } catch (error) {
      console.error('Error in syncAllUser:', error);
      throw error;
    }
  }

  async deleteAllUser(deviceId: string) {
    let device;
    try {
      device = await this.deviceModel.findById(deviceId);
  
      if (!device) {
        throw new NotFoundException('Device Not Found');
      }
  
      if (device.status !== "online") {
        throw new HttpException('Device is offline, cannot connect', HttpStatus.BAD_REQUEST);
      }
  
      
      try {
        const response = await this.mqttService.emptyDatabase(device.deviceMac);

        if (!response.success) {
          throw new HttpException(
            'Device failed to empty database: ' + response.message,
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
  
        
        await this.userDeviceModel.deleteMany({ device: device._id });
        device.users = [];
        await device.save();
  
        return {
          message: 'Successfully deleted all users from device',
        };
      } catch (error) {
        throw new HttpException(
          'Failed to empty device database: ' + error.message,
          HttpStatus.GATEWAY_TIMEOUT
        );
      }
    } catch (error) {
      console.error('Error in delete all user:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'An error occurred while deleting users',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateDevice(deviceId: string, updateDeviceDto: UpdateDeviceDto) {
    try {
      const device = await this.deviceModel.findById(deviceId);
      
      if (!device) {
        throw new NotFoundException('Device not found');
      }

      // Update device with new data
      const updatedDevice = await this.deviceModel.findByIdAndUpdate(
        deviceId,
        updateDeviceDto,
        { new: true, runValidators: true }
      );

      return updatedDevice;
    } catch (error) {
      console.error('Error in updateDevice:', error);
      throw error;
    }
  }

  async getAllUserOfDevice(deviceId: string) {
    try {
      const device = await this.deviceModel.findById(deviceId);
      
      if (!device) {
        throw new NotFoundException('Device not found');
      }

      console.log('deviceId:', deviceId);
      console.log('device._id:', device._id);

      const userDeviceCount = await this.userDeviceModel.countDocuments({ device: deviceId });
      console.log('UserDevice count for this device:', userDeviceCount);

      const userDevices = await this.userDeviceModel
        .find({ device: device._id })
        .populate('user', 'name email username createdAt')
        .exec();

      console.log('userDevices found:', userDevices.length);

      if (userDevices.length === 0 && device.users.length > 0) {
        console.log('Creating missing UserDevice records...');
        
        for (let i = 0; i < device.users.length; i++) {
          const userId = device.users[i];
          const fingerId = i + 1; 
          
          await this.userDeviceModel.create({
            user: userId,
            device: device._id,
            fingerId: fingerId
          });
        }

        const newUserDevices = await this.userDeviceModel
          .find({ device: device._id })
          .populate('user', 'name email username createdAt')
          .exec();
          
        const usersWithFingerId = newUserDevices.map(userDevice => ({
          _id: (userDevice.user as any)._id,
          name: (userDevice.user as any).name,
          email: (userDevice.user as any).email,
          username: (userDevice.user as any).username,
          createdAt: (userDevice.user as any).createdAt,
          fingerId: userDevice.fingerId
        }));

        return {
          device: {
            _id: device._id,
            deviceMac: device.deviceMac,
            description: device.description
          },
          users: usersWithFingerId,
          totalUsers: usersWithFingerId.length
        };
      }

      const usersWithFingerId = userDevices.map(userDevice => ({
        _id: (userDevice.user as any)._id,
        name: (userDevice.user as any).name,
        email: (userDevice.user as any).email,
        username: (userDevice.user as any).username,
        createdAt: (userDevice.user as any).createdAt,
        fingerId: userDevice.fingerId
      }));

      return {
        device: {
          _id: device._id,
          deviceMac: device.deviceMac,
          description: device.description
        },
        users: usersWithFingerId,
        totalUsers: usersWithFingerId.length
      };
    } catch (error) {
      console.error('Error in getAllUserOfDevice:', error);
      throw error;
    }
  }

  async getAllUserNotInDevice(deviceId: string) {
    try {
      const device = await this.deviceModel.findById(deviceId);
      if (!device) {
        throw new NotFoundException('Device not found');
      }

      const usersNotInDevice = await this.userModel.find({
        _id: { $nin: device.users }
      }).select('name email userId');

      return usersNotInDevice;
    } catch (error) {
      throw new HttpException(
        `Failed to get users not in device: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateDeviceStatus(deviceId: string, status: string) {
    if (!['online', 'offline'].includes(status)) {
      throw new HttpException('Invalid status value. Must be either "online" or "offline"', HttpStatus.BAD_REQUEST);
    }

    const device = await this.deviceModel.findById(deviceId);
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.status = status;
    return await device.save();
  }
}