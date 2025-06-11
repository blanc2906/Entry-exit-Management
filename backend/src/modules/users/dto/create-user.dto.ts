import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
// import { Types } from 'mongoose';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    userId: string; 

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    email: string;

    @IsOptional()
    @IsString()
    workSchedule?: string;

    // @IsString()
    // fingerPrint: number;

    @IsNotEmpty()
    createdAt: Date;
}
