import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from 'src/schema/user.schema';
import { Device, DeviceSchema } from 'src/schema/device.schema';
import { UserDevice, UserDeviceSchema } from 'src/schema/user-device.schema';
import { WorkSchedule, WorkScheduleSchema } from 'src/schema/workschedule.schema';
import { WorkShift, WorkShiftSchema } from 'src/schema/workshift.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { HistoryModule } from '../history/history.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: UserDevice.name, schema: UserDeviceSchema },
      { name: WorkSchedule.name, schema: WorkScheduleSchema },
      { name: WorkShift.name, schema: WorkShiftSchema }
    ]),
    ClientsModule.registerAsync([
      {
        name: 'MQTT_CLIENT',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.MQTT,
          options: {
            url: configService.get('MQTT_URL'),
            username: configService.get('MQTT_USERNAME'),
            password: configService.get('MQTT_PASSWORD'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    forwardRef(() => HistoryModule),
    WebSocketModule,
    forwardRef(() => DevicesModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}