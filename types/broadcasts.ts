// types/broadcasts.ts

import type { CommunicationChannel } from './communications';

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

export interface BroadcastRecord {
  id: string;
  createdAt: string; // ISO timestamp
  createdByUserId: string;

  programId?: string;
  channel: CommunicationChannel;
  segmentKey: BroadcastSegmentKey;

  /**
   * Optional reference to a saved template used to generate this message.
   */
  templateId?: string;

  messageBody: string;
  totalTargets: number;
  successCount: number;
  failureCount: number;
}
