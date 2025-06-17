import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ExportHistoryDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    userId?: string;
} 