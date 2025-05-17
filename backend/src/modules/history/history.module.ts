import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schema/user.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';;
import { History, HistorySchema } from 'src/schema/history.schema';
import { HistoryController } from './history.controller';
import { UsersModule } from '../users/users.module';
import { HistoryService } from './history.service';
import { MqttModule } from '../mqtt/mqtt.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports : [
    MongooseModule.forFeature([
      {name: History.name, schema: HistorySchema},
      {name: User.name, schema: UserSchema}
    ]),
    UsersModule,
    MqttModule,
    DevicesModule
  ],
  controllers: [HistoryController],
  providers: [HistoryService]
})
export class HistoryModule {}
