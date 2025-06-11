import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class WorkShift extends Document {
  @Prop({ required: true, unique: true })
  code: string; // Mã ca

  @Prop({ required: true })
  name: string; // Tên ca

  @Prop({ required: true })
  startTime: string; // Giờ vào (HH:mm)

  @Prop({ required: true })
  endTime: string; // Giờ ra (HH:mm)

  @Prop()
  breakStart?: string; // Giờ bắt đầu nghỉ trưa

  @Prop()
  breakEnd?: string; // Giờ kết thúc nghỉ trưa

  @Prop()
  totalWorkTime: string; // Tổng giờ làm (HH:mm)

  @Prop()
  allowLate: number; // Số phút cho phép trễ

  @Prop()
  allowEarly: number; // Số phút cho phép về sớm

  @Prop()
  overtimeBefore: number; // Tăng ca trước giờ làm

  @Prop()
  overtimeAfter: number; // Tăng ca sau giờ làm
}

export const WorkShiftSchema = SchemaFactory.createForClass(WorkShift); 