import { Module, forwardRef } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from 'src/schema/device.schema';
import { User, UserSchema } from 'src/schema/user.schema';
import { MqttModule } from '../mqtt/mqtt.module';
import { UserDevice, UserDeviceSchema } from 'src/schema/user-device.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {name: Device.name, schema: DeviceSchema},
      {name: User.name, schema: UserSchema},
      {name: UserDevice.name, schema: UserDeviceSchema }
    ]),
    MqttModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService]
})
export class DevicesModule {}