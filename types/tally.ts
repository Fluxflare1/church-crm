// types/tally.ts

export type TallyStatus = 'available' | 'issued' | 'logged' | 'void';

export type TallyCheckInSource = 'self-service' | 'rm' | 'supervisor' | 'admin';

export interface Tally {
  id: string;
  programId: string;
  /**
   * Human-readable code printed/assigned to the tally.
   * e.g. T001, T002, ...
   */
  code: string;

  status: TallyStatus;

  /**
   * When the tally was issued at the gate.
   * This is the TRUE arrival time and must never be edited by UI.
   */
  issuedAt?: string;
  issuedByUserId?: string;

  /**
   * Person who eventually claimed this tally (mapped at check-in).
   * May be undefined if never mapped.
   */
  personId?: string;
  /**
   * When the tally was mapped to a person profile.
   */
  mappedAt?: string;
  /**
   * How the tally was mapped (self-service, RM, etc.).
   */
  checkInSource?: TallyCheckInSource;

  /**
   * Optional additional "logged at" timestamp
   * if you want to track when the code was entered or scanned.
   * For your fraud-prevention model, arrival time logic should use issuedAt.
   */
  loggedAt?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Simple per-program tally statistics.
 * Used by /tally/reports.
 */
export interface TallyProgramStats {
  programId: string;
  totalTallies: number;
  issuedCount: number;
  mappedCount: number;
  voidCount: number;
}

/**
 * Arrival bucket representation for basic arrival pattern reporting.
 * This is intentionally simple and does not depend on program start time.
 */
export interface TallyArrivalBucket {
  label: string; // e.g. "08:00 – 08:59"
  count: number;
}
