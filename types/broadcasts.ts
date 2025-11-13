// types/broadcasts.ts

import type { CommunicationChannel } from './communications';

export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';

export interface BroadcastSegment {
  id: string;
  name: string;
  description?: string;
  // Implementation detail: this describes the filter; evaluated in code
  criteria: Record<string, unknown>;
}

export interface Broadcast {
  id: string;
  name: string;
  description?: string;
  channel: CommunicationChannel;
  templateId?: string;
  bodyOverride?: string;
  segmentId: string;
  scheduledFor?: string;         // ISO
  status: BroadcastStatus;
  createdAt: string;             // ISO
  createdByUserId: string;
  startedAt?: string;            // ISO
  completedAt?: string;          // ISO
}

export interface BroadcastRecipientLog {
  id: string;
  broadcastId: string;
  personId: string;
  channel: CommunicationChannel;
  sentAt: string;                // ISO
  providerMessageId?: string;
  success: boolean;
  errorMessage?: string;
}
