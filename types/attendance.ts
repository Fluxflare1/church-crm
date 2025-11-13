// types/attendance.ts

export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceRecord {
  id: string;
  personId: string;
  programId: string;
  status: AttendanceStatus;
  checkInTime?: string;      // ISO, may come from tally
  recordedByUserId: string;
  recordedAt: string;        // ISO
}

export interface AbsenteeDetectionResult {
  personId: string;
  missedProgramIds: string[];
  fromDate: string;          // ISO
  toDate: string;            // ISO
}
