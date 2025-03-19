import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DevicesModule } from './modules/devices/devices.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './modules/users/users.module';


@Module({
  imports: [  
    ConfigModule.forRoot({isGlobal: true}),
    MongooseModule.forRoot('mongodb://localhost:27017/datn'), 
    DevicesModule,
    UsersModule], 
  controllers: [],
  providers: [],
})
export class AppModule {}
