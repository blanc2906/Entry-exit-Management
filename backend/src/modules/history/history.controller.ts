// src/modules/history/history.controller.ts
import { Controller, Get, Query, Res } from "@nestjs/common";
import { Response } from 'express';
import { HistoryService } from "./history.service";
import { FindAllHistoryDto } from "./dto/find-all-history.dto";
import { ExportHistoryDto } from './dto/export-history.dto';

@Controller('history')
export class HistoryController {
    constructor(
        private readonly historyService: HistoryService
    ) {}

    @Get('findAll')
    async findAll(@Query() findAllHistoryDto: FindAllHistoryDto) {
        return await this.historyService.findAll(findAllHistoryDto);
    }

    @Get('export')
    async exportToExcel(
        @Query() exportHistoryDto: ExportHistoryDto,
        @Res() res: Response
    ) {
        const buffer = await this.historyService.exportToExcel(exportHistoryDto);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=attendance-report.xlsx',
            'Content-Length': buffer.length,
        });
        
        res.send(buffer);
    }
}