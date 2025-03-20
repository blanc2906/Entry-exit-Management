import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('create-device')
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  @Post(':deviceId/users/:userId')
  addUserToDevice(
    @Param('deviceId') deviceId: string,
    @Param('userId') userId: string,
  ) {
    return this.devicesService.addUserToDevice(deviceId, userId);
  }

  @Delete(':deviceId/users/:userId')
  removeUserFromDevice(
    @Param('deviceId') deviceId: string,
    @Param('userId') userId: string,
  ) {
    return this.devicesService.removeUserFromDevice(deviceId, userId);
  }
}
