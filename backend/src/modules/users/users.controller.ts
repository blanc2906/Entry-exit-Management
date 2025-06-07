import { Body, Controller, Logger, Post, Param, Get, Query, Delete, HttpCode, HttpStatus } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { AddFingerprintDto } from "./dto/add-fingerprint.dto";
import { AddCardNumberDto } from "./dto/add-cardnumber.dto";
import { FindAllUsersDto } from "./dto/find-all-user.dto";
import { MessagePattern, Payload } from "@nestjs/microservices";



@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor( 
    private readonly usersService : UsersService,
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

  @Post('request-add-fingerprint')
  async requestAddFingerprint(
    @Body('userId') userId: string, 
    @Body('deviceId') deviceId: string) {
    await this.usersService.requestAddFingerprint(userId, deviceId);
  }

  @Post('add-fingerprint')
  async addFingerprint(@Body() addFingerprintDto : AddFingerprintDto) {
    const user = await this.usersService.addFingerprint(addFingerprintDto);
    return {
        success: true
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
    return await this.usersService.addCardNumber(addCardNumberDto);
  }

  @MessagePattern('fingerprint_registration_result/#')
  async handleFingerprintRegistrationResult(
  @Payload() data: {
    success: boolean;
    error?: string;
    userId: string;
  }
) {
  if (data.success) {
    console.log(`Fingerprint registration successful for user ${data.userId}`);
  } else {
    console.log(`Fingerprint registration failed for user ${data.userId}: ${data.error}`);
  }
}

}