// src/modules/history/history.service.ts
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { History, HistoryDocument } from "src/schema/history.schema";
import { Model, Types } from "mongoose";
import { CreateUserLogDto, UpdateUserLogDto } from "./dto/history.dto";
import { User, UserDocument } from "src/schema/user.schema";
import { Device, DeviceDocument } from "src/schema/device.schema";
import { ActivityGateway } from './activity.gateway';
import { WorkShift } from '../../schema/workshift.schema';
import { WorkSchedule } from '../../schema/workschedule.schema';
import * as XLSX from 'xlsx';
import { ExportHistoryDto } from './dto/export-history.dto';

type AttendanceStatus = 'on-time' | 'late' | 'early' | 'absent' | 'overtime';

@Injectable()
export class HistoryService {
    private readonly logger = new Logger(HistoryService.name);

    constructor(
        @InjectModel(History.name)
        private readonly historyModel: Model<History>,

        @InjectModel(User.name)
        private readonly userModel: Model<User>,

        @InjectModel(Device.name)
        private readonly deviceModel: Model<Device>,

        @InjectModel(WorkShift.name)
        private readonly workShiftModel: Model<WorkShift>,

        @InjectModel(WorkSchedule.name)
        private readonly workScheduleModel: Model<WorkSchedule>,

        private readonly activityGateway: ActivityGateway
    ) {}

    async getAllUserLogs(): Promise<HistoryDocument[]> {
        return await this.historyModel.find()
            .populate('user', 'name email')
            .populate('check_in_device', 'deviceMac description')
            .populate('check_out_device', 'deviceMac description')
            .sort({ date: -1, time_in: -1 })
            .exec();
    }

    async saveUserLog(userId: string, createUserLogDto: CreateUserLogDto): Promise<HistoryDocument> {
        const user = await this.userModel.findById(userId).populate('workSchedule');
        const device = await this.deviceModel.findById(createUserLogDto.check_in_device);

        if (!user || !device) {
            throw new NotFoundException('User or Device not found');
        }

        const userLog = new this.historyModel({
            user: user._id,
            check_in_device: device._id,
            check_in_auth_method: createUserLogDto.check_in_auth_method,
            ...createUserLogDto
        });

        const savedLog = await userLog.save();
        user.history.push(savedLog._id);
        await user.save();
        
        const populatedLog = await savedLog.populate([
          { path: 'user', select: 'name avatar email' },
          { path: 'check_in_device', select: 'deviceMac description name' },
          { path: 'check_out_device', select: 'deviceMac description name' }
        ]).then((doc: any) => doc.toObject ? doc.toObject() : doc);
        
        this.activityGateway.sendRecentActivity(this.mapToRecentAttendance(populatedLog, 'check-in'));
        return savedLog;
    }

    async updateUserLog(
        userId: string,
        date: Date,
        time_in: string,
        updateUserLogDto: UpdateUserLogDto
    ): Promise<HistoryDocument> {
        const userObjectId = new Types.ObjectId(userId);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const userLog = await this.historyModel.findOne({
            user: userObjectId,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            time_in: time_in
        });

        if (!userLog) {
            throw new NotFoundException('User log not found');
        }

        Object.assign(userLog, updateUserLogDto);
        const updatedLog = await userLog.save();
        
        const populatedLog = await updatedLog.populate([
          { path: 'user', select: 'name avatar email' },
          { path: 'check_in_device', select: 'deviceMac description name' },
          { path: 'check_out_device', select: 'deviceMac description name' }
        ]).then((doc: any) => doc.toObject ? doc.toObject() : doc);
        
        this.activityGateway.sendRecentActivity(this.mapToRecentAttendance(populatedLog, 'check-out'));
        return updatedLog;
    }

    async getLatestUserLog(userId: string): Promise<HistoryDocument | null> {
        const userObjectId = new Types.ObjectId(userId);
        return await this.historyModel.findOne({
            user: userObjectId
        })
        .sort({ date: -1, time_in: -1 })
        .exec();
    }

   
    async processAttendance(userId: string, deviceId: string, authMethod: 'fingerprint' | 'card'): Promise<{
        type: 'check-in' | 'check-out',
        message: string,
        data: HistoryDocument
    }> {
        const user = await this.userModel.findById(userId).populate('workSchedule');
        const device = await this.deviceModel.findById(deviceId);
        if (!user || !device) throw new NotFoundException('User or Device not found');

        const currentTime = new Date();
        const dateOnly = new Date(currentTime);
        dateOnly.setHours(0, 0, 0, 0);

        let log = await this.historyModel.findOne({ user: userId, date: dateOnly });

        if (!log) {
        
            let expectedShift = null;
            if (
                user &&
                user.workSchedule &&
                typeof user.workSchedule === 'object' &&
                'shifts' in user.workSchedule &&
                user.workSchedule.shifts &&
                typeof user.workSchedule.shifts === 'object'
            ) {
                const dayOfWeek = currentTime.getDay();
                const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
                let expectedShiftId;
                if (user.workSchedule.shifts instanceof Map) {
                    expectedShiftId = user.workSchedule.shifts.get(dayName);
                } else {
                    expectedShiftId = user.workSchedule.shifts[dayName];
                }
                if (expectedShiftId) {
                    expectedShift = await this.workShiftModel.findById(expectedShiftId);
                }
            }
            const status: AttendanceStatus = expectedShift
                ? this.determineCheckInStatus(currentTime, expectedShift)
                : 'absent';
            log = new this.historyModel({
                user: userId,
                date: dateOnly,
                time_in: this.formatTimeString(currentTime),
                check_in_device: device._id,
                check_in_auth_method: authMethod,
                expectedShift: expectedShift ? expectedShift._id : null,
                expectedStartTime: expectedShift ? expectedShift.startTime : null,
                expectedEndTime: expectedShift ? expectedShift.endTime : null,
                status,
                workHours: 0,
                overtime: 0
            });
            await log.save();
            const populatedLog = await log.populate([
                { path: 'user', select: 'name avatar email' },
                { path: 'check_in_device', select: 'deviceMac description name' },
                { path: 'check_out_device', select: 'deviceMac description name' }
            ]).then((doc: any) => doc.toObject ? doc.toObject() : doc);
            populatedLog.timestamp = new Date(
                populatedLog.date.toISOString().slice(0, 10) + 'T' + (populatedLog.time_in || '00:00:00')
            ).toISOString();
            await this.activityGateway.sendRecentActivity(this.mapToRecentAttendance(populatedLog, 'check-in'));
            return { type: 'check-in', message: 'Check-in successful', data: log };
        } else {
            const timeOut = this.formatTimeString(currentTime);
            log.time_out = timeOut;
            log.check_out_device = device._id;
            log.check_out_auth_method = authMethod;

            if (log.expectedShift) {
                const expectedShift = await this.workShiftModel.findById(log.expectedShift);
                if (expectedShift) {
                    const { workHours, overtime, status } = this.calculateWorkMetrics(
                        log.time_in,
                        timeOut,
                        expectedShift
                    );
                    log.workHours = workHours;
                    log.overtime = overtime;
                    log.status = status;
                }
            } else {
                let user = await this.userModel.findById(log.user)
                    .populate({
                        path: 'workSchedule',
                        populate: { path: 'shifts', model: 'WorkShift' }
                    });
                let expectedShift = null;
                if (
                    user &&
                    user.workSchedule &&
                    typeof user.workSchedule === 'object' &&
                    'shifts' in user.workSchedule &&
                    user.workSchedule.shifts &&
                    typeof user.workSchedule.shifts === 'object'
                ) {
                    const dayOfWeek = currentTime.getDay();
                    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
                    let expectedShiftId;
                    if (user.workSchedule.shifts instanceof Map) {
                        expectedShiftId = user.workSchedule.shifts.get(dayName);
                    } else {
                        expectedShiftId = user.workSchedule.shifts[dayName];
                    }
                    if (expectedShiftId) {
                        expectedShift = await this.workShiftModel.findById(expectedShiftId);
                    }
                }
                if (expectedShift) {
                    log.expectedShift = expectedShift._id;
                    log.expectedStartTime = expectedShift.startTime;
                    log.expectedEndTime = expectedShift.endTime;
                    const { workHours, overtime, status } = this.calculateWorkMetrics(
                        log.time_in,
                        timeOut,
                        expectedShift
                    );
                    log.workHours = workHours;
                    log.overtime = overtime;
                    log.status = status;
                } else {
                    log.status = 'absent';
                    log.workHours = 0;
                    log.overtime = 0;
                }
            }
            await log.save();
            const populatedLog = await log.populate([
                { path: 'user', select: 'name avatar email' },
                { path: 'check_in_device', select: 'deviceMac description name' },
                { path: 'check_out_device', select: 'deviceMac description name' }
            ]).then((doc: any) => doc.toObject ? doc.toObject() : doc);
            populatedLog.timestamp = new Date(
                populatedLog.date.toISOString().slice(0, 10) + 'T' + (populatedLog.time_out || '00:00:00')
            ).toISOString();
            await this.activityGateway.sendRecentActivity(this.mapToRecentAttendance(populatedLog, 'check-out'));
            return { type: 'check-out', message: 'Check-out successful', data: log };
        }
    }

    private determineCheckInStatus(currentTime: Date, expectedShift: WorkShift): AttendanceStatus {
        const currentTimeStr = this.formatTimeString(currentTime);
        const currentMinutes = this.timeStringToMinutes(currentTimeStr);
        const startMinutes = this.timeStringToMinutes(expectedShift.startTime);

        const lateThreshold = expectedShift.allowLate || 15;

        if (currentMinutes <= startMinutes - 30) {
            return 'early';
        } else if (currentMinutes <= startMinutes + lateThreshold) {
            return 'on-time';
        } else {
            return 'late';
        }
    }


    private calculateWorkMetrics(
        timeIn: string,
        timeOut: string,
        expectedShift: WorkShift
    ): { workHours: number, overtime: number, status: AttendanceStatus } {
        const inMinutes = this.timeStringToMinutes(timeIn);
        const outMinutes = this.timeStringToMinutes(timeOut);
        const startMinutes = this.timeStringToMinutes(expectedShift.startTime);
        const endMinutes = this.timeStringToMinutes(expectedShift.endTime);

        const actualWorkMinutes = outMinutes - inMinutes;
        const workHours = Math.max(0, actualWorkMinutes / 60);

        let overtime = 0;
        if (outMinutes > endMinutes) {
            overtime = (outMinutes - endMinutes) / 20;
        }

        let status: AttendanceStatus;
        const lateThreshold = expectedShift.allowLate || 15;
        const earlyThreshold = expectedShift.allowEarly || 15;

        if (inMinutes > startMinutes + lateThreshold) {
            status = 'late';
        } else if (outMinutes > endMinutes + earlyThreshold) {
            status = 'overtime';
        } else if (inMinutes < startMinutes - 30) {
            status = 'early';
        } else {
            status = 'on-time';
        }

        return { workHours, overtime, status };
    }


    private timeStringToMinutes(timeStr: string): number {
        const [hour, minute] = timeStr.split(':').map(Number);
        return hour * 60 + minute;
    }


    private formatTimeString(date: Date): string {
        return date.toTimeString().split(' ')[0];
    }

 
    async processCheckout(userId: string, deviceId: string, authMethod: 'fingerprint' | 'card'): Promise<void> {
        this.logger.warn('processCheckout method is deprecated. Use processAttendance instead.');
        await this.processAttendance(userId, deviceId, authMethod);
    }


    async getEmployeeShifts(userId: string, startDate: Date, endDate: Date) {
        const user = await this.userModel.findById(userId)
            .populate({
                path: 'workSchedule',
                populate: {
                    path: 'shifts',
                    model: 'WorkShift'
                }
            });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const attendance = await this.historyModel.find({
            user: userId,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).populate('expectedShift').sort({ date: 1 });

        return attendance;
    }

    async getEmployeeAttendanceSummary(userId: string, startDate: Date, endDate: Date) {
        const attendance = await this.historyModel.find({
            user: userId,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).populate('expectedShift').sort({ date: 1 });

        const summary = {
            totalDays: attendance.length,
            onTime: attendance.filter(a => a.status === 'on-time').length,
            late: attendance.filter(a => a.status === 'late').length,
            early: attendance.filter(a => a.status === 'early').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            overtime: attendance.filter(a => a.status === 'overtime').length,
            totalWorkHours: attendance.reduce((sum, a) => sum + (a.workHours || 0), 0),
            totalOvertime: attendance.reduce((sum, a) => sum + (a.overtime || 0), 0)
        };

        return summary;
    }


    async findAll(
        page: number = 1,
        limit: number = 10,
        search?: string,
        deviceId?: string,
        userId?: string,
        startDate?: string,
        endDate?: string,
        authMethod?: 'fingerprint' | 'card'
    ) {
        try {
            const query: any = {};

            if (search) {
                query.$or = [
                    { 'user.name': { $regex: search, $options: 'i' } }
                ];
            }

            if (deviceId) {
                query.$or = [
                    { check_in_device: new Types.ObjectId(deviceId) },
                    { check_out_device: new Types.ObjectId(deviceId) }
                ];
            }

            if (userId) {
                try {
                    query.$or = [
                        { user: new Types.ObjectId(userId) },
                        { user: userId }
                    ];
                } catch (e) {
                    query.user = userId;
                }
            }

            if (startDate || endDate) {
                query.date = {};
                if (startDate) {
                    query.date.$gte = new Date(startDate);
                }
                if (endDate) {
                    query.date.$lte = new Date(endDate);
                }
            }

            if (authMethod) {
                query.$or = [
                    { check_in_auth_method: authMethod },
                    { check_out_auth_method: authMethod }
                ];
            }

            const skip = (page - 1) * limit;
            const [histories, total] = await Promise.all([
                this.historyModel
                    .find(query)
                    .populate('user', 'name email userId')
                    .populate('check_in_device', 'deviceMac description')
                    .populate('check_out_device', 'deviceMac description')
                    .skip(skip)
                    .limit(limit)
                    .sort({ date: -1, time_in: -1 })
                    .exec(),
                this.historyModel.countDocuments(query)
            ]);

            return {
                histories,
                total,
                page,
                totalPages: Math.ceil(total / limit),
                filters: {
                    search,
                    deviceId,
                    userId,
                    startDate,
                    endDate,
                    authMethod
                }
            };
        } catch (error) {
            throw new Error(`Failed to find histories: ${error.message}`);
        }
    }

    async updateUserLogById(logId: string, updateUserLogDto: UpdateUserLogDto): Promise<HistoryDocument> {
        const userLog = await this.historyModel.findById(logId);
        if (!userLog) throw new NotFoundException('User log not found');
        Object.assign(userLog, updateUserLogDto);
        const updatedLog = await userLog.save();
        const populatedLog = await updatedLog.populate([
            { path: 'user', select: 'name avatar email' },
            { path: 'check_in_device', select: 'deviceMac description name' },
            { path: 'check_out_device', select: 'deviceMac description name' }
        ]).then((doc: any) => doc.toObject ? doc.toObject() : doc);
        this.activityGateway.sendRecentActivity(this.mapToRecentAttendance(populatedLog, 'check-out'));
        return updatedLog;
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

    async exportToExcel(exportHistoryDto: ExportHistoryDto): Promise<Buffer> {
        const { startDate, endDate, userId } = exportHistoryDto;
        
        // Build query
        const query: any = {};
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        if (userId) {
            // Nếu userId là ObjectId (24 ký tự hex), filter cả ObjectId và string
            if (/^[0-9a-fA-F]{24}$/.test(userId)) {
                query.$or = [
                    { user: new Types.ObjectId(userId) },
                    { user: userId }
                ];
            } else {
                // Nếu là mã nhân viên, tìm user theo userId rồi filter theo _id (string)
                const user = await this.userModel.findOne({ userId });
                if (user) {
                    query.$or = [
                        { user: user._id },
                        { user: user._id.toString() }
                    ];
                } else {
                    // Không tìm thấy user, trả về file rỗng
                    const worksheet = XLSX.utils.json_to_sheet([]);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo chấm công');
                    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
                }
            }
        }

        // Get history records with populated user data
        const histories = await this.historyModel.find(query)
            .populate('user', 'userId name')
            .sort({ date: 1, time_in: 1 })
            .exec();

        // Prepare data for Excel
        const data = histories.map(history => {
            const date = new Date(history.date);
            const dayOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][date.getDay()];
            
            return {
                'Mã nhân viên': history.user.userId || '',
                'Tên nhân viên': history.user.name || '',
                'Ngày': date.toLocaleDateString('vi-VN'),
                'Thứ': dayOfWeek,
                'Vào': history.time_in || '',
                'Ra': history.time_out || '',
                'Giờ': history.workHours || 0,
                'OT': history.overtime || 0
            };
        });

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Set column widths
        const columnWidths = [
            { wch: 15 }, // Mã nhân viên
            { wch: 25 }, // Tên nhân viên
            { wch: 12 }, // Ngày
            { wch: 10 }, // Thứ
            { wch: 10 }, // Vào
            { wch: 10 }, // Ra
            { wch: 8 },  // Giờ
            { wch: 8 }   // OT
        ];
        worksheet['!cols'] = columnWidths;

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo chấm công');

        // Generate buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        return excelBuffer;
    }
}