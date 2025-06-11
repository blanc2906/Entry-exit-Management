// src/modules/history/history.controller.ts
import { Controller, Get, Inject, Logger, Query, Post, Param } from "@nestjs/common";
import { ClientMqtt, Ctx, MessagePattern, MqttContext, Payload } from "@nestjs/microservices";
import { UsersService } from "../users/users.service";
import { UserDocument } from "src/schema/user.schema";
import { HistoryDocument } from "src/schema/history.schema";
import { HistoryService } from "./history.service";
import { ATTENDANCE_NOTIFICATION } from "src/shared/constants/mqtt.constant";
import { DevicesService } from "../devices/devices.service";
import { FindAllHistoryDto } from "./dto/find-all-history.dto";
import { CreateUserLogDto, UpdateUserLogDto } from './dto/history.dto';

@Controller('history')
export class HistoryController {
    private readonly logger = new Logger(HistoryController.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly historyService: HistoryService,
        private readonly DeviceService: DevicesService,
        @Inject('MQTT_CLIENT') private readonly mqttClient: ClientMqtt
    ) {}

    @MessagePattern('finger_attendance/#')
    async handleFingerAttendance(@Payload() data: number, @Ctx() context: MqttContext) {
        try {
            const topic = context.getTopic();
            const deviceMac = topic.split('/')[1];
            const device = await this.DeviceService.getDeviceByMac(deviceMac);

            if (!device) {
                this.logger.error(`Device not found with MAC: ${deviceMac}`);
                await this.mqttClient.emit(`${ATTENDANCE_NOTIFICATION}/${deviceMac}`, 'Invalid Device');
                return;
            }

            const user = await this.usersService.getUserByFingerId(data, device._id.toString());

            if (!user) {
                this.logger.error(`User not found with finger ID: ${data}`);
                await this.mqttClient.emit(`${ATTENDANCE_NOTIFICATION}/${deviceMac}`, 'Fingerprint Not Registered');
                return;
            }

            await this.mqttClient.emit(`${ATTENDANCE_NOTIFICATION}/${deviceMac}`, user.name);
            return await this.historyService.processAttendance(
                user._id.toString(),
                device._id.toString(),
                'fingerprint'
            );

        } catch (error) {
            this.logger.error(`Error handling fingerprint attendance: ${error.message}`);
            const deviceMac = context.getTopic().split('/')[1];
            await this.mqttClient.emit(`${ATTENDANCE_NOTIFICATION}/${deviceMac}`, 'System Error');
            throw error;
        }
    }

    @MessagePattern('card_attendance/#')
    async handleCardAttendance(@Payload() data: string, @Ctx() context: MqttContext) {
        try {
            const topic = context.getTopic();
            const deviceMac = topic.split('/')[1];
            const device = await this.DeviceService.getDeviceByMac(deviceMac);

            if (!device) {
                this.logger.error(`Device not found with MAC: ${deviceMac}`);
                await this.mqttClient.emit(`${ATTENDANCE_NOTIFICATION}/${deviceMac}`, 'Invalid Device');
                return;
            }

            const user = await this.usersService.getUserByCardNumber(data);

            if (!user) {
                this.logger.error(`User not found with card number: ${data}`);
                await this.mqttClient.emit(`${ATTENDANCE_NOTIFICATION}/${deviceMac}`, 'Card Not Registered');
                return;
            }

            const isUserInDevice = device.users.some(
                userId => userId.toString() === user._id.toString()
            );

            if (!isUserInDevice) {
                this.logger.warn(`User ${user.name} is not registered with device ${deviceMac}`);
                await this.mqttClient.emit(`${ATTENDANCE_NOTIFICATION}/${deviceMac}`, 'User Not Authorized');
                return;
            }

            await this.mqttClient.emit(`${ATTENDANCE_NOTIFICATION}/${deviceMac}`, user.name);
            return await this.historyService.processAttendance(
                user._id.toString(),
                device._id.toString(),
                'card'
            );

        } catch (error) {
            this.logger.error(`Error handling card attendance: ${error.message}`);
            const deviceMac = context.getTopic().split('/')[1];
            await this.mqttClient.emit(`${ATTENDANCE_NOTIFICATION}/${deviceMac}`, 'Not Authorized8');
            throw error;
        }
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
            endDate,
            authMethod
        } = findAllHistoryDto;

        return await this.historyService.findAll(
            page,
            limit,
            search,
            deviceId,
            userId,
            startDate,
            endDate,
            authMethod as 'fingerprint' | 'card'
        );
    }

    @Get('employee/:userId/shifts')
    async getEmployeeShifts(
        @Param('userId') userId: string,
        @Query('startDate') startDate: Date,
        @Query('endDate') endDate: Date
    ) {
        return this.historyService.getEmployeeShifts(userId, startDate, endDate);
    }

    @Get('employee/:userId/summary')
    async getEmployeeAttendanceSummary(
        @Param('userId') userId: string,
        @Query('startDate') startDate: Date,
        @Query('endDate') endDate: Date
    ) {
        return this.historyService.getEmployeeAttendanceSummary(userId, startDate, endDate);
    }

}