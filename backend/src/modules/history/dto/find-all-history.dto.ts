// src/modules/history/dto/find-all-history.dto.ts
export class FindAllHistoryDto {
    page?: number;
    limit?: number;
    search?: string;
    deviceId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    authMethod?: 'fingerprint' | 'card';  // Thêm filter theo phương thức xác thực
}