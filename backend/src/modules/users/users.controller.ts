import { Controller, Logger, Post } from "@nestjs/common";
import { UsersService } from "./users.service";



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

  

}