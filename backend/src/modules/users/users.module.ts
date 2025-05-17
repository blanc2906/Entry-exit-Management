import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from 'src/schema/user.schema';
import { MqttModule } from '../mqtt/mqtt.module';
import { Device, DeviceSchema } from 'src/schema/device.schema';
import { UserDevice, UserDeviceSchema } from 'src/schema/user-device.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: UserDevice.name, schema: UserDeviceSchema },
    ]),
    MqttModule
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}