import { IsNotEmpty, IsString } from "class-validator";

export class CreateDeviceDto {
    @IsString()
    @IsNotEmpty()
    deviceMac: string;

    @IsString()
    @IsNotEmpty()
    description: string;
}
