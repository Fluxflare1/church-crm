// types/tally.ts

export type TallyStatus = 'available' | 'issued' | 'logged' | 'void';

export interface Tally {
  id: string;
  code: string;                // e.g. "T001"
  programId: string;
  status: TallyStatus;
  issuedToPersonId?: string;
  issuedAt?: string;           // ISO check-in time
  issuedByUserId?: string;
  loggedAt?: string;           // ISO (e.g. when collected/validated)
  loggedByUserId?: string;
  createdAt: string;           // ISO
  updatedAt: string;           // ISO
}

export interface TallyGenerationResult {
  programId: string;
  fromCode: string;
  toCode: string;
  count: number;
}

export interface TallyArrivalBucket {
  label: string;               // e.g. "On Time", "0–10 min late"
  count: number;
}

export interface TallyReport {
  programId: string;
  totalTallies: number;
  issuedCount: number;
  loggedCount: number;
  arrivalBuckets: TallyArrivalBucket[];
  generatedAt: string;         // ISO
}
