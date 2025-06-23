import { WorkShift } from "src/schema/workshift.schema";
import { AttendanceStatus, WorkMetrics } from "../dto/attendance.dto";

export class AttendanceCalculator {
    static determineCheckInStatus(currentTime: Date, expectedShift: WorkShift): AttendanceStatus {
        const currentMinutes = this.dateToMinutes(currentTime);
        const startMinutes = this.timeStringToMinutes(expectedShift.startTime);
        const lateThreshold = expectedShift.allowLate || 0;

        if (currentMinutes > startMinutes + lateThreshold) {
            return 'late';
        }

        // If arriving earlier than shift start, it's not 'early' in a negative sense.
        // The final status will be determined at checkout.
        return 'on-time';
    }

    static calculateWorkMetrics(
        timeIn: string,
        timeOut: string,
        shift: WorkShift
    ): WorkMetrics {
        const timeInMinutes = this.timeStringToMinutes(timeIn);
        const timeOutMinutes = this.timeStringToMinutes(timeOut);
        const shiftStartMinutes = this.timeStringToMinutes(shift.startTime);
        const shiftEndMinutes = this.timeStringToMinutes(shift.endTime);

        // New Rule: Check for intersection. If no overlap, calculate nothing.
        const hasIntersection = timeInMinutes <= shiftEndMinutes && timeOutMinutes >= shiftStartMinutes;
        if (!hasIntersection) {
            return { workHours: 0, overtime: 0, status: 'absent' };
        }

        // --- 1. Calculate Actual Work Hours ---
        const validWorkStart = Math.max(timeInMinutes, shiftStartMinutes);
        const validWorkEnd = Math.min(timeOutMinutes, shiftEndMinutes);
        
        let workDuration = 0;
        if (validWorkEnd > validWorkStart) {
            workDuration = validWorkEnd - validWorkStart;
        }

        // --- 2. Subtract Lunch Break ---
        if (shift.breakStart && shift.breakEnd) {
            const breakStartMinutes = this.timeStringToMinutes(shift.breakStart);
            const breakEndMinutes = this.timeStringToMinutes(shift.breakEnd);
            const breakOverlapStart = Math.max(validWorkStart, breakStartMinutes);
            const breakOverlapEnd = Math.min(validWorkEnd, breakEndMinutes);
            
            if (breakOverlapEnd > breakOverlapStart) {
                const breakDuration = breakOverlapEnd - breakOverlapStart;
                workDuration -= breakDuration;
            }
        }
        
        const workHours = workDuration > 0 ? parseFloat((workDuration / 60).toFixed(2)) : 0;

        // --- 3. Calculate Overtime (OT) ---
        let otBeforeMinutes = 0;
        if (timeInMinutes < shiftStartMinutes) {
            const potentialOt = shiftStartMinutes - timeInMinutes;
            if (potentialOt > (shift.overtimeBefore || 0)) {
                otBeforeMinutes = potentialOt;
            }
        }

        let otAfterMinutes = 0;
        if (timeOutMinutes > shiftEndMinutes) {
            const potentialOt = timeOutMinutes - shiftEndMinutes;
            if (potentialOt > (shift.overtimeAfter || 0)) {
                otAfterMinutes = potentialOt;
            }
        }

        const totalOtMinutes = otBeforeMinutes + otAfterMinutes;
        const overtime = totalOtMinutes > 0 ? parseFloat((totalOtMinutes / 60).toFixed(2)) : 0;
        
        // --- 4. Determine final status ---
        const allowLateMinutes = shift.allowLate || 0;
        const allowEarlyMinutes = shift.allowEarly || 0;
        let status: AttendanceStatus = 'on-time';

        if (timeInMinutes > shiftStartMinutes + allowLateMinutes) {
            status = 'late';
        } else if (timeOutMinutes < shiftEndMinutes - allowEarlyMinutes) {
            status = 'early'; // Leaving early
        } else if (overtime > 0) {
            status = 'overtime';
        }
        
        return { workHours, overtime, status };
    }
    
    static timeStringToMinutes(timeStr: string): number {
        if (!timeStr || !timeStr.includes(':')) return 0;
        const [hour, minute] = timeStr.split(':').map(Number);
        return hour * 60 + minute;
    }
    
    private static dateToMinutes(date: Date): number {
        return date.getHours() * 60 + date.getMinutes();
    }

    static formatTimeString(date: Date): string {
        return date.toTimeString().split(' ')[0];
    }
} 