import { Body, Controller, Logger, Post, Param, Get } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";



@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor( 
    private readonly usersService : UsersService,
  ) {}

  @Post('test')
  async test() {
    this.logger.log('Test');
    await this.usersService.test();
  }

  @Post('create-user')
  async createUser(@Body() createUserDto : CreateUserDto){
    await this.usersService.createUser(createUserDto);
  }

  @Post('request-add-fingerprint')
  async requestAddFingerprint(@Body('userId') userId: string) {
    await this.usersService.requestAddFingerprint(userId);
  }

  @Post('add-fingerprint')
  async addFingerprint(
    @Body('userId') userId: string,
    @Body('fingerId') fingerId: string,
    @Body('fingerTemplate') fingerTemplate: string,
  ) {
    return await this.usersService.addFingerprint(userId, fingerId, fingerTemplate);
  }

  @Get(':userId/get-finger-data')
  addUserToDevice(
    @Param('userId') userId: string,
  ) {
    return this.usersService.getUserFingerprint(userId);
  }

}