import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDeviceDocument = UserDevice & Document;

@Schema({ timestamps: true })
export class UserDevice extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Device', required: true })
  device: Types.ObjectId;

  @Prop({ type: Number, required: true })
  fingerId: number;
}

export const UserDeviceSchema = SchemaFactory.createForClass(UserDevice);
