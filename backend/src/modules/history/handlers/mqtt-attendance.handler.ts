import { Controller, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Ctx, MessagePattern, Payload } from "@nestjs/microservices";
import { MqttContext } from "@nestjs/microservices";
import { ClientMqtt } from "@nestjs/microservices";
import { Inject } from "@nestjs/common";
import { AttendanceService } from "../services/attendance.service";
import { UsersService } from "../../users/users.service";
import { DevicesService } from "../../devices/devices.service";
import { ATTENDANCE_NOTIFICATION } from "src/shared/constants/mqtt.constant";

@Controller()
@Injectable()
export class MqttAttendanceHandler {
    private readonly logger = new Logger(MqttAttendanceHandler.name);

    constructor(
        private readonly attendanceService: AttendanceService,
        private readonly userService: UsersService,
        private readonly deviceService: DevicesService,
        @Inject('MQTT_CLIENT') private readonly mqttClient: ClientMqtt
    ) {}

    @MessagePattern('finger_attendance/#')
    async handleFingerAttendance(@Payload() data: number, @Ctx() context: MqttContext) {
        const deviceMac = this.extractDeviceMac(context);
        
        try {
            const device = await this.validateDevice(deviceMac);
            const user = await this.validateFingerprintUser(data, device);
            
            await this.notifyDevice(deviceMac, user.name);
            return await this.attendanceService.processAttendance(
                user._id.toString(),
                device._id.toString(),
                'fingerprint'
            );
        } catch (error) {
            await this.handleError(deviceMac, error);
            throw error;
        }
    }

    @MessagePattern('card_attendance/#')
    async handleCardAttendance(@Payload() data: string, @Ctx() context: MqttContext) {
        const deviceMac = this.extractDeviceMac(context);
        
        try {
            const device = await this.validateDevice(deviceMac);
            const user = await this.validateCardUser(data, device);
            
            await this.notifyDevice(deviceMac, user.name);
            return await this.attendanceService.processAttendance(
                user._id.toString(),
                device._id.toString(),
                'card'
            );
        } catch (error) {
            await this.handleError(deviceMac, error);
            throw error;
        }
    }

    private extractDeviceMac(context: MqttContext): string {
        return context.getTopic().split('/')[1];
    }

    private async validateDevice(deviceMac: string) {
        const device = await this.deviceService.getDeviceByMac(deviceMac);
        if (!device) {
            throw new NotFoundException(`Device not found with MAC: ${deviceMac}`);
        }
        return device;
    }

    private async validateFingerprintUser(fingerId: number, device: any) {
        const user = await this.userService.getUserByFingerId(fingerId, device._id.toString());
        if (!user) {
            throw new NotFoundException(`User not found with finger ID: ${fingerId}`);
        }
        return user;
    }

    private async validateCardUser(cardNumber: string, device: any) {
        const user = await this.userService.getUserByCardNumber(cardNumber);
        if (!user) {
            throw new NotFoundException(`User not found with card number: ${cardNumber}`);
        }
        
        const isUserInDevice = device.users.some(
            (userId: any) => userId.toString() === user._id.toString()
        );
        
        if (!isUserInDevice) {
            throw new UnauthorizedException(`User ${user.name} is not authorized for device ${device.deviceMac}`);
        }
        
        return user;
    }

    private async notifyDevice(deviceMac: string, message: string): Promise<void> {
        await this.mqttClient.emit(`${ATTENDANCE_NOTIFICATION}/${deviceMac}`, message);
    }

    private async handleError(deviceMac: string, error: any): Promise<void> {
        const errorMessage = this.getErrorMessage(error);
        await this.mqttClient.emit(`${ATTENDANCE_NOTIFICATION}/${deviceMac}`, errorMessage);
    }

    private getErrorMessage(error: any): string {
        if (error instanceof NotFoundException) {
            return error.message.includes('finger ID') ? 'Fingerprint Not Registered' : 'Card Not Registered';
        }
        if (error instanceof UnauthorizedException) {
            return 'User Not Authorized';
        }
        return 'Not Recognized';
    }
} 