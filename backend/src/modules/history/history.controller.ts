import { Controller, Inject, Logger } from "@nestjs/common";
import { ClientMqtt, Ctx, MessagePattern, MqttContext, Payload } from "@nestjs/microservices";
import { UsersService } from "../users/users.service";
import { UserDocument } from "src/schema/user.schema";
import { HistoryDocument } from "src/schema/history.schema";
import { HistoryService } from "./history.service";
import { ATTENDANCE_NOTIFICATION } from "src/shared/constants/mqtt.constant";


@Controller('history')
export class HistoryController {
    private readonly logger = new Logger(HistoryController.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly historyService: HistoryService,
         @Inject('MQTT_CLIENT') private readonly mqttClient: ClientMqtt
    ){}

    @MessagePattern('finger_attendance')
    async handleFingerAttendance(@Payload() data: string, @Ctx() context : MqttContext) {
        const user = await this.usersService.getUserByFingerId(data);
        await this.mqttClient.emit(ATTENDANCE_NOTIFICATION,user.name) 

        return this.historyService.processAttendance(user._id.toString());
    }

    @MessagePattern('card_attendance')
    async handleCardAttendance(@Payload() data: string, @Ctx() context : MqttContext) {
        const user = await this.usersService.getUserByCardNumber(data);
        await this.mqttClient.emit(ATTENDANCE_NOTIFICATION,user.name) 

        return this.historyService.processAttendance(user._id.toString());
    }


}