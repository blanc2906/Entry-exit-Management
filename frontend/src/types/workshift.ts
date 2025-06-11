export interface WorkShift {
  _id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  totalWorkTime?: string;
  allowLate?: number;
  allowEarly?: number;
  overtimeBefore?: number;
  overtimeAfter?: number;
}

export interface CreateWorkShiftDto {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  totalWorkTime?: string;
  allowLate?: number;
  allowEarly?: number;
  overtimeBefore?: number;
  overtimeAfter?: number;
} 