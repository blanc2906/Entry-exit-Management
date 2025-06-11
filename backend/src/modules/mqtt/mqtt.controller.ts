import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MqttService } from './mqtt.service';

@Controller()
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @MessagePattern('device/response/#')
  handleDeviceResponse(@Payload() message: any) {
    this.mqttService.handleResponse(message);
  }
}