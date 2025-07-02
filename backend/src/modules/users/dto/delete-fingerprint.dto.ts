import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteFingerprintDto {
    @IsString()
    @IsNotEmpty()
    userId: string;
} 