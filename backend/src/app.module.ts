import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DevicesModule } from './modules/devices/devices.module';


@Module({
  imports: [  
    ConfigModule.forRoot({isGlobal: true}), DevicesModule], 
  controllers: [],
  providers: [],
})
export class AppModule {}
