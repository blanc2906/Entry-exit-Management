import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkSchedule, WorkScheduleSchema } from '../../schema/workschedule.schema';
import { WorkScheduleService } from './workschedule.service'; 
import { WorkScheduleController } from '../workschedule/workschedule.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: WorkSchedule.name, schema: WorkScheduleSchema }])],
  controllers: [WorkScheduleController],
  providers: [WorkScheduleService],
  exports: [WorkScheduleService],
})
export class WorkScheduleModule {} 