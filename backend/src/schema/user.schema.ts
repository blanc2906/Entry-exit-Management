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

    // Sparse unique index - only indexes documents where cardNumber exists and is not null
    @Prop({unique: true, sparse: true, index: true})
    cardNumber : string;

    @Prop({required : true, default : now})
    createdAt: Date;

    @Prop()
    updatedAt: Date;

    @Prop({type : [{type : Types.ObjectId, ref : 'Device'}]})
    devices: Types.ObjectId[];

    @Prop({type : [{type : Types.ObjectId, ref : 'History'}]})
    history : Types.ObjectId[];

    @Prop({ type: Types.ObjectId, ref: 'WorkSchedule' })
    workSchedule?: Types.ObjectId;

}

export const UserSchema = SchemaFactory.createForClass(User);

// Ensure the cardNumber index is properly configured as sparse
// This will only index documents where cardNumber field exists and is not null
UserSchema.index({ cardNumber: 1 }, { unique: true, sparse: true });