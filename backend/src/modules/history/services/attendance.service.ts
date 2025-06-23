import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { History, HistoryDocument } from "src/schema/history.schema";
import { User, UserDocument } from "src/schema/user.schema";
import { Device, DeviceDocument } from "src/schema/device.schema";
import { WorkShift } from "src/schema/workshift.schema";
import { Model, Types } from "mongoose";
import { AppWebSocketGateway } from "../../websocket/websocket.gateway";
import { AttendanceResult, AuthMethod, AttendanceStatus } from "../dto/attendance.dto";
import { AttendanceCalculator } from "../utils/attendance-calculator.util";

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(
        @InjectModel(History.name)
        private readonly historyModel: Model<History>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(Device.name)
        private readonly deviceModel: Model<Device>,
        @InjectModel(WorkShift.name)
        private readonly workShiftModel: Model<WorkShift>,
        private readonly webSocketGateway: AppWebSocketGateway
    ) {}

    async processAttendance(userId: string, deviceId: string, authMethod: AuthMethod): Promise<AttendanceResult> {
        const user = await this.userModel.findById(userId).populate('workSchedule');
        const device = await this.deviceModel.findById(deviceId);
        if (!user || !device) {
            throw new NotFoundException('User or Device not found');
        }

        const currentTime = new Date();
        const dateOnly = new Date(currentTime);
        dateOnly.setHours(0, 0, 0, 0);
        const timeString = AttendanceCalculator.formatTimeString(currentTime);
        
        const expectedShift = await this.getExpectedShift(user as unknown as UserDocument, currentTime);
        const initialStatus: AttendanceStatus = expectedShift
            ? AttendanceCalculator.determineCheckInStatus(currentTime, expectedShift)
            : 'absent';
        
        const log = await this.historyModel.findOneAndUpdate(
            { user: userId, date: dateOnly },
            {
                $setOnInsert: {
                    user: userId,
                    date: dateOnly,
                    time_in: timeString,
                    check_in_device: device._id,
                    check_in_auth_method: authMethod,
                    expectedShift: expectedShift ? expectedShift._id : null,
                    expectedStartTime: expectedShift ? expectedShift.startTime : null,
                    expectedEndTime: expectedShift ? expectedShift.endTime : null,
                    status: initialStatus,
                    workHours: 0,
                    overtime: 0
                }
            },
            { new: true, upsert: true, sort: { time_in: 1 } }
        ).exec();

        const isCheckIn = log.time_in === timeString && !log.time_out;

        if (isCheckIn) {
            await this.notifyWebSocket(log, 'check-in');
            return { type: 'check-in', message: 'Check-in successful', data: log };
        } else {
            log.time_out = timeString;
            log.check_out_device = device._id as any;
            log.check_out_auth_method = authMethod;

            if (log.expectedShift) {
                const shift = await this.workShiftModel.findById(log.expectedShift);
                if (shift) {
                    const metrics = AttendanceCalculator.calculateWorkMetrics(log.time_in, log.time_out, shift);
                    log.workHours = metrics.workHours;
                    log.overtime = metrics.overtime;
                    log.status = metrics.status;
                }
            }
            await log.save();
            await this.notifyWebSocket(log, 'check-out');
            return { type: 'check-out', message: 'Check-out successful', data: log };
        }
    }

    private async getExpectedShift(user: UserDocument, currentTime: Date): Promise<WorkShift | null> {
        if (!user?.workSchedule) return null;

        const workSchedule = user.workSchedule as any;
        if (!workSchedule.shifts || typeof workSchedule.shifts !== 'object') return null;

        const dayOfWeek = currentTime.getDay();
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
        
        let expectedShiftId;
        if (workSchedule.shifts instanceof Map) {
            expectedShiftId = workSchedule.shifts.get(dayName);
        } else {
            expectedShiftId = workSchedule.shifts[dayName];
        }

        if (expectedShiftId) {
            return await this.workShiftModel.findById(expectedShiftId);
        }

        return null;
    }

    private async notifyWebSocket(log: HistoryDocument, type: 'check-in' | 'check-out'): Promise<void> {
        const populatedLog = await log.populate([
            { path: 'user', select: 'name avatar email' },
            { path: 'check_in_device', select: 'deviceMac description name' },
            { path: 'check_out_device', select: 'deviceMac description name' }
        ]).then((doc: any) => doc.toObject ? doc.toObject() : doc);

        const timeField = type === 'check-in' ? 'time_in' : 'time_out';
        populatedLog.timestamp = new Date(
            populatedLog.date.toISOString().slice(0, 10) + 'T' + (populatedLog[timeField] || '00:00:00')
        ).toISOString();

        await this.webSocketGateway.sendRecentActivity(this.mapToRecentAttendance(populatedLog, type));
    }

    private mapToRecentAttendance(log: any, type: 'check-in' | 'check-out') {
        return {
            user: {
                name: log.user?.name,
                avatar: log.user?.avatar,
            },
            time: type === 'check-in' ? log.time_in : log.time_out,
            device: type === 'check-in' ? log.check_in_device?.description : log.check_out_device?.description,
            status: type === 'check-in' ? log.check_in_auth_method : log.check_out_auth_method,
            timestamp: type === 'check-in'
                ? new Date(log.date.toISOString().slice(0, 10) + 'T' + (log.time_in || '00:00:00')).toISOString()
                : new Date(log.date.toISOString().slice(0, 10) + 'T' + (log.time_out || '00:00:00')).toISOString(),
            type,
        };
    }
} 