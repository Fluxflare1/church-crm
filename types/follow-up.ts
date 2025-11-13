// types/follow-up.ts

export type FollowUpStatus = 'open' | 'in-progress' | 'completed' | 'on-hold';

export type FollowUpPriority = 'low' | 'medium' | 'high';

export type FollowUpChannel =
  | 'whatsapp'
  | 'sms'
  | 'email'
  | 'phone-call'
  | 'visit'
  | 'other';

export interface FollowUp {
  id: string;
  personId: string;
  type: string;                   // "new-guest", "returning-guest", "absentee", "birthday", etc.
  priority: FollowUpPriority;
  status: FollowUpStatus;
  dueDate: string;                // ISO
  completedAt?: string;           // ISO
  createdAt: string;              // ISO
  createdByUserId: string;
  assignedToUserId?: string;
  preferredChannel?: FollowUpChannel;
  notes: string;
}

export interface FollowUpActionLogEntry {
  id: string;
  followUpId: string;
  timestamp: string;              // ISO
  channel: FollowUpChannel;
  outcome: string;                // short description
  createdByUserId: string;
}
