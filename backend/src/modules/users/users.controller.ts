import { Body, Controller, Logger, Post, Param, Get } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { AddFingerprintDto } from "./dto/add-fingerprint.dto";
import { AddCardNumberDto } from "./dto/add-cardnumber.dto";



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

  @Post('request-add-fingerprint')
  async requestAddFingerprint(
    @Body('userId') userId: string, 
    @Body('deviceId') deviceId: string) {
    await this.usersService.requestAddFingerprint(userId, deviceId);
  }

  @Post('add-fingerprint')
  async addFingerprint(@Body() addFingerprintDto : AddFingerprintDto) {
    return await this.usersService.addFingerprint(addFingerprintDto);
  }

  @Get(':userId/get-finger-data')
  addUserToDevice(
    @Param('userId') userId: string,
  ) {
    return this.usersService.getUserFingerprint(userId);
  }
  
  @Post('request-add-cardNumber')
  async requestAddCardNumber(@Body('userId') userId: string) {
    await this.usersService.requestAddCardNumber(userId);
  }
  @Post('add-cardNumber')
  async addCardNumber(@Body() addCardNumberDto : AddCardNumberDto) {
    return await this.usersService.addCardNumber(addCardNumberDto);
  }

}