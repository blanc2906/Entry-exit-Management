import { Injectable } from '@nestjs/common';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { Device, DeviceDocument } from 'src/schema/device.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schema/user.schema';

@Injectable()
export class DevicesService {
  constructor(
    @InjectModel(Device.name)
    private readonly deviceModel: Model<DeviceDocument>,
    @InjectModel(User.name)
    private readonly userModel : Model<UserDocument>,
  ){}
  async create(createDeviceDto : CreateDeviceDto) : Promise<DeviceDocument>{
    try{
      if(isNaN(Number(createDeviceDto.deviceId))){
        throw new Error('invalid deviceId');
      }

      const existingDevice = await this.deviceModel.findOne({deviceId: createDeviceDto.deviceId});

      if(existingDevice){
        throw new Error('device already exists');
      }

      const device = new this.deviceModel(createDeviceDto);
      return await device.save();
    }
    catch(error){
      throw new Error(`Failed to create device : ${error.message}`);
    }
  }

  async addUserToDevice(deviceId: string, userId: string) : Promise<any>{
    try{
      const device = await this.deviceModel.findOne({deviceId});
      if(!device){
        throw new Error('device not found');
      }
    }catch(error){
      throw new Error(`Failed to add user to device : ${error.message}`);
    }
  }
}
