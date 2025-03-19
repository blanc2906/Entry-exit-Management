import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from 'src/schema/device.schema';
import { User, UserSchema } from 'src/schema/user.schema';

@Module({
  imports : [
    MongooseModule.forFeature([
      {name: Device.name, schema: DeviceSchema},
      {name: User.name, schema: UserSchema}
    ])
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
