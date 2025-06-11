import { ObjectId } from 'mongoose';

export interface WorkShift {
  _id: ObjectId;
  name: string;
  startTime: string;
  endTime: string;
  allowLate: number;
  allowEarly: number;
}

export interface WorkSchedule {
  _id: ObjectId;
  scheduleName: string;
  shifts: Map<string, WorkShift>;
}

export interface UpdateWorkScheduleDto {
  workSchedule: ObjectId;
  shifts?: {
    day: string;
    shift: ObjectId;
  }[];
} 