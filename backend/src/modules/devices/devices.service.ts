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

@Injectable()
export class DevicesService {
  //Map lưu timeout khi yêu cầu verified device
  private readonly verificationTimeouts: Map<string, NodeJS.Timeout> =
    new Map();

  //Map lưu callback xác thực từ device
  private readonly verificationCallbacks: Map<
    string,
    (verified: boolean) => void
  > = new Map();

  constructor(
    @Inject('MQTT_CLIENT') private readonly mqttClient: ClientProxy,

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
    const { deviceMac, description } = createDeviceDto;

    // Kiểm tra xem deviceMac có tồn tại trong DB không
    const existingDevice = await this.deviceModel.findOne({ deviceMac });
    if (existingDevice) {
      throw new HttpException('Thiết bị đã tồn tại', HttpStatus.CONFLICT);
    }

    // Tạo promise để verify device trước khi tạo
    return new Promise((resolve, reject) => {
      // Đặt timeout cho xác thực
      const timeout = setTimeout(() => {
        this.cleanupVerification(deviceMac);
        reject(new RequestTimeoutException('Verification timeout'));
      }, 30000);
      
      // Lưu timeout reference để có thể clear sau này
      this.verificationTimeouts.set(deviceMac, timeout);
      
      // Lưu callback function sẽ được gọi khi nhận được response từ device
      this.verificationCallbacks.set(deviceMac, async (verified: boolean) => {
        if (verified) {
          try {
            // Nếu verify thành công, tạo device trong DB
            const newDevice = { 
              deviceMac,
              description,
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
      
      // Gửi request verify đến device qua MQTT
      this.publishVerifyDevice(deviceMac);
    });
  }

  publishVerifyDevice(deviceMac: string) {
    const topic = `verify_device_${deviceMac}`;
    const message = { deviceMac, action: 'verify' };
    return this.mqttClient.emit(topic, message);
  }

  // Được gọi khi nhận được response từ device
  handleVerificationResponse(deviceMac: string, verified: boolean) {
    // Lấy callback function đã lưu trước đó
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

  // Phương thức addUserToDevice giữ nguyên
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

      const userObjectId = new Types.ObjectId(userId);
      if (!device.users.some(id => id.equals(userObjectId))) {
        device.users.push(userObjectId);
        
        // Generate a new fingerId for this user on this device
        // Get the last used fingerId or start with 1
        let newFingerId = 1;
        const lastUserDevice = await this.userDeviceModel
          .findOne({ device: device._id })
          .sort({ fingerId: -1 });
          
        if (lastUserDevice) {
          newFingerId = lastUserDevice.fingerId + 1;
        }
        
        // Create the UserDevice relationship with the fingerId
        const userDevice = new this.userDeviceModel({
          user: userObjectId,
          device: device._id,
          fingerId: newFingerId
        });
        await userDevice.save();
        
        // Send the userId and fingerId to the device
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

  // Phương thức removeUserFromDevice giữ nguyên
  async removeUserFromDevice(deviceId: string, userId: string) {
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

      const userObjectId = new Types.ObjectId(userId);
      const userIndex = device.users.findIndex(id => id.equals(userObjectId));
      
      if (userIndex === -1) {
        throw new NotFoundException('User not found in device');
      }

      // Find the UserDevice relationship to get the fingerId
      const userDevice = await this.userDeviceModel.findOne({
        user: userObjectId,
        device: device._id
      });

      if (userDevice) {
        // Send delete fingerprint command to device with the correct fingerId
        this.mqttClient.emit(`${DELETE_FINGERPRINT}/${device.deviceMac}`, JSON.stringify({
          fingerId: userDevice.fingerId
        }));
        
        // Remove the UserDevice relationship
        await this.userDeviceModel.findByIdAndDelete(userDevice._id);
      }

      // Remove user from device's users array
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

      // Get all users from database
      const allUsers = await this.userModel.find({});
      
      // Get current users in device
      const currentUserIds = device.users.map(id => id.toString());
      
      // Filter out users that are not in the device
      const usersToAdd = allUsers.filter(user => !currentUserIds.includes(user._id.toString()));
      
      // Add each new user to the device
      for (const user of usersToAdd) {
        // Generate a new fingerId for this user on this device
        let newFingerId = 1;
        const lastUserDevice = await this.userDeviceModel
          .findOne({ device: device._id })
          .sort({ fingerId: -1 });
          
        if (lastUserDevice) {
          newFingerId = lastUserDevice.fingerId + 1;
        }
        
        // Create the UserDevice relationship with the fingerId
        const userDevice = new this.userDeviceModel({
          user: user._id,
          device: device._id,
          fingerId: newFingerId
        });
        await userDevice.save();
        
        // Add user to device users array
        device.users.push(user._id);
        
        // Send the userId and fingerId to the device
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
    try {
      const device = await this.deviceModel.findById(deviceId);

      if (!device) {
        throw new NotFoundException('Device Not Found');
      }

      // Xóa tất cả bản ghi trong UserDevice liên quan đến thiết bị này
      await this.userDeviceModel.deleteMany({ device: device._id });

      // Xóa tất cả người dùng khỏi mảng users của thiết bị
      device.users = [];
      await device.save();

      // Gửi lệnh xóa toàn bộ database vân tay trên thiết bị
      await this.mqttClient.emit(`empty-database/${device.deviceMac}`, '');

      return {
        message: 'Successfully deleted all users from device',
      };
    } catch (error) {
      console.error('Error in delete all user', error);
      throw error;
    }
  }
}