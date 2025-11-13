// types/broadcasts.ts

import type { CommunicationChannel } from './communications';

/**
 * Segment keys used by the broadcast engine and UI.
 * These are aligned with your guest/member evolution and workforce model.
 */
export type BroadcastSegmentKey =
  | 'all-people'
  // Members
  | 'members-all'
  | 'members-regular'
  | 'members-adherent'
  | 'members-returning'
  | 'members-visiting'
  // Guests
  | 'guests-all'
  | 'guests-first-time'
  | 'guests-returning'
  | 'guests-regular'
  // Workers
  | 'workers-all';

/**
 * A single broadcast send summary.
 * We keep this lightweight and focused on analytics/history.
 */
export interface BroadcastRecord {
  id: string;
  createdAt: string;         // ISO timestamp
  createdByUserId: string;   // Internal user that initiated the broadcast

  programId?: string;        // Optional – program this broadcast relates to
  channel: CommunicationChannel;
  segmentKey: BroadcastSegmentKey;

  messageBody: string;       // Final template used (with placeholders)
  totalTargets: number;
  successCount: number;
  failureCount: number;
}
