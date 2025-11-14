// types/attendance.ts

export type AttendanceStatus = 'present' | 'absent' | 'excused';

export interface AttendanceRecord {
  id: string;
  programId: string;
  personId: string;
  status: AttendanceStatus;

  /**
   * Timestamp of the attendance event.
   * When driven by tally issuance, this should be the tally.issuedAt value.
   */
  timestamp: string;

  createdAt: string;
  updatedAt: string;

  markedByUserId: string;

  /**
   * Optional link back to the tally that produced this attendance.
   */
  tallyId?: string;
}
