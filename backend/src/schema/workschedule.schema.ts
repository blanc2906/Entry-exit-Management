import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class WorkSchedule extends Document {
  @Prop({ required: true, unique: true })
  scheduleName: string;

  @Prop({
    type: Map,
    of: { type: Types.ObjectId, ref: 'WorkShift' },
    default: {},
  })
  shifts: Map<string, Types.ObjectId>; // { 'Sunday': workShiftId, ... }

  @Prop()
  note?: string;
}

export const WorkScheduleSchema = SchemaFactory.createForClass(WorkSchedule); 