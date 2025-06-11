import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateWorkScheduleDto {
    @IsMongoId()
    @IsNotEmpty()
    workSchedule: Types.ObjectId;

    @IsArray()
    @IsOptional()
    shifts?: {
        day: string;
        shift: Types.ObjectId;
    }[];
} 