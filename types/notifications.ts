// types/notifications.ts

export type NotificationType =
  | 'new-first-time-guest'
  | 'guest-ready-for-promotion'
  | 'follow-up-assigned'
  | 'follow-up-overdue'
  | 'upcoming-birthday'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;            // ISO
  readAt?: string;              // ISO
  recipientUserId: string;
  relatedPersonId?: string;
  relatedFollowUpId?: string;
  relatedProgramId?: string;
}
