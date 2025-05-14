import { IsNotEmpty, IsString } from "class-validator";

export class AddCardNumberDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    cardNumber : string;
}