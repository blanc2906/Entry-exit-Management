import { Controller, Logger } from "@nestjs/common";
import { UsersService } from "./users.service";



@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor( 
    private readonly usersService : UsersService,
  ) {}

  

}