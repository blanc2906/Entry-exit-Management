import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MqttService } from './mqtt.service';

@Controller()
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @MessagePattern('empty-database-response/#')
  handleEmptyDatabaseResponse(@Payload() message: any) {
    console.log('Received empty database response:', message);
    this.mqttService.handleResponse(message);
  }

  @MessagePattern('device/response/#')
  handleDeviceResponse(@Payload() message: any) {
    this.mqttService.handleResponse(message);
  }
}