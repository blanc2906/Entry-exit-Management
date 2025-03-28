import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, {Types, Document} from "mongoose";
import { User } from "./user.schema";

export type DeviceDocument = Device & Document;

@Schema()
export class Device {
    @Prop({required: true, unique: true})
    deviceMac : string;

    @Prop({required: true})
    description : string;

    @Prop({type : [{type : Types.ObjectId, ref : 'User'}]})
    users : Types.ObjectId[];
}

export const DeviceSchema = SchemaFactory.createForClass(Device);