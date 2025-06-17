import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DevicesModule } from './modules/devices/devices.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './modules/users/users.module';
import { HistoryModule } from './modules/history/history.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { WorkShiftModule } from './modules/workshift/workshift.module';
import { WorkScheduleModule } from './modules/workschedule/workschedule.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [  
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    MongooseModule.forRoot('mongodb://localhost:27017/datn'), 
    MqttModule,
    DevicesModule,
    UsersModule,
    HistoryModule,
    WorkShiftModule,
    WorkScheduleModule,
    DashboardModule
  ], 
  controllers: [],
  providers: [],
})
export class AppModule {}