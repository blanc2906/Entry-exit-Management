import { IsNotEmpty, IsString, IsEnum, IsOptional } from "class-validator";

export class CreateDeviceDto {
    @IsString()
    @IsNotEmpty()
    deviceMac: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsOptional()
    @IsEnum(['online', 'offline'])
    status?: string;
}
