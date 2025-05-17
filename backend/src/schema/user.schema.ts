import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { now, Types } from "mongoose";
import { Device } from "./device.schema";


export type UserDocument = User & Document;

@Schema()
export class User {
    _id : Types.ObjectId;

    @Prop({required: true, unique: true})
    userId: string; 

    // @Prop({unique: true, default : null})
    // avatar: string;

    @Prop({required: true})
    name: string;

    @Prop({unique: true, sparse: true})
    email : string;

    @Prop({default : null})
    fingerTemplate: string;

    @Prop({unique: true, sparse: true})
    cardNumber : string;

    @Prop({required : true, default : now})
    createdAt: Date;

    @Prop()
    updatedAt: Date;

    @Prop({type : [{type : Types.ObjectId, ref : 'Device'}]})
    devices: Types.ObjectId[];

    @Prop({type : [{type : Types.ObjectId, ref : 'History'}]})
    history : Types.ObjectId[];

}

export const UserSchema = SchemaFactory.createForClass(User);