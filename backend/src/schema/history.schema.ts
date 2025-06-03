// src/schema/history.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { User } from "./user.schema";
import { Device } from "./device.schema";

export type HistoryDocument = History & Document;

@Schema()
export class History {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({ required: true })
    date: Date;

    @Prop({ required: true })
    time_in: string;

    @Prop()
    time_out: string;

    @Prop({ type: Types.ObjectId, ref: 'Device', required: true })
    check_in_device: Device;

    @Prop({ type: Types.ObjectId, ref: 'Device' })
    check_out_device: Device;

    @Prop({ required: true, enum: ['fingerprint', 'card'] })
    check_in_auth_method: string;

    @Prop({ enum: ['fingerprint', 'card'] })
    check_out_auth_method: string;
}

export const HistorySchema = SchemaFactory.createForClass(History);