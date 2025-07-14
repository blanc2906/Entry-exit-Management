import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class WorkShift extends Document {
  @Prop({ required: true, unique: true })
  code: string; 

  @Prop({ required: true })
  name: string; 

  @Prop({ required: true })
  startTime: string; 

  @Prop({ required: true })
  endTime: string; 

  @Prop()
  breakStart?: string; 

  @Prop()
  breakEnd?: string; 

  @Prop()
  totalWorkTime: string; 

  @Prop()
  allowLate: number; 

  @Prop()
  allowEarly: number; 

  @Prop()
  overtimeBefore: number; 

  @Prop()
  overtimeAfter: number; 
}

export const WorkShiftSchema = SchemaFactory.createForClass(WorkShift); 