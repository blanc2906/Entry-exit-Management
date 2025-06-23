import { HistoryDocument } from "src/schema/history.schema";

export class AttendanceResult {
    type: 'check-in' | 'check-out';
    message: string;
    data: HistoryDocument;
}

export class WorkMetrics {
    workHours: number;
    overtime: number;
    status: AttendanceStatus;
}

export type AuthMethod = 'fingerprint' | 'card';
export type AttendanceStatus = 'on-time' | 'late' | 'early' | 'absent' | 'overtime';

export interface AttendanceLogData {
    user: string;
    date: Date;
    time_in: string;
    check_in_device: string;
    check_in_auth_method: AuthMethod;
    expectedShift?: string;
    expectedStartTime?: string;
    expectedEndTime?: string;
    status: AttendanceStatus;
    workHours: number;
    overtime: number;
} 