import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, OnModuleInit, Query } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { ClientMqtt, Ctx, MessagePattern, MqttContext, Payload } from '@nestjs/microservices';
import { EventPattern } from '@nestjs/microservices';
import { FindAllDeviceDto } from './dto/find-all-device.dto';

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

  @Get('findAll')
  async findAll(@Query() findAllDeviceDto: FindAllDeviceDto) {
    const { page, limit, search } = findAllDeviceDto;
    return await this.devicesService.findAllDevices(page, limit, search);
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

  @Post(':deviceId/delete-all-users')
  deleteAllUser(@Param('deviceId') deviceId : string){
    return this.devicesService.deleteAllUser(deviceId);
  }

  @Patch(':deviceId')
  updateDevice(
    @Param('deviceId') deviceId: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ) {
    return this.devicesService.updateDevice(deviceId, updateDeviceDto);
  }

  @Get(':deviceId/users')
  getAllUserOfDevice(@Param('deviceId') deviceId: string) {
    return this.devicesService.getAllUserOfDevice(deviceId);
  }

  @Get(':deviceId/users-not-in-device')
  async getAllUserNotInDevice(@Param('deviceId') deviceId: string) {
  return this.devicesService.getAllUserNotInDevice(deviceId);
}


  @MessagePattern('device-status/#')
  async updateDevcieSate(@Payload() data : string, @Ctx() context : MqttContext){
    const topic = context.getTopic();
    const deviceMac = topic.split('/')[1];
    const device = await this.devicesService.getDeviceByMac(deviceMac);
    if(!device){
      return; 
    }
    return this.devicesService.updateDeviceStatus(device._id.toString(),data);
  }

}
