import { IsNotEmpty, IsString } from "class-validator";

export class CreateDeviceDto {
    @IsString()
    @IsNotEmpty()
    deviceId: string;

    @IsString()
    @IsNotEmpty()
    description: string;
}
