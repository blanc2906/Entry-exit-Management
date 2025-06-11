// src/schema/history.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { User } from "./user.schema";
import { Device } from "./device.schema";
import { WorkShift } from "./workshift.schema";

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
    check_in_device: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Device' })
    check_out_device: Types.ObjectId;

    @Prop({ required: true, enum: ['fingerprint', 'card'] })
    check_in_auth_method: string;

    @Prop({ enum: ['fingerprint', 'card'] })
    check_out_auth_method: string;

    @Prop({ type: Types.ObjectId, ref: 'WorkShift' })
    expectedShift: Types.ObjectId;

    @Prop()
    expectedStartTime: string;

    @Prop()
    expectedEndTime: string;

    @Prop({
        type: String,
        enum: ['on-time', 'late', 'early', 'absent', 'overtime'],
        default: 'on-time'
    })
    status: string;

    @Prop()
    workHours: number;

    @Prop()
    overtime: number;

    @Prop()
    note: string;
}

export const HistorySchema = SchemaFactory.createForClass(History);