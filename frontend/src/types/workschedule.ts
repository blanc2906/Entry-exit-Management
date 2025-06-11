export interface WorkSchedule {
  _id: string;
  scheduleName: string;
  shifts: Record<string, string>; // { 'Monday': workShiftId, ... }
  note?: string;
}

export interface CreateWorkScheduleDto {
  scheduleName: string;
  shifts: Record<string, string>;
  note?: string;
} 