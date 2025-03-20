import { IsString, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    userId: string; 

    @IsString()
    @IsNotEmpty()
    name: string;

    // @IsString()
    // email: string;

    // @IsString()
    // fingerPrint: number;

    @IsNotEmpty()
    createdAt: Date;
}
