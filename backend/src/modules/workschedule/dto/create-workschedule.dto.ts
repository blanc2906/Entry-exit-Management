import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Types } from 'mongoose';

export class CreateWorkScheduleDto {
  @IsString()
  @IsNotEmpty()
  scheduleName: string;

  // shifts: { 'Sunday': workShiftId, ... }
  shifts: Record<string, Types.ObjectId>;

  @IsString()
  @IsOptional()
  note?: string;
} 