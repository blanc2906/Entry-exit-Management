import { Prop, Schema } from "@nestjs/mongoose";

export type DeviceDocument = Device & Document;

@Schema()
export class Device {
    @Prop({required: true, unique: true})
    deviceId : string;

    @Prop({required: true})
    description : string;
}