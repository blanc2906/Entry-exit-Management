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

    @Prop({default : null})
    fingerPrint: string;

    @Prop({required : true, default : now})
    createdAt: Date;

    @Prop()
    updatedAt: Date;

}

export const UserSchema = SchemaFactory.createForClass(User);