import { IsString, IsNotEmpty, IsIP, IsOptional } from 'class-validator';

export class ConfigDeviceDto {
  @IsString()
  @IsNotEmpty()
  ssid: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsIP()
  serverIP: string;
} 