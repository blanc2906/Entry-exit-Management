import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class MqttService {
  private readonly logger = new Logger(MqttService.name);
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.MQTT,
      options: {
        url: process.env.MQTT_URL,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        protocol: 'mqtts',
        protocolVersion: 4,
        rejectUnauthorized: false,
      },
    });
  }

  onModuleInit() {
    this.logger.log('MQTT Service has been initialized.');
  }

  async publish(topic: string, message: any) {
    return this.client.emit(topic, message);
  }

  subscribe(topic: string): Observable<any> {
    return this.client.emit(topic, {});
  }
} 