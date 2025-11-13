// types/config.ts

export type AttendanceScope =
  | 'all'
  | 'members-only'
  | 'guests-only'
  | 'members-and-regular-guests';

export interface EvolutionThresholds {
  guestToReturningThreshold: number; // # of visits to move guestType: first-time -> returning
  returningToRegularThreshold: number; // # of visits to move returning -> regular guest
  regularGuestToMemberThreshold: number; // # of visits + conditions for promotion eligibility
}

export interface MemberRatingThreshold {
  minAttendancePercentage: number; // e.g. 75% of services in window
  minWeeksConsidered: number; // e.g. last 12 weeks
}

export interface MemberRatingThresholds {
  regular: MemberRatingThreshold;
  adherent: MemberRatingThreshold;
  returning: MemberRatingThreshold;
  visiting: MemberRatingThreshold;
}

export interface EvolutionConfig {
  enabled: boolean;
  thresholds: EvolutionThresholds;
  memberRatingThresholds: MemberRatingThresholds;
  considerProgramsOfType?: string[]; // e.g. ["sunday-service", "midweek-service"]
}

export interface AbsenteeRule {
  enabled: boolean;
  scope: AttendanceScope;
  missedProgramsCount: number; // e.g. 2 missed in a row
  withinDays: number; // e.g. within 21 days
  createFollowUp: boolean;
  followUpType: string; // e.g. "absentee"
  followUpPriority: 'low' | 'medium' | 'high';
}

export interface FollowUpTimeframeConfig {
  newGuestHours: number; // e.g. contact first-time guest within X hours
  returningGuestHours: number;
  regularGuestHours: number;
  absenteeHours: number;
}

export interface FollowUpAssignmentConfig {
  autoAssignEnabled: boolean;
  defaultAssignmentMode: 'round-robin' | 'fixed-rm' | 'by-cell' | 'none';
  defaultRmUserId?: string; // used if defaultAssignmentMode === 'fixed-rm'
}

export interface FollowUpConfig {
  enabled: boolean;
  timeframes: FollowUpTimeframeConfig;
  assignment: FollowUpAssignmentConfig;
  absenteeRule: AbsenteeRule;
}

export type HttpMethod = 'GET' | 'POST';

export interface HttpProviderConfig {
  enabled: boolean;
  baseUrl: string;
  method: HttpMethod;
  apiKey?: string;
  apiKeyHeaderName?: string; // e.g. "Authorization", "X-API-KEY"
  defaultSenderId?: string;
  extraHeaders?: Record<string, string>;
  timeoutMs: number;
}

export interface WhatsappProviderConfig extends HttpProviderConfig {
  useWhatsappDeepLinks: boolean; // if true, open whatsapp:// links when possible
}

export interface SmsProviderConfig extends HttpProviderConfig {}

export interface EmailProviderConfig extends HttpProviderConfig {
  fromAddress?: string;
  fromName?: string;
}

/**
 * Saved broadcast / messaging templates for use in Broadcast and other
 * automated communications (birthdays, reminders, etc.).
 */
export interface BroadcastMessageTemplateConfig {
  id: string; // unique key (referenced by messageTemplateId)
  name: string; // e.g. "Sunday Invitation", "Midweek Reminder"
  description?: string;
  defaultChannel?: 'whatsapp' | 'sms' | 'email';
  bodyTemplate: string; // message body with placeholders ({{firstName}}, {{programName}}, etc.)
  isActive: boolean;
}

export interface CallConfig {
  enabled: boolean; // if true, UI will show tel: links
}

export interface CommunicationsConfig {
  whatsapp: WhatsappProviderConfig;
  sms: SmsProviderConfig;
  email: EmailProviderConfig;
  call: CallConfig;
  defaultChannelOrder: ('whatsapp' | 'sms' | 'email' | 'call')[];
  /**
   * Saved templates that can be reused in Broadcast, birthdays, and other
   * automated workflows.
   */
  broadcastTemplates: BroadcastMessageTemplateConfig[];
}

export interface GoogleSheetsSyncConfig {
  enabled: boolean;
  spreadsheetId: string;
  peopleRange: string; // e.g. "People!A:Z"
  attendanceRange: string; // e.g. "Attendance!A:Z"
  followUpsRange: string; // e.g. "FollowUps!A:Z"
  syncDirection: 'local-to-sheets' | 'bi-directional';
  lastSyncAt?: string; // ISO string
}

export interface GoogleDriveBackupConfig {
  enabled: boolean;
  folderId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  lastBackupAt?: string;
  keepLastNBackups: number;
}

export interface BackupConfig {
  localEnabled: boolean;
  googleDrive: GoogleDriveBackupConfig;
}

export interface ExcelExportConfig {
  enabled: boolean;
  includeSheets: ('people' | 'programs' | 'attendance' | 'tallies' | 'followUps')[];
}

export interface BirthdayMessagingConfig {
  enabled: boolean;
  leadTimeDays: number; // e.g. 0 = same day, 1 = day before
  defaultChannel: 'whatsapp' | 'sms' | 'email';
  sendAutomatically: boolean; // auto-send vs create follow-up only
  /**
   * ID of a template in CommunicationsConfig.broadcastTemplates
   * used as the base content for birthday messages.
   */
  followUpType: string; // e.g. "birthday"
  messageTemplateId: string; // reference into communications templates
}

export interface AttendanceConfig {
  defaultScope: AttendanceScope;
  trackForGuests: boolean;
  trackForMembers: boolean;
  trackWorkersOnly: boolean; // if true, only people flagged as workers are expected
}

export interface TallyConfig {
  enabled: boolean;
  autoGenerateOnProgramCreate: boolean;
  defaultExpectedAttendance: number; // used if not specified in program
  codePrefix: string; // e.g. "T"
  codePadding: number; // e.g. 3 -> T001, T002
  allowReuseAcrossPrograms: boolean;
}

export interface NotificationEventConfig {
  enabled: boolean;
  notifyRoles: ('ADMIN' | 'SUPERVISOR' | 'RM')[];
}

export interface NotificationsConfig {
  newFirstTimeGuest: NotificationEventConfig;
  guestReadyForPromotion: NotificationEventConfig;
  followUpAssigned: NotificationEventConfig;
  followUpOverdue: NotificationEventConfig;
  upcomingBirthday: NotificationEventConfig;
}

export interface UiConfig {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string; // keep in sync with Tailwind theme
  accentColor: string;
}

export interface SystemInfoConfig {
  churchName: string;
  timezone: string; // e.g. "Africa/Lagos"
  contactEmail?: string;
  contactPhone?: string;
}

export interface SystemConfig {
  version: number;
  evolution: EvolutionConfig;
  followUp: FollowUpConfig;
  communications: CommunicationsConfig;
  googleSheets: GoogleSheetsSyncConfig;
  backup: BackupConfig;
  excelExport: ExcelExportConfig;
  birthdays: BirthdayMessagingConfig;
  attendance: AttendanceConfig;
  tally: TallyConfig;
  notifications: NotificationsConfig;
  ui: UiConfig;
  systemInfo: SystemInfoConfig;
}
