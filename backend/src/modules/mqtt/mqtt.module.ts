import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MqttService } from './mqtt.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'MQTT_CLIENT',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.MQTT,
          options: {
            url: configService.get<string>('MQTT_URL'),
            username: configService.get<string>('MQTT_USERNAME'),
            password: configService.get<string>('MQTT_PASSWORD'),
            rejectUnauthorized: false,
            subscribeOptions: {qos: 0}
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [MqttService],
  controllers: [],
  exports: [ClientsModule, MqttService],
})
export class MqttModule {} 