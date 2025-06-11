import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkShift, WorkShiftSchema } from '../../schema/workshift.schema';
import { WorkShiftService } from './workshift.service';
import { WorkShiftController } from './workshift.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: WorkShift.name, schema: WorkShiftSchema }])],
  controllers: [WorkShiftController],
  providers: [WorkShiftService],
  exports: [WorkShiftService],
})
export class WorkShiftModule {} 