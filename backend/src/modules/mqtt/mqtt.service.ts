import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class MqttService {
  private readonly logger = new Logger(MqttService.name);
  onModuleInit() {
    this.logger.log('MQTT Service has been initialized.');
  }

  constructor(
    @Inject('MQTT_CLIENT') private readonly client: ClientProxy,
  ) {}

  async publish(topic: string, message: string) {
    try {
      await this.client.emit(topic, message);
    } catch (error) {
      throw new Error('MQTT publish failed');
    }
  }

} 