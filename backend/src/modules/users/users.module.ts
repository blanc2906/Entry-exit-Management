import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { UserLog, UserLogSchema } from '../../database/schemas/user-log.schema';
import { FaceDescriptor, FaceDescriptorSchema } from '../../database/schemas/face-descriptor.schema';
import { MqttModule } from 'src/modules/mqtt/mqtt.module';
import { FaceRecognitionService } from '../face-recognition/face-recognition.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserLog.name, schema: UserLogSchema },
      { name: FaceDescriptor.name, schema: FaceDescriptorSchema },
    ]),
    MqttModule
  ],
  controllers: [UsersController],
  providers: [UsersService, FaceRecognitionService],
  exports: [UsersService]
})
export class UsersModule {}