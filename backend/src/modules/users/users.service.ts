import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "src/schema/user.schema";
import { CreateUserDto } from "./dto/create-user.dto";
import { InjectModel } from "@nestjs/mongoose";
import { ClientMqtt } from "@nestjs/microservices";
import { DELETE_FINGERPRINT, REQUEST_ADD_CARDNUMBER, REQUEST_ADD_FINGERPRINT } from "src/shared/constants/mqtt.constant";
import { AddFingerprintDto } from "./dto/add-fingerprint.dto";
import { AddCardNumberDto } from "./dto/add-cardnumber.dto";
import { Device, DeviceDocument } from "src/schema/device.schema";
import { UserDevice, UserDeviceDocument } from "src/schema/user-device.schema";


@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Device.name)
    private readonly deviceModel: Model<DeviceDocument>,

    @InjectModel(UserDevice.name)
    private readonly userdeviceModel : Model<UserDeviceDocument>,

    @Inject('MQTT_CLIENT')
    private readonly mqttClient: ClientMqtt
  ) {}

  getTopic(baseTopic : string, deviceMac : string) {
    return `${baseTopic}/${deviceMac}`;
  }
  async createUser(createUserDto : CreateUserDto) : Promise<UserDocument> {
    try {

      const existingUser = await this.userModel.findOne({ userId: createUserDto.userId });
      if (existingUser) {
        throw new Error('User with this userId already exists');
      }
      const user = new this.userModel(createUserDto);
      return await user.save();
    } catch (error) {
      throw new Error(`Failed to create user : ${error.message}`);
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<{ users: UserDocument[]; total: number; page: number; totalPages: number }> {
    try {
      const query = search
        ? {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { userId: { $regex: search, $options: 'i' } },
            ],
          }
        : {};

      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        this.userModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        this.userModel.countDocuments(query),
      ]);

      return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new Error(`Failed to find users : ${error.message}`);
    }
  }

  async removeUser(userId: string): Promise<{ message: string }> {
    try {

      const user = await this.userModel.findById( userId );
      if (!user) {
        throw new Error('User not found');
      }

      try {

        const userDevices = await this.userdeviceModel
          .find({ user: user._id })
          .populate<{ device: DeviceDocument }>('device');

        for (const userDevice of userDevices) {
          const device = userDevice.device;

          await this.mqttClient.emit(
            `${DELETE_FINGERPRINT}/${device.deviceMac}`, 
            JSON.stringify({
              fingerId: userDevice.fingerId
            })
          );
        }

        await this.userdeviceModel.deleteMany({ user: user._id });

        await this.deviceModel.updateMany(
          { users: user._id },
          { $pull: { users: user._id } }
        );

        await this.userModel.deleteOne({ _id: user._id });

        return { 
          message: `User deleted successfully from system and ${userDevices.length} devices` 
        };
      } catch (error) {
        throw error;
      }
    } catch (error) {
      throw new Error(`Failed to remove user: ${error.message}`);
    }
  }

  async findUserById(userId: string) : Promise<UserDocument> {
    try {
      return await this.userModel.findOne({userId});
    } catch (error) {
      throw new Error(`Failed to find user : ${error.message}`);
    }
  }

  async findUserByEmail(email: string) : Promise<UserDocument> {
    try {
      return await this.userModel.findOne({email});
    } catch (error) {
      throw new Error(`Failed to find user : ${error.message}`);
    }
  }

  async requestAddFingerprint(userId: string, deviceId : string){
    const device = await this.deviceModel.findById(deviceId);
    if(!device){
      throw new Error('Device not found');
    }

    if (device.status !== "online") {
      throw new HttpException('Device is offline, cannot connect', HttpStatus.BAD_REQUEST);
    }
    const deviceMac = device.deviceMac;

    await this.mqttClient.emit(this.getTopic(REQUEST_ADD_FINGERPRINT, deviceMac), userId);
  }
  
  async addFingerprint(addFingerprintDto : AddFingerprintDto): Promise<UserDocument> {
    try {
      const user = await this.userModel.findById(addFingerprintDto.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      const device = await this.deviceModel.findOne({ deviceMac: addFingerprintDto.deviceMac });
      if (!device) {
        throw new Error('Device not found');
      }

      user.fingerTemplate = addFingerprintDto.fingerTemplate;
      user.updatedAt = new Date();

      const userDevice = new this.userdeviceModel({
        user: user._id,
        device: device._id as Types.ObjectId,
        fingerId: addFingerprintDto.fingerId
      });
      await userDevice.save();

      if (!user.devices.includes(device._id as Types.ObjectId)) {
        user.devices.push(device._id as Types.ObjectId);
      }

      if (!device.users.includes(user._id as Types.ObjectId)) {
        device.users.push(user._id as Types.ObjectId);
        await device.save();
      }

      return await user.save();
    } catch (error) {
      throw new Error(`Failed to add fingerprint: ${error.message}`);
    }
  }

  async getUserFingerprint(userId: string): Promise<any> {
    try {
      const user = await this.userModel.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        userId: String(user._id),
        templateData : user.fingerTemplate
      };
    } catch (error) {
      throw new Error(`Failed to get user fingerprint: ${error.message}`);
    }
  }

  async getUserByFingerId(fingerId: number, deviceId : string): Promise<UserDocument> {
    try {

      const userDevice = await this.userdeviceModel.findOne({
        fingerId,
        device: new Types.ObjectId(deviceId)
      }).populate<{ user: UserDocument }>('user');

      if (!userDevice) {
        throw new Error('User not found with this fingerprint on this device');
      }

      return userDevice.user;
    } catch (error) {
      throw new Error(`Failed to get user by fingerprint: ${error.message}`);
    }
  }

  async requestAddCardNumber(userId: string, deviceId : string){
    const device = await this.deviceModel.findById(deviceId);
    if(!device){
      throw new Error('Device not found');
    }

    if (device.status !== "online") {
      throw new HttpException('Device is offline, cannot connect', HttpStatus.BAD_REQUEST);
    }
    const deviceMac = device.deviceMac;

    await this.mqttClient.emit(this.getTopic(REQUEST_ADD_CARDNUMBER, deviceMac), userId);
  }

  async addCardNumber(addCardNumberDto : AddCardNumberDto): Promise<UserDocument> {
    try {
      const user = await this.userModel.findById(addCardNumberDto.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      const device = await this.deviceModel.findOne({ deviceMac: addCardNumberDto.deviceMac });
      if (!device) {
        throw new Error('Device not found');
      }

      user.cardNumber = addCardNumberDto.cardNumber;
      user.updatedAt = new Date();

      if (!device.users.includes(user._id as Types.ObjectId)) {
        device.users.push(user._id as Types.ObjectId);
        await device.save(); // Save the device document with the updated users array
      }

      return await user.save();
    } catch (error) {
      throw new Error(`Failed to add cardnumber: ${error.message}`);
    }
  }

  async getUserByCardNumber(cardNumber: string): Promise<UserDocument> {  
    const user = await this.userModel.findOne({ cardNumber });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
