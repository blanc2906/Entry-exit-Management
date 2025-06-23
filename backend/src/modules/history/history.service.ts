// src/modules/history/history.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { History, HistoryDocument } from "src/schema/history.schema";
import { User, UserDocument } from "src/schema/user.schema";
import { Model, Types } from "mongoose";
import { FindAllHistoryDto } from "./dto/find-all-history.dto";
import { ExportHistoryDto } from './dto/export-history.dto';
import { HistoryQueryService } from "./services/history-query.service";
import { AttendanceService } from "./services/attendance.service";
import * as XLSX from 'xlsx';

@Injectable()
export class HistoryService {
    private readonly logger = new Logger(HistoryService.name);

    constructor(
        @InjectModel(History.name)
        private readonly historyModel: Model<History>,

        @InjectModel(User.name)
        private readonly userModel: Model<User>,

        private readonly historyQueryService: HistoryQueryService,
        private readonly attendanceService: AttendanceService
    ) {}

    async findAll(findAllHistoryDto: FindAllHistoryDto) {
        try {
            const { page = 1, limit = 10 } = findAllHistoryDto;
            const query = await this.historyQueryService.buildFindAllQuery(findAllHistoryDto);
            
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
                filters: findAllHistoryDto
            };
        } catch (error) {
            this.logger.error(`Failed to find histories: ${error.message}`);
            throw new Error(`Failed to find histories: ${error.message}`);
        }
    }

    async processAttendance(userId: string, deviceId: string, authMethod: 'fingerprint' | 'card') {
        return await this.attendanceService.processAttendance(userId, deviceId, authMethod);
    }

    async exportToExcel(exportHistoryDto: ExportHistoryDto): Promise<Buffer> {
        const { startDate, endDate, userId } = exportHistoryDto;
        
        // Build query
        const query = this.historyQueryService.buildExportQuery(startDate, endDate, userId);
        
        // Handle userId as employee code if it's not an ObjectId
        if (userId && !/^[0-9a-fA-F]{24}$/.test(userId)) {
            const user = await this.userModel.findOne({ userId });
            if (user) {
                query.$or = [
                    { user: user._id },
                    { user: user._id.toString() }
                ];
            } else {
                // Return empty file if user not found
                return this.createEmptyExcelFile();
            }
            delete query.userId; // Remove the userId field we added
        }

        // Get history records with populated user data
        const histories = await this.historyModel.find(query)
            .populate('user', 'userId name')
            .sort({ date: 1, time_in: 1 })
            .exec();

        return this.createExcelFile(histories);
    }

    private createEmptyExcelFile(): Buffer {
        const worksheet = XLSX.utils.json_to_sheet([]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo chấm công');
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    private createExcelFile(histories: HistoryDocument[]): Buffer {
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
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
}