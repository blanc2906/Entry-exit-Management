// src/modules/history/dto/history.dto.ts
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Types } from 'mongoose';

export class CreateUserLogDto {
    date: Date;
    time_in: string;
    time_out: string | null;
    check_in_device: string;  // deviceId
    check_in_auth_method: 'fingerprint' | 'card';
    expectedShift?: Types.ObjectId;
    expectedStartTime?: string;
    expectedEndTime?: string;
    status?: 'on-time' | 'late' | 'early' | 'absent' | 'overtime';
    workHours?: number;
    overtime?: number;
    note?: string;
}

export class UpdateUserLogDto {
    @IsString()
    @IsOptional()
    time_out?: string;

    @IsString()
    @IsOptional()
    check_out_device?: string;

    @IsEnum(['fingerprint', 'card'])
    @IsOptional()
    check_out_auth_method?: 'fingerprint' | 'card';

    @IsString()
    @IsOptional()
    status?: 'on-time' | 'late' | 'early' | 'absent' | 'overtime';

    @IsNumber()
    @IsOptional()
    workHours?: number;

    @IsNumber()
    @IsOptional()
    overtime?: number;

    @IsString()
    @IsOptional()
    note?: string;
}