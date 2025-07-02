import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    workSchedule?: string;
} 