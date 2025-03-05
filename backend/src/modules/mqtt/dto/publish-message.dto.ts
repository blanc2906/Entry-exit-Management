import { IsString, IsNotEmpty } from 'class-validator';

export class PublishMessageDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsNotEmpty()
  message: any;
}
