// src/modules/history/history.service.ts
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { History, HistoryDocument } from "src/schema/history.schema";
import { Model, Types } from "mongoose";
import { CreateUserLogDto, UpdateUserLogDto } from "./dto/history.dto";
import { User, UserDocument } from "src/schema/user.schema";
import { Device, DeviceDocument } from "src/schema/device.schema";

@Injectable()
export class HistoryService {
    private readonly logger = new Logger(HistoryService.name);

    constructor(
        @InjectModel(History.name)
        private readonly historyModel: Model<HistoryDocument>,

        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,

        @InjectModel(Device.name)
        private readonly deviceModel: Model<DeviceDocument>
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
        const user = await this.userModel.findById(userId);
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
            time_out: null
        }).sort({ time_in: -1 });

        if (!userLog) {
            throw new NotFoundException('User log not found');
        }

        Object.assign(userLog, updateUserLogDto);
        return await userLog.save();
    }

    async getLatestUserLog(userId: string): Promise<HistoryDocument | null> {
        const userObjectId = new Types.ObjectId(userId);
        return await this.historyModel.findOne({
            user: userObjectId
        })
        .sort({ date: -1, time_in: -1 })
        .exec();
    }

    async processAttendance(userId: string, deviceId: string, authMethod: 'fingerprint' | 'card'): Promise<void> {
        try {
            const userObjectId = new Types.ObjectId(userId);
            const user = await this.userModel.findById(userObjectId);
            const device = await this.deviceModel.findById(deviceId);

            if (!user || !device) {
                throw new NotFoundException('User or Device not found');
            }

            const latestUserLog = await this.getLatestUserLog(userId);
            const currentTime = new Date();
            const currentTimeStr = currentTime.toTimeString().split(' ')[0];

            // Case 1: No previous log or last log has time_out -> Create new check-in
            if (!latestUserLog || latestUserLog.time_out) {
                this.logger.log(`${user.name} checked IN at ${currentTimeStr} using ${authMethod} on device ${device.deviceMac}`);
                
                await this.saveUserLog(user._id.toString(), {
                    date: currentTime,
                    time_in: currentTimeStr,
                    time_out: null,
                    check_in_device: deviceId,
                    check_in_auth_method: authMethod
                });
                return;
            }

            // Case 2: New day -> Create new check-in
            const logDate = new Date(latestUserLog.date);
            if (logDate.toDateString() !== currentTime.toDateString()) {
                this.logger.log(`${user.name} checked IN at ${currentTimeStr} using ${authMethod} on device ${device.deviceMac}`);
                
                await this.saveUserLog(user._id.toString(), {
                    date: currentTime,
                    time_in: currentTimeStr,
                    time_out: null,
                    check_in_device: deviceId,
                    check_in_auth_method: authMethod
                });
                return;
            }

            // Case 3: Same day, no time_out -> Update as check-out
            if (!latestUserLog.time_out) {
                this.logger.log(`${user.name} checked OUT at ${currentTimeStr} using ${authMethod} on device ${device.deviceMac}`);
                
                await this.updateUserLog(
                    user._id.toString(),
                    latestUserLog.date,
                    latestUserLog.time_in,
                    {
                        time_out: currentTimeStr,
                        check_out_device: deviceId,
                        check_out_auth_method: authMethod
                    }
                );
                return;
            }

        } catch (error) {
            this.logger.error(`Error processing attendance: ${error.message}`);
            throw error;
        }
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
                query.user = new Types.ObjectId(userId);
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
}