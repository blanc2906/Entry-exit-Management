import { Controller, Get, Post, Body, Patch, Param, Delete, Logger, NotFoundException, HttpException, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UsersService } from './users.service';
import { Ctx, MessagePattern, MqttContext, Payload } from '@nestjs/microservices';
import { FaceRecognitionService } from '../face-recognition/face-recognition.service';
import * as fs from 'fs';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { MqttService } from 'src/modules/mqtt/mqtt.service';
import { UserDocument } from '../../database/schemas/user.schema';
import { UserLogDocument } from '../../database/schemas/user-log.schema';
import { Types } from 'mongoose';
import { CreateUserDto } from './dto/user.dto';
import { FACE_ATTENDANCE, ATTENDANCE_NOTI, FINGER_ATTENDANCE } from 'src/shared/constants/mqtt.constant';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  private readonly tempDirectory = path.join(process.cwd(), 'temporary');
  private readonly THRESHOLD_MINUTES = 5;

  constructor(
    private readonly usersService: UsersService,
    private readonly faceRecognitionService: FaceRecognitionService,
    private readonly mqttService: MqttService
  ) {
    if (!fs.existsSync(this.tempDirectory)) {
      fs.mkdirSync(this.tempDirectory, { recursive: true });
    }
  }
  @Post('create-user')
  async createNewUser(@Body() createUserDto : CreateUserDto){
    await this.usersService.initiateUserCreation()
    await this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('logs/all')
  async getAllUserLogs() {
  try {
    const logs = await this.usersService.getAllUserLogs();
    return {
      success: true,
      data: logs.map(log => ({
        id: log._id,
        user_name: log.user?.name,
        user_id: log.user?.id_nvien,
        date: log.date,
        time_in: log.time_in,
        time_out: log.time_out || '',
      }))
    };
  } catch (error) {
    this.logger.error(`Error fetching all user logs: ${error.message}`);
    throw new HttpException({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Error fetching user logs',
    }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  @Post(':id/add-face')
  @UseInterceptors(FileInterceptor('image'))
  async addFace(
    @UploadedFile() file : Express.Multer.File,
    @Param('id') id: string
  ){
    try{
      const tempPath = path.join(process.cwd(), 'temporary', `temp-${Date.now()}.jpg`);
      fs.writeFileSync(tempPath, file.buffer);

      const fileName = tempPath.split("\\").pop();
      const imagePath = `http://localhost:3000/temporary/${fileName}`;

      const addedUser = await this.faceRecognitionService.addFaceDescriptor(id,imagePath);
      //fs.unlinkSync(tempPath);



      return {
        success: true,
        message: 'Face descriptor added successfully',
        data: addedUser,
        tempPath: imagePath        
      };
    }
    catch(error){
      console.error('Full error:', error);
      this.logger.error(`Error adding face: ${error.message}`);
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: error.message,
        stack: error.stack
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('recognize')
  @UseInterceptors(FileInterceptor('image'))
  async recognizeFaceFromCamera(@UploadedFile() file: Express.Multer.File) {
    let tempPath: string | null = null;
    try {
      tempPath = await this.handleImageFile(file);
      const recognizedUser = await this.faceRecognitionService.recognizeFace(tempPath);
      
      if (!recognizedUser) {
        return { success: false, message: 'No matching face found' };
      }

      try {
        await this.mqttService.publish(FACE_ATTENDANCE, recognizedUser.id.toString());
        await this.mqttService.publish(ATTENDANCE_NOTI,recognizedUser.name);
      } catch (error) {
        this.logger.error(`Error publishing MQTT message: ${error.message}`);
        throw error;
      }

      return { 
        success: true, 
        user: { 
          id: recognizedUser.id, 
          name: recognizedUser.name 
        } 
      };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      if (tempPath) await fs.promises.unlink(tempPath).catch(() => {});
    }
  }


  @MessagePattern(FINGER_ATTENDANCE)
  async handleFingerAttendance(@Payload() data: string, @Ctx() context: MqttContext) {
    const user = await this.usersService.findUserByFingerID(Number(data));
    await this.mqttService.publish(ATTENDANCE_NOTI, user.name)

    return this.processAttendance(user._id.toString());
  }

  @MessagePattern(FACE_ATTENDANCE)
  async handleFaceAttendance(@Payload() data: string, @Ctx() context: MqttContext) {
    return this.processAttendance(data);
  }

  private isWithinTimeThreshold(previousTime: string, currentTime: Date): boolean {
    const prevDateTime = new Date();
    const [hours, minutes, seconds] = previousTime.split(':');
    prevDateTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));

    const diffInMinutes = Math.abs(currentTime.getTime() - prevDateTime.getTime()) / (1000 * 60);
    return diffInMinutes <= this.THRESHOLD_MINUTES;
  }

  private async handleUserLogin(user: UserDocument, latestUserLog: UserLogDocument | null): Promise<void> {
    const currentDate = new Date();
    const timeIn = currentDate.toTimeString().split(' ')[0];
    
    if (latestUserLog?.time_out && this.isWithinTimeThreshold(latestUserLog.time_out, currentDate)) {
      return;
    }
    
    this.logger.log(`${user.name} logged in at ${timeIn}`);
    await this.usersService.saveUserLog(user._id.toString(), {
      date: currentDate,
      time_in: timeIn,
      time_out: null
    });
  }
  
  private async handleUserLogout(user: UserDocument, latestUserLog: UserLogDocument): Promise<void> {
    const currentTime = new Date();
    const timeOut = currentTime.toTimeString().split(' ')[0];

    if (this.isWithinTimeThreshold(latestUserLog.time_in, currentTime)) {
      return;
    }
    
    this.logger.log(`${user.name} logged out at ${timeOut}`);
    await this.usersService.updateUserLog(
      user._id.toString(),
      latestUserLog.date,
      latestUserLog.time_in,
      { time_out: timeOut }
    );
  }

  private async processAttendance(data: string): Promise<void> {
    try {
      const user = await this.usersService.findOne(data);
      const latestUserLog = await this.usersService.getLatestUserLog(data);
      
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

  private async handleImageFile(file: Express.Multer.File): Promise<string> {
    const tempPath = path.join(this.tempDirectory, `temp-${Date.now()}.jpg`);
    await fs.promises.writeFile(tempPath, file.buffer);
    return tempPath;
  }
}
