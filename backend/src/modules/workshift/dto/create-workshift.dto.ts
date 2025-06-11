import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateWorkShiftDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsOptional()
  breakStart?: string;

  @IsString()
  @IsOptional()
  breakEnd?: string;

  @IsString()
  @IsOptional()
  totalWorkTime?: string;

  @IsNumber()
  @IsOptional()
  allowLate?: number;

  @IsNumber()
  @IsOptional()
  allowEarly?: number;

  @IsNumber()
  @IsOptional()
  overtimeBefore?: number;

  @IsNumber()
  @IsOptional()
  overtimeAfter?: number;
} 