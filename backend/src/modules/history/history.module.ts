import { Module, forwardRef } from '@nestjs/common';
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
import { WorkShift, WorkShiftSchema } from '../../schema/workshift.schema';
import { WorkSchedule, WorkScheduleSchema } from '../../schema/workschedule.schema';
import { WebSocketModule } from '../websocket/websocket.module';
import { AttendanceService } from './services/attendance.service';
import { HistoryQueryService } from './services/history-query.service';
import { MqttAttendanceHandler } from './handlers/mqtt-attendance.handler';

@Module({
  imports : [
    MongooseModule.forFeature([
      {name: History.name, schema: HistorySchema},
      {name: User.name, schema: UserSchema},
      {name: Device.name, schema : DeviceSchema},
      {name: WorkShift.name, schema: WorkShiftSchema},
      {name: WorkSchedule.name, schema: WorkScheduleSchema}
    ]),
    forwardRef(() => UsersModule),
    MqttModule,
    forwardRef(() => DevicesModule),
    WebSocketModule
  ],
  controllers: [HistoryController, MqttAttendanceHandler],
  providers: [
    HistoryService,
    AttendanceService,
    HistoryQueryService
  ],
  exports: [HistoryService]
})
export class HistoryModule {}
