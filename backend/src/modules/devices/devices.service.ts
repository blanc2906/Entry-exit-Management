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
        this.mqttClient.emit(IMPORT_FINGERPRINT, String(user._id));
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

      device.users.splice(userIndex, 1);
      //this.mqttClient.emit(DELETE_FINGERPRINT, user.fingerId);
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
        device.users.push(user._id);
        // Emit MQTT event to import fingerprint
        this.mqttClient.emit(IMPORT_FINGERPRINT, String(user._id));
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
}