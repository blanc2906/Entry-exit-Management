import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { User, UserDocument } from "src/schema/user.schema";
import { CreateUserDto } from "./dto/create-user.dto";
import { find } from "rxjs";
import { InjectModel } from "@nestjs/mongoose";
import { MqttService } from "../mqtt/mqtt.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly mqttService : MqttService
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
    await this.mqttService.publish('add_fingerprint', userId);
  }
  async addFingerprint(userId: string, fingerId: string, fingerTemplate: string): Promise<UserDocument> {
    try {
      const user = await this.userModel.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      user.fingerId = fingerId;
      user.fingerTemplate = fingerTemplate;
      user.updatedAt = new Date();

      return await user.save();
    } catch (error) {
      throw new Error(`Failed to add fingerprint: ${error.message}`);
    }
  }

  async test(){
    await this.mqttService.publish('test', 'test');

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
}