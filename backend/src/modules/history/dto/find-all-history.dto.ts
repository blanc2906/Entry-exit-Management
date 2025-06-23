// src/modules/history/dto/find-all-history.dto.ts
export class FindAllHistoryDto {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
}