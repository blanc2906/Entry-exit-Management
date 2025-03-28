import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { Device, DeviceDocument } from 'src/schema/device.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from 'src/schema/user.schema';
import { MqttService } from '../mqtt/mqtt.service';

@Injectable()
export class DevicesService {
  constructor(
    @InjectModel(Device.name)
    private readonly deviceModel: Model<DeviceDocument>,
    @InjectModel(User.name)
    private readonly userModel : Model<UserDocument>,

    private readonly mqttService : MqttService
  ){}
  async create(createDeviceDto: CreateDeviceDto): Promise<DeviceDocument> {
    try {
      const existingDevice = await this.deviceModel.findOne({ deviceMac: createDeviceDto.deviceMac });
      if (existingDevice) {
        throw new Error('Device already exists');
      }
  
      const verificationPromise = new Promise<boolean>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Device verification timeout'));
        }, 50000);
  
        const requestTopic = `verify_device_${createDeviceDto.deviceMac}`;
        const responseTopic = `verified_device_${createDeviceDto.deviceMac}`;
        
        const subscription = this.mqttService.subscribe(responseTopic).subscribe({
          next: (response) => {
            if (response === 'verified') {
              clearTimeout(timeoutId);
              subscription.unsubscribe();
              resolve(true);
            }
          },
          error: (error) => {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
            reject(new Error('Device verification failed'));
          },
          complete: () => {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
          }
        });
  
        this.mqttService.publish(requestTopic, 'verify');
      });
  
      await verificationPromise;
      
      const device = new this.deviceModel(createDeviceDto);
      return await device.save();
    } catch (error) {
      throw new Error(`Failed to create device: ${error.message}`);
    }
  }

  async addUserToDevice(deviceId: string, userId: string) {
    try {
      const device = await this.deviceModel.findById(deviceId);
      const user = await this.userModel.findById(userId);
  
      if (!device || !user) {
        throw new NotFoundException('Device or User not found');
      }
  
      if (!device.users.includes(new Types.ObjectId(userId))) {
        device.users.push(new Types.ObjectId(userId));
        await this.mqttService.publish(`import_fingerprint_${device.deviceMac}`, String(user._id));
        await device.save();
      }
  
      return device;
    } catch (error) {
      throw new Error(`Failed to add user to device: ${error.message}`);
    }
  }

  async removeUserFromDevice(deviceId: string, userId: string) {
    try {
      const device = await this.deviceModel.findById(deviceId);
      
      if (!device) {
        throw new NotFoundException('Device not found');
      }
      device.users = device.users.filter(id => id.toString() !== userId);
      await device.save();

      return device;
    } catch (error) {
      throw new Error(`Failed to remove user from device: ${error.message}`);
    }
  }
}
