// types/notifications.ts

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export type NotificationAudienceRole = 'ADMIN' | 'SUPERVISOR' | 'RM';

export interface Notification {
  id: string;
  type: string; // e.g. 'followUpAssigned', 'upcomingBirthday', 'absenteeAutomation'
  title: string;
  message: string;
  createdAt: string; // ISO string
  readAt?: string; // ISO string

  roles: NotificationAudienceRole[];

  personId?: string;
  followUpId?: string;
  programId?: string;

  meta?: Record<string, any>;
}
