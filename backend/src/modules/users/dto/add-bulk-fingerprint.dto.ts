import { IsNotEmpty, IsArray, IsString } from "class-validator";

export class AddBulkFingerprintDto {
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    deviceIds: string[];
} 