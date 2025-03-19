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

  async test(){
    await this.mqttService.publish('test', 'test');

  }
}