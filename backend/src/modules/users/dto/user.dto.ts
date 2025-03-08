import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    id_nvien: string; 

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @IsNotEmpty()
    finger_id: number;

    @IsString()
    image_path?: string;
}
