import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { History, HistoryDocument } from "src/schema/history.schema";
import { Model, Types } from "mongoose";
import { CreateUserLogDto, UpdateUserLogDto } from "./dto/history.dto";
import { User, UserDocument } from "src/schema/user.schema";
import { UsersService } from "../users/users.service";
import { Device, DeviceDocument } from "src/schema/device.schema";

@Injectable()
export class HistoryService {

  //private readonly THRESHOLD_MINUTES = 5;
  private readonly logger = new Logger(HistoryService.name);
  constructor(
    @InjectModel(History.name)
    private readonly historyModel: Model<HistoryDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Device.name)
    private readonly deviceModel : Model<DeviceDocument>
  ){}

  async getAllUserLogs(): Promise<HistoryDocument[]> {
    return await this.historyModel.find()
      .populate('user', 'name email') 
      .sort({ date: -1, time_in: -1 }) 
      .exec();
  }

  async saveUserLog(userId: string, createUserLogDto: CreateUserLogDto): Promise<HistoryDocument> {
    const user = await this.userModel.findById(userId);
    const userLog = new this.historyModel({
      user: user._id,
        ...createUserLogDto
    });
    const savedLog = await userLog.save();
    user.history.push(savedLog._id);
    await user.save();
    return savedLog;
  }
    
  async updateUserLog(userId: string, date: Date, time_in: string, updateUserLogDto: UpdateUserLogDto): Promise<HistoryDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const userLog = await this.historyModel.findOne({
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
    
  async getLatestUserLog(userId: string): Promise<HistoryDocument | null> {
    const userObjectId = new Types.ObjectId(userId);
    const latestLog = await this.historyModel.findOne({
      user: userObjectId
    })
    .sort({ date: -1, time_in: -1 })
    .exec();
    return latestLog;
  }

    //   private isWithinTimeThreshold(previousTime: string, currentTime: Date): boolean {
    //     const prevDateTime = new Date();
    //     const [hours, minutes, seconds] = previousTime.split(':');
    //     prevDateTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
    
    //     const diffInMinutes = Math.abs(currentTime.getTime() - prevDateTime.getTime()) / (1000 * 60);
    //     return diffInMinutes <= this.THRESHOLD_MINUTES;
    //   }
    
  async handleUserLogin(user: UserDocument, latestUserLog: HistoryDocument | null): Promise<void> {
    const currentDate = new Date();
    const timeIn = currentDate.toTimeString().split(' ')[0];
        
    // Always create a new login record
    this.logger.log(`${user.name} logged in at ${timeIn}`);
    await this.saveUserLog(user._id.toString(), {
      date: currentDate,
      time_in: timeIn,
      time_out: null
    });
  }
      
  async handleUserLogout(user: UserDocument, latestUserLog: HistoryDocument): Promise<void> {
    const currentTime = new Date();
    const timeOut = currentTime.toTimeString().split(' ')[0];
    
    // Only update if the latest log doesn't have a time_out
    if (!latestUserLog.time_out) {
      this.logger.log(`${user.name} logged out at ${timeOut}`);
      await this.updateUserLog(
        user._id.toString(),
        latestUserLog.date,
        latestUserLog.time_in,
        { time_out: timeOut }
      );
    }
  }
    
  async processAttendance(data: string): Promise<void> {
    try {
      const userObjectId = new Types.ObjectId(data);
      const user = await this.userModel.findById(userObjectId);
      if (!user) {
        this.logger.error(`User not found with ID: ${data}`);
        throw new NotFoundException(`User not found with ID: ${data}`);
      }

      const latestUserLog = await this.getLatestUserLog(data);
          
      const currentTime = new Date();
          
      if (!latestUserLog) {
        await this.handleUserLogin(user, null);
          return;
      }
    
      const logDate = new Date(latestUserLog.date);
      if (logDate.toDateString() !== currentTime.toDateString()) {
      await this.handleUserLogin(user, latestUserLog);
        return;
      }
      
      if (!latestUserLog.time_out) {
        await this.handleUserLogout(user, latestUserLog);
      } else {
          await this.handleUserLogin(user, latestUserLog);
        }
          
     } catch (error) {
          this.logger.error(`Error processing attendance: ${error.message}`);
          throw error;
        }
  }

  async processCardAttendance(userId : string, deviceMac : string){
    const userObjectId = new Types.ObjectId(userId)
    const device = await this.deviceModel.findOne({ deviceMac: deviceMac });
      if (!device) {
        throw new Error('Device not found');
      }
    if (!device.users.includes(userObjectId)) {
        console.log("Not Recognized");
    }
    else {
      await this.processAttendance(userId);
    }
  }


  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    deviceId?: string,
    userId?: string,
    startDate?: string,
    endDate?: string
  ) {
    try {
      const query: any = {};

      if (search) {
        query.$or = [
          { 'user.name': { $regex: search, $options: 'i' } },
          // Tạm thời bỏ tìm kiếm theo device
        ];
      }

      if (deviceId) {
        query.deviceId = deviceId; // Sử dụng deviceId trực tiếp thay vì device._id
      }

      if (userId) {
        query['user._id'] = new Types.ObjectId(userId);
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      const skip = (page - 1) * limit;
      const [histories, total] = await Promise.all([
        this.historyModel
          .find(query)
          .populate({
            path: 'user',
            select: 'name email userId'
          })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        this.historyModel.countDocuments(query)
      ]);

      return {
        histories,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        filters: {
          search,
          deviceId,
          userId,
          startDate,
          endDate
        }
      };
    } catch (error) {
      throw new Error(`Failed to find histories: ${error.message}`);
    }
  }
}