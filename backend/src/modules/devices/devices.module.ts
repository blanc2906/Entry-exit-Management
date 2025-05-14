import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from 'src/schema/device.schema';
import { User, UserSchema } from 'src/schema/user.schema';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {name: Device.name, schema: DeviceSchema},
      {name: User.name, schema: UserSchema}
    ]),
    MqttModule
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}