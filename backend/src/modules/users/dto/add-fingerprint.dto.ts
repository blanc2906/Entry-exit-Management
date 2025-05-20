import { IsNotEmpty, IsString } from "class-validator";

export class AddFingerprintDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    fingerId: number;

    @IsString()
    //@IsNotEmpty()
    fingerTemplate? : string;

    @IsString()
    @IsNotEmpty()
    deviceMac : string;
}