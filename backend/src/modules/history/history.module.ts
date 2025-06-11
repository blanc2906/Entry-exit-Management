import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schema/user.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';;
import { History, HistorySchema } from 'src/schema/history.schema';
import { HistoryController } from './history.controller';
import { UsersModule } from '../users/users.module';
import { HistoryService } from './history.service';
import { MqttModule } from '../mqtt/mqtt.module';
import { DevicesModule } from '../devices/devices.module';
import { Device, DeviceSchema } from 'src/schema/device.schema';
import { ActivityGateway } from './activity.gateway';
import { WorkShift, WorkShiftSchema } from '../../schema/workshift.schema';
import { WorkSchedule, WorkScheduleSchema } from '../../schema/workschedule.schema';

@Module({
  imports : [
    MongooseModule.forFeature([
      {name: History.name, schema: HistorySchema},
      {name: User.name, schema: UserSchema},
      {name: Device.name, schema : DeviceSchema},
      {name: WorkShift.name, schema: WorkShiftSchema},
      {name: WorkSchedule.name, schema: WorkScheduleSchema}
    ]),
    UsersModule,
    MqttModule,
    DevicesModule
  ],
  controllers: [HistoryController],
  providers: [HistoryService, ActivityGateway],
  exports: [HistoryService]
})
export class HistoryModule {}
