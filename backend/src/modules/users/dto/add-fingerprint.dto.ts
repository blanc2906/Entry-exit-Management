import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray } from "class-validator";

export class AddFingerprintDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsNumber()
    @IsNotEmpty()
    fingerId: number;

    @IsString()
    @IsOptional()
    fingerTemplate?: string;

    @IsString()
    @IsNotEmpty()
    deviceMac: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    targetDeviceIds?: string[];
}