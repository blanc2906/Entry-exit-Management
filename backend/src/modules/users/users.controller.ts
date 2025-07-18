import { Body, Controller, Logger, Post, Param, Get, Query, Delete, HttpCode, HttpStatus, Put, Inject, forwardRef, UseInterceptors, UploadedFile } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { AddFingerprintDto } from "./dto/add-fingerprint.dto";
import { AddCardNumberDto } from "./dto/add-cardnumber.dto";
import { FindAllUsersDto } from "./dto/find-all-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { DeleteFingerprintDto } from "./dto/delete-fingerprint.dto";
import { DeleteCardDto } from "./dto/delete-card.dto";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { UpdateWorkScheduleDto } from "./dto/update-workschedule.dto";
import { AppWebSocketGateway } from "../websocket/websocket.gateway";
import { AddBulkFingerprintDto } from "./dto/add-bulk-fingerprint.dto";
import { FileInterceptor } from '@nestjs/platform-express';
import type { Multer } from 'multer';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor( 
    private readonly usersService : UsersService,
    @Inject(forwardRef(() => AppWebSocketGateway))
    private readonly webSocketGateway: AppWebSocketGateway
  ) {}

  @Post('create-user')
  async createUser(@Body() createUserDto : CreateUserDto){
    await this.usersService.createUser(createUserDto);
  }

  @Get('findAll')
  async findAll(@Query() findAllUsersDto: FindAllUsersDto) {
    const { page, limit, search } = findAllUsersDto;
    return await this.usersService.findAll(page, limit, search);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async removeUser(@Param('userId') userId: string) {
    return await this.usersService.removeUser(userId);
  }

  @Put(':userId')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    const updatedUser = await this.usersService.updateUser(userId, updateUserDto);
    
    return {
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    };
  }

  @Delete(':userId/fingerprint')
  @HttpCode(HttpStatus.OK)
  async deleteFingerprint(
    @Param('userId') userId: string,
    @Body() deleteFingerprintDto: DeleteFingerprintDto
  ) {
    deleteFingerprintDto.userId = userId; // Đảm bảo userId từ param được sử dụng
    
    const result = await this.usersService.deleteFingerprint(deleteFingerprintDto);
    
    // Gửi thông báo qua WebSocket
    this.webSocketGateway.sendFingerprintNotification({
      type: 'fingerprint_deleted',
      message: result.message,
      user: {
        _id: userId,
        name: `User ${userId}`,
        email: ''
      },
      timestamp: new Date().toISOString(),
      success: true,
      deletedDevices: result.deletedDevices
    });
    
    return {
      success: true,
      message: result.message,
      deletedDevices: result.deletedDevices
    };
  }

  @Delete(':userId/card')
  @HttpCode(HttpStatus.OK)
  async deleteCard(
    @Param('userId') userId: string,
    @Body() deleteCardDto: DeleteCardDto
  ) {
    deleteCardDto.userId = userId; // Đảm bảo userId từ param được sử dụng
    
    const result = await this.usersService.deleteCard(deleteCardDto);
    
    // Gửi thông báo qua WebSocket
    this.webSocketGateway.sendFingerprintNotification({
      type: 'card_deleted',
      message: result.message,
      user: {
        _id: userId,
        name: `User ${userId}`,
        email: ''
      },
      timestamp: new Date().toISOString(),
      success: true
    });
    
    return {
      success: true,
      message: result.message
    };
  }

  @Post('add-fingerprint')
  async addFingerprint(@Body() addFingerprintDto : AddFingerprintDto) {
    const result = await this.usersService.addFingerprint(addFingerprintDto);
    
    // Gửi thông báo qua WebSocket
    this.webSocketGateway.sendFingerprintNotification({
      type: 'fingerprint_added',
      message: result.message,
      user: {
        _id: result.user._id,
        name: result.user.name,
        email: result.user.email
      },
      timestamp: new Date().toISOString()
    });
    
    return {
        success: true,
        message: result.message,
        user: result.user
    };
}

  @Get(':userId/get-finger-data')
  addUserToDevice(
    @Param('userId') userId: string,
  ) {
    return this.usersService.getUserFingerprint(userId);
  }
  
  @Post('request-add-cardNumber')
  async requestAddCardNumber(
    @Body('userId') userId: string,
    @Body('deviceId') deviceId: string
  ) {
    await this.usersService.requestAddCardNumber(userId,deviceId);
  }
  @Post('add-cardNumber')
  async addCardNumber(@Body() addCardNumberDto : AddCardNumberDto) {
    try {
      const result = await this.usersService.addCardNumber(addCardNumberDto);
      
      // Gửi thông báo thành công qua WebSocket
      this.webSocketGateway.sendFingerprintNotification({
        type: 'card_added',
        message: result.message,
        user: {
          _id: result.user._id,
          name: result.user.name,
          email: result.user.email
        },
        timestamp: new Date().toISOString(),
        success: true
      });
      
      return {
          success: true,
          message: result.message,
          user: result.user
      };
    } catch (error) {
      // Gửi thông báo thất bại qua WebSocket
      this.webSocketGateway.sendFingerprintNotification({
        type: 'card_failed',
        message: `Đăng ký thẻ thất bại`,
        user: {
          _id: addCardNumberDto.userId,
          name: `User ${addCardNumberDto.userId}`,
          email: ''
        },
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }

  @MessagePattern('fingerprint_registration_result/#')
  async handleFingerprintRegistrationResult(
    @Payload() data: {
      success: boolean;
      error?: string;
      userId: string;
      fingerId?: number;
    }
  ) {
    if (data.success) {
      console.log(`Fingerprint registration successful for user ${data.userId}`);
      // Không cần gửi thông báo vì đã có HTTP POST xử lý rồi
    } else {
      console.log(`Fingerprint registration failed for user ${data.userId}: ${data.error}`);
      
      // Chỉ gửi thông báo thất bại qua WebSocket
      this.webSocketGateway.sendFingerprintNotification({
        type: 'fingerprint_failed',
        message: `Đăng ký vân tay thất bại`,
        user: {
          _id: data.userId,
          name: `User ${data.userId}`,
          email: ''
        },
        timestamp: new Date().toISOString(),
        success: false,
        error: data.error
      });
    }
  }

  @Post(':userId/request-bulk-fingerprint')
  async requestAddBulkFingerprint(
    @Param('userId') userId: string,
    @Body() addBulkFingerprintDto: AddBulkFingerprintDto
  ) {
    return this.usersService.requestAddBulkFingerprint(userId, addBulkFingerprintDto.deviceIds);
  }

  @Post('import-excel')
  @UseInterceptors(FileInterceptor('file'))
  async importUsersFromExcel(@UploadedFile() file: any) {
    return this.usersService.importUsersFromExcel(file);
  }
}