import { Controller, Get, Inject, Logger, Query } from "@nestjs/common";
import { ClientMqtt, Ctx, MessagePattern, MqttContext, Payload } from "@nestjs/microservices";
import { UsersService } from "../users/users.service";
import { UserDocument } from "src/schema/user.schema";
import { HistoryDocument } from "src/schema/history.schema";
import { HistoryService } from "./history.service";
import { ATTENDANCE_NOTIFICATION } from "src/shared/constants/mqtt.constant";
import { DevicesService } from "../devices/devices.service";
import { FindAllHistoryDto } from "./dto/find-all-history.dto";


@Controller('history')
export class HistoryController {
    private readonly logger = new Logger(HistoryController.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly historyService: HistoryService,
        private readonly DeviceService: DevicesService,
         @Inject('MQTT_CLIENT') private readonly mqttClient: ClientMqtt
    ){}

    @MessagePattern('finger_attendance/#')
    async handleFingerAttendance(@Payload() data: number, @Ctx() context: MqttContext) {
        const topic = context.getTopic();
        console.log(data);
        const deviceMac = topic.split('/')[1];
        console.log(deviceMac);
        const device = await this.DeviceService.getDeviceByMac(deviceMac);
        console.log(device._id.toString());
        
        const user = await this.usersService.getUserByFingerId(data,device._id.toString());
        await this.mqttClient.emit(ATTENDANCE_NOTIFICATION, user.name);

        return this.historyService.processAttendance(user._id.toString());
    }

    @MessagePattern('card_attendance/#')
    async handleCardAttendance(@Payload() data: string, @Ctx() context : MqttContext) {
        const user = await this.usersService.getUserByCardNumber(data);
        await this.mqttClient.emit(ATTENDANCE_NOTIFICATION,user.name) 

        const topic = context.getTopic();
        console.log(data);
        const deviceMac = topic.split('/')[1];
        console.log(deviceMac);
        const device = await this.DeviceService.getDeviceByMac(deviceMac);
        console.log(device._id.toString());

        return this.historyService.processCardAttendance(user._id.toString(), deviceMac);
    }

@Get('findAll')
  async findAll(@Query() findAllHistoryDto: FindAllHistoryDto) {
    const { 
      page, 
      limit, 
      search, 
      deviceId, 
      userId, 
      startDate, 
      endDate 
    } = findAllHistoryDto;
    
    return await this.historyService.findAll(
      page,
      limit,
      search,
      deviceId,
      userId,
      startDate,
      endDate
    );
  }

}