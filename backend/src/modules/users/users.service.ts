import { Inject, Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { User, UserDocument } from "src/schema/user.schema";
import { CreateUserDto } from "./dto/create-user.dto";
import { InjectModel } from "@nestjs/mongoose";
import { ClientMqtt } from "@nestjs/microservices";
import { REQUEST_ADD_CARDNUMBER, REQUEST_ADD_FINGERPRINT } from "src/shared/constants/mqtt.constant";
import { AddFingerprintDto } from "./dto/add-fingerprint.dto";
import { AddCardNumberDto } from "./dto/add-cardnumber.dto";


@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @Inject('MQTT_CLIENT')
    private readonly mqttClient: ClientMqtt
  ) {}

  async createUser(createUserDto : CreateUserDto) : Promise<UserDocument> {
    try {
      const user = new this.userModel(createUserDto);
      return await user.save();
    } catch (error) {
      throw new Error(`Failed to create user : ${error.message}`);
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

  async findAll(): Promise<UserDocument[]> {
    try {
      return await this.userModel.find().exec();
    } catch (error) {
      throw new Error(`Failed to find users : ${error.message}`);
    }
  }

  async removeUser(userId: string) : Promise<void> {
    try {
      await this.userModel.deleteOne({userId});
    } catch (error) {
      throw new Error(`Failed to remove user : ${error.message}`);
    }
  }
  async requestAddFingerprint(userId: string){
    await this.mqttClient.emit(REQUEST_ADD_FINGERPRINT, userId);
  }
  async addFingerprint(addFingerprintDto : AddFingerprintDto): Promise<UserDocument> {
    try {
      const user = await this.userModel.findById(addFingerprintDto.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      user.fingerId = addFingerprintDto.fingerId;
      user.fingerTemplate = addFingerprintDto.fingerTemplate;
      user.updatedAt = new Date();

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
        fingerId: user.fingerId,
        userId: String(user._id),
        templateData : user.fingerTemplate
      };
    } catch (error) {
      throw new Error(`Failed to get user fingerprint: ${error.message}`);
    }
  }

  async getUserByFingerId(fingerId: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ fingerId });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async requestAddCardNumber(userId : string){
    await this.mqttClient.emit(REQUEST_ADD_CARDNUMBER, userId);

  }

  async addCardNumber(addCardNumberDto : AddCardNumberDto): Promise<UserDocument> {
    try {
      const user = await this.userModel.findById(addCardNumberDto.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      user.cardNumber = addCardNumberDto.cardNumber;
      user.updatedAt = new Date();

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