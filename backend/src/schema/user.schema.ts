import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { now, Types } from "mongoose";


export type UserDocument = User & Document;

@Schema()
export class User {
    _id : Types.ObjectId;

    @Prop({required: true, unique: true})
    userId: string; 

    @Prop({unique: true})
    avatar: string;

    @Prop({required: true})
    name: string;

    @Prop({required: true, unique: true})
    email : string;

    @Prop({required: true, unique: true})
    fingerId: string;

    @Prop({default : null})
    fingerTemplate: string;

    @Prop({required: true, unique: true})
    cardNumber : string;

    @Prop({required : true, default : now})
    createdAt: Date;

    @Prop()
    updatedAt: Date;

}

export const UserSchema = SchemaFactory.createForClass(User);