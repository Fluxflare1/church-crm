// types/programs.ts

export type ProgramStatus = 'planned' | 'completed' | 'cancelled';

export type ProgramType =
  | 'sunday-service'
  | 'midweek-service'
  | 'prayer-meeting'
  | 'special-event'
  | 'other';

export interface Program {
  id: string;
  name: string;
  type: ProgramType;
  date: string;             // ISO date
  startTime: string;        // e.g. "09:00"
  endTime?: string;         // optional
  location?: string;
  description?: string;
  status: ProgramStatus;
  expectedAttendance?: number;
  createdAt: string;        // ISO
  updatedAt: string;        // ISO
}
