import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { UserLog, UserLogDocument } from '../../database/schemas/user-log.schema';
import { CreateUserLogDto } from './dto/user-log.dto';
import { UpdateUserLogDto } from './dto/user-log.dto';
import { MqttService } from 'src/modules/mqtt/mqtt.service';
import { FaceDescriptor, FaceDescriptorDocument } from '../../database/schemas/face-descriptor.schema';
import { DELETE_USER, ENROLL_FINGERPRINT } from 'src/shared/constants/mqtt.constant';

@Injectable()
export class UsersService {
  private readonly userCache = new Map<string, UserDocument>();
  private readonly cacheTimeout = 5 * 60 * 1000; 

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(UserLog.name)
    private readonly userLogModel: Model<UserLogDocument>,
    @InjectModel(FaceDescriptor.name)
    private readonly faceDescriptorModel: Model<FaceDescriptorDocument>,
    private readonly mqttService: MqttService
  ) {}

  private async findUserOrThrow(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    try {
      if (isNaN(createUserDto.finger_id)) {
        throw new Error('Invalid finger_id');
      }
      
      const existingUser = await this.userModel.findOne({
        finger_id: createUserDto.finger_id
      });
      const existedUser = await this.userModel.findOne({
        id_nvien: createUserDto.id_nvien
      });
      
      if (existingUser) {
        throw new Error(`User with finger_id ${createUserDto.finger_id} already exists`);
      }
      if (existedUser) {
        throw new Error(`User with id_nvien ${createUserDto.id_nvien} already exists`);
      }
      
      const user = new this.userModel(createUserDto);
      return await user.save();
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async findAll(): Promise<UserDocument[]> {
    return await this.userModel.find().exec();
  }

  async findOne(id: string): Promise<UserDocument> {
    const cachedUser = this.userCache.get(id);
    if (cachedUser) return cachedUser;

    const user = await this.findUserOrThrow(id);
    await this.cacheUser(user);
    return user;
  }

  async findUserByFingerID(finger_id: number): Promise<any> {
    const user = await this.userModel.findOne({ finger_id });
    if (!user) {
      throw new NotFoundException(`User with Finger ID ${finger_id} not found`);
    }
    return user;
  }

  async updateUserFingerPrint(id : string) {
    const user = await this.userModel.findById(id);
    await this.mqttService.publish("update_fingerprint", user.finger_id.toString())
  }

  async remove(id: string): Promise<void> {
    const user = await this.userModel.findById(id)
      .populate('userlog')
      .populate('faceDescriptor');
      
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    await this.faceDescriptorModel.deleteOne({ user: user._id });
    await this.userLogModel.deleteMany({ user: user._id });
    await this.userModel.findByIdAndDelete(id);
    
    try {
      await this.mqttService.publish(DELETE_USER, user.finger_id.toString());
    } catch (error) {
      console.error('Failed to publish delete_user message:', error);
    }
  }

  async getAllUserLogs(): Promise<UserLogDocument[]> {
    return await this.userLogModel.find()
      .populate('user', 'name id_nvien') 
      .sort({ date: -1, time_in: -1 }) 
      .exec();
  }
  async saveUserLog(userId: string, createUserLogDto: CreateUserLogDto): Promise<UserLogDocument> {
    const user = await this.findOne(userId);
    const userLog = new this.userLogModel({
      user: user._id,
      ...createUserLogDto
    });
    const savedLog = await userLog.save();
    user.userlog.push(savedLog._id);
    await user.save();
    return savedLog;
  }

  async updateUserLog(userId: string, date: Date, time_in: string, updateUserLogDto: UpdateUserLogDto): Promise<UserLogDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const userLog = await this.userLogModel.findOne({
      user: userObjectId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      time_out: null
    }).sort({ time_in: -1 });

    if (!userLog) {
      console.log('No matching log found for update');
      throw new NotFoundException(`User log not found`);
    }
    Object.assign(userLog, updateUserLogDto);
    const updatedLog = await userLog.save();
    return updatedLog;
  }

  async getLatestUserLog(userId: string): Promise<UserLogDocument | null> {
    const userObjectId = new Types.ObjectId(userId);
    const latestLog = await this.userLogModel.findOne({
      user: userObjectId
    })
    .sort({ date: -1, time_in: -1 })
    .exec();
    return latestLog;
  }

  async populateData(): Promise<any[]> {
    return await this.userLogModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          id: '$user.id_nvien',
          name: '$user.name',
          date: '$date',
          time_in: '$time_in',
          time_out: { $ifNull: ['$time_out', ''] }
        }
      }
    ]).exec();
  }

  private async cacheUser(user: UserDocument): Promise<void> {
    this.userCache.set(user._id.toString(), user);
    setTimeout(() => this.userCache.delete(user._id.toString()), this.cacheTimeout);
  }

  async initiateUserCreation(): Promise<void> {
    await this.mqttService.publish(ENROLL_FINGERPRINT, '');
  }
}
