import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, OnModuleInit, Query } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { ConfigDeviceDto } from './dto/config-device.dto';
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
  @Get(":deviceId")
  async findOne(
    @Param('deviceId') deviceId: string
  ){
    return this.devicesService.getById(deviceId);
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

  @Post(':id/config')
  async configDevice(
    @Param('id') id: string,
    @Body() configData: ConfigDeviceDto
  ) {
    return this.devicesService.configDevice(id, configData);
  }

  @Get(':id/config')
  async getDeviceConfig(@Param('id') id: string) {
    return this.devicesService.getDeviceConfig(id);
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

  @MessagePattern('device/config-response/#')
  async handleConfigResponse(@Payload() data: any, @Ctx() context: MqttContext) {
    const topic = context.getTopic();
    const macFromTopic = topic.split('/')[2];
    const deviceMac = macFromTopic.replace(/:/g, ''); // Chuẩn hóa MAC

    console.log(`Received config response on topic ${topic} for mac ${deviceMac}`);
    console.log('Raw Payload:', data);

    let configData;
    if (typeof data === 'string') {
      try {
        configData = JSON.parse(data);
      } catch (error) {
        console.error('Error parsing config response string:', error);
        return;
      }
    } else if (typeof data === 'object' && data !== null) {
      configData = data;
    } else {
      console.error('Received config response with unknown payload type:', data);
      return;
    }

    try {
      await this.devicesService.handleConfigResponse(deviceMac, configData);
      console.log(`Successfully processed config response for ${deviceMac}`);
    } catch (error) {
      console.error('Error in service handling config response:', error);
    }
  }

}
