import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteCardDto {
    @IsString()
    @IsNotEmpty()
    userId: string;
} 