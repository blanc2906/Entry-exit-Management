import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, OnModuleInit } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { ClientMqtt } from '@nestjs/microservices';
import { EventPattern } from '@nestjs/microservices';

@Controller('devices')
export class DevicesController implements OnModuleInit {
  constructor(
    private readonly devicesService: DevicesService,
    @Inject('MQTT_CLIENT') private readonly mqttClient: ClientMqtt,
  ) {}

  async onModuleInit() {
    this.mqttClient.connect();
  }

  @EventPattern('verified_device')
  handleDeviceVerification(payload: any) {
    const data = payload.data || payload;
    console.log(data);
    const deviceMac = data.deviceMac;
    const verified = data.verified;
    if (deviceMac) {
      this.devicesService.handleVerificationResponse(deviceMac, verified);
    }
  }

  @Post('create-device')
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.createDevice(createDeviceDto);
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

  @Post(':deviceId/sync-all-users')
  syncAllUser(@Param('deviceId') deviceId: string) {
    return this.devicesService.syncAllUser(deviceId);
  }
}
