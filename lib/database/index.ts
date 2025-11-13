'use client';

import { getItem, setItem } from '../storage';

import type {
  Person,
  Program,
  AttendanceRecord,
  Tally,
  FollowUp,
  FollowUpActionLogEntry,
  Broadcast,
  BroadcastRecipientLog,
  Notification,
  MessageTemplate,
  SystemConfig,
  User,
} from '@/types';

const DB_STORAGE_KEY = 'db:v1';

interface DatabaseState {
  people: Person[];
  programs: Program[];
  attendance: AttendanceRecord[];
  tallies: Tally[];
  followUps: FollowUp[];
  followUpActions: FollowUpActionLogEntry[];
  broadcasts: Broadcast[];
  broadcastRecipientLogs: BroadcastRecipientLog[];
  notifications: Notification[];
  messageTemplates: MessageTemplate[];
  users: User[];
  config: SystemConfig | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// ---- Default SystemConfig ---------------------------------------------------

const defaultSystemConfig: SystemConfig = {
  version: 1,
  evolution: {
    enabled: true,
    thresholds: {
      guestToReturningThreshold: 2,
      returningToRegularThreshold: 4,
      regularGuestToMemberThreshold: 8,
    },
    memberRatingThresholds: {
      regular: {
        minAttendancePercentage: 75,
        minWeeksConsidered: 12,
      },
      adherent: {
        minAttendancePercentage: 90,
        minWeeksConsidered: 12,
      },
      returning: {
        minAttendancePercentage: 50,
        minWeeksConsidered: 12,
      },
      visiting: {
        minAttendancePercentage: 25,
        minWeeksConsidered: 12,
      },
    },
    considerProgramsOfType: ['sunday-service', 'midweek-service'],
  },
  followUp: {
    enabled: true,
    timeframes: {
      newGuestHours: 24,
      returningGuestHours: 48,
      regularGuestHours: 72,
      absenteeHours: 24,
    },
    assignment: {
      autoAssignEnabled: true,
      defaultAssignmentMode: 'round-robin',
      defaultRmUserId: undefined,
    },
    absenteeRule: {
      enabled: true,
      scope: 'members-and-regular-guests',
      missedProgramsCount: 2,
      withinDays: 21,
      createFollowUp: true,
      followUpType: 'absentee',
      followUpPriority: 'high',
    },
  },
  communications: {
    whatsapp: {
      enabled: true,
      baseUrl: '',
      method: 'POST',
      apiKey: '',
      apiKeyHeaderName: 'Authorization',
      defaultSenderId: undefined,
      extraHeaders: {},
      timeoutMs: 15000,
      useWhatsappDeepLinks: true,
    },
    sms: {
      enabled: false,
      baseUrl: '',
      method: 'POST',
      apiKey: '',
      apiKeyHeaderName: 'Authorization',
      defaultSenderId: undefined,
      extraHeaders: {},
      timeoutMs: 15000,
    },
    email: {
      enabled: false,
      baseUrl: '',
      method: 'POST',
      apiKey: '',
      apiKeyHeaderName: 'Authorization',
      defaultSenderId: undefined,
      extraHeaders: {},
      timeoutMs: 15000,
      fromAddress: undefined,
      fromName: undefined,
    },
    call: {
      enabled: true, // enables tel: links in UI
    },
    defaultChannelOrder: ['whatsapp', 'sms', 'email', 'call'],
  },
  googleSheets: {
    enabled: false,
    spreadsheetId: '',
    peopleRange: 'People!A:Z',
    attendanceRange: 'Attendance!A:Z',
    followUpsRange: 'FollowUps!A:Z',
    syncDirection: 'local-to-sheets',
    lastSyncAt: undefined,
  },
  backup: {
    localEnabled: true,
    googleDrive: {
      enabled: false,
      folderId: '',
      frequency: 'manual',
      lastBackupAt: undefined,
      keepLastNBackups: 10,
    },
  },
  excelExport: {
    enabled: true,
    includeSheets: ['people', 'programs', 'attendance', 'tallies', 'followUps'],
  },
  birthdays: {
    enabled: true,
    leadTimeDays: 0,
    defaultChannel: 'whatsapp',
    sendAutomatically: false,
    followUpType: 'birthday',
    messageTemplateId: 'birthday-default',
  },
  attendance: {
    defaultScope: 'members-and-regular-guests',
    trackForGuests: true,
    trackForMembers: true,
    trackWorkersOnly: false,
  },
  tally: {
    enabled: true,
    autoGenerateOnProgramCreate: false,
    defaultExpectedAttendance: 50,
    codePrefix: 'T',
    codePadding: 3,
    allowReuseAcrossPrograms: false,
  },
  notifications: {
    newFirstTimeGuest: {
      enabled: true,
      notifyRoles: ['ADMIN', 'SUPERVISOR', 'RM'],
    },
    guestReadyForPromotion: {
      enabled: true,
      notifyRoles: ['ADMIN', 'SUPERVISOR'],
    },
    followUpAssigned: {
      enabled: true,
      notifyRoles: ['RM'],
    },
    followUpOverdue: {
      enabled: true,
      notifyRoles: ['ADMIN', 'SUPERVISOR', 'RM'],
    },
    upcomingBirthday: {
      enabled: true,
      notifyRoles: ['RM'],
    },
  },
  ui: {
    theme: 'system',
    primaryColor: '#0f172a', // keep aligned with your Tailwind primary
    accentColor: '#f97316',  // keep aligned with your accent
  },
  systemInfo: {
    churchName: 'Your Church Name',
    timezone: 'Africa/Lagos',
    contactEmail: '',
    contactPhone: '',
  },
};

// ---- Internal helpers -------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

function createEmptyDatabaseState(): DatabaseState {
  const timestamp = nowIso();
  return {
    people: [],
    programs: [],
    attendance: [],
    tallies: [],
    followUps: [],
    followUpActions: [],
    broadcasts: [],
    broadcastRecipientLogs: [],
    notifications: [],
    messageTemplates: [],
    users: [],
    config: defaultSystemConfig,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function loadState(): DatabaseState {
  const state = getItem<DatabaseState | null>(DB_STORAGE_KEY, null);
  if (!state) {
    const fresh = createEmptyDatabaseState();
    setItem(DB_STORAGE_KEY, fresh);
    return fresh;
  }

  // Ensure config is present (in case of older version)
  if (!state.config) {
    state.config = defaultSystemConfig;
  }

  return state;
}

function saveState(mutated: DatabaseState): void {
  mutated.updatedAt = nowIso();
  setItem(DB_STORAGE_KEY, mutated);
}

// ---- Public API -------------------------------------------------------------
//
// NOTE: These are synchronous because localStorage is synchronous. In practice
// they will be wrapped by async services if/when calling serverless APIs.
//

export function getDatabaseSnapshot(): DatabaseState {
  return loadState();
}

// ---- People -----------------------------------------------------------------

export function getPeople(): Person[] {
  return loadState().people;
}

export function savePeople(people: Person[]): void {
  const state = loadState();
  state.people = people;
  saveState(state);
}

export function upsertPerson(person: Person): void {
  const state = loadState();
  const idx = state.people.findIndex((p) => p.id === person.id);
  if (idx === -1) {
    state.people.push(person);
  } else {
    state.people[idx] = person;
  }
  saveState(state);
}

export function deletePerson(personId: string): void {
  const state = loadState();
  state.people = state.people.filter((p) => p.id !== personId);
  saveState(state);
}

// ---- Programs ---------------------------------------------------------------

export function getPrograms(): Program[] {
  return loadState().programs;
}

export function savePrograms(programs: Program[]): void {
  const state = loadState();
  state.programs = programs;
  saveState(state);
}

export function upsertProgram(program: Program): void {
  const state = loadState();
  const idx = state.programs.findIndex((p) => p.id === program.id);
  if (idx === -1) {
    state.programs.push(program);
  } else {
    state.programs[idx] = program;
  }
  saveState(state);
}

export function deleteProgram(programId: string): void {
  const state = loadState();
  state.programs = state.programs.filter((p) => p.id !== programId);
  saveState(state);
}

// ---- Attendance -------------------------------------------------------------

export function getAttendanceRecords(): AttendanceRecord[] {
  return loadState().attendance;
}

export function saveAttendanceRecords(records: AttendanceRecord[]): void {
  const state = loadState();
  state.attendance = records;
  saveState(state);
}

export function upsertAttendanceRecord(record: AttendanceRecord): void {
  const state = loadState();
  const idx = state.attendance.findIndex((r) => r.id === record.id);
  if (idx === -1) {
    state.attendance.push(record);
  } else {
    state.attendance[idx] = record;
  }
  saveState(state);
}

// ---- Tallies ---------------------------------------------------------------

export function getTallies(): Tally[] {
  return loadState().tallies;
}

export function saveTallies(tallies: Tally[]): void {
  const state = loadState();
  state.tallies = tallies;
  saveState(state);
}

export function upsertTally(tally: Tally): void {
  const state = loadState();
  const idx = state.tallies.findIndex((t) => t.id === tally.id);
  if (idx === -1) {
    state.tallies.push(tally);
  } else {
    state.tallies[idx] = tally;
  }
  saveState(state);
}

// ---- Follow-ups ------------------------------------------------------------

export function getFollowUps(): FollowUp[] {
  return loadState().followUps;
}

export function saveFollowUps(followUps: FollowUp[]): void {
  const state = loadState();
  state.followUps = followUps;
  saveState(state);
}

export function upsertFollowUp(followUp: FollowUp): void {
  const state = loadState();
  const idx = state.followUps.findIndex((f) => f.id === followUp.id);
  if (idx === -1) {
    state.followUps.push(followUp);
  } else {
    state.followUps[idx] = followUp;
  }
  saveState(state);
}

export function getFollowUpActions(): FollowUpActionLogEntry[] {
  return loadState().followUpActions;
}

export function saveFollowUpActions(entries: FollowUpActionLogEntry[]): void {
  const state = loadState();
  state.followUpActions = entries;
  saveState(state);
}

export function addFollowUpAction(entry: FollowUpActionLogEntry): void {
  const state = loadState();
  state.followUpActions.push(entry);
  saveState(state);
}

// ---- Broadcasts ------------------------------------------------------------

export function getBroadcasts(): Broadcast[] {
  return loadState().broadcasts;
}

export function saveBroadcasts(broadcasts: Broadcast[]): void {
  const state = loadState();
  state.broadcasts = broadcasts;
  saveState(state);
}

export function upsertBroadcast(broadcast: Broadcast): void {
  const state = loadState();
  const idx = state.broadcasts.findIndex((b) => b.id === broadcast.id);
  if (idx === -1) {
    state.broadcasts.push(broadcast);
  } else {
    state.broadcasts[idx] = broadcast;
  }
  saveState(state);
}

export function getBroadcastRecipientLogs(): BroadcastRecipientLog[] {
  return loadState().broadcastRecipientLogs;
}

export function saveBroadcastRecipientLogs(logs: BroadcastRecipientLog[]): void {
  const state = loadState();
  state.broadcastRecipientLogs = logs;
  saveState(state);
}

export function addBroadcastRecipientLog(log: BroadcastRecipientLog): void {
  const state = loadState();
  state.broadcastRecipientLogs.push(log);
  saveState(state);
}

// ---- Notifications ----------------------------------------------------------

export function getNotifications(): Notification[] {
  return loadState().notifications;
}

export function saveNotifications(notifications: Notification[]): void {
  const state = loadState();
  state.notifications = notifications;
  saveState(state);
}

export function upsertNotification(notification: Notification): void {
  const state = loadState();
  const idx = state.notifications.findIndex((n) => n.id === notification.id);
  if (idx === -1) {
    state.notifications.push(notification);
  } else {
    state.notifications[idx] = notification;
  }
  saveState(state);
}

export function deleteNotification(notificationId: string): void {
  const state = loadState();
  state.notifications = state.notifications.filter((n) => n.id !== notificationId);
  saveState(state);
}

// ---- Message Templates ------------------------------------------------------

export function getMessageTemplates(): MessageTemplate[] {
  return loadState().messageTemplates;
}

export function saveMessageTemplates(templates: MessageTemplate[]): void {
  const state = loadState();
  state.messageTemplates = templates;
  saveState(state);
}

export function upsertMessageTemplate(template: MessageTemplate): void {
  const state = loadState();
  const idx = state.messageTemplates.findIndex((t) => t.id === template.id);
  if (idx === -1) {
    state.messageTemplates.push(template);
  } else {
    state.messageTemplates[idx] = template;
  }
  saveState(state);
}

// ---- Users ------------------------------------------------------------------

export function getUsers(): User[] {
  return loadState().users;
}

export function saveUsers(users: User[]): void {
  const state = loadState();
  state.users = users;
  saveState(state);
}

export function upsertUser(user: User): void {
  const state = loadState();
  const idx = state.users.findIndex((u) => u.id === user.id);
  if (idx === -1) {
    state.users.push(user);
  } else {
    state.users[idx] = user;
  }
  saveState(state);
}

// ---- SystemConfig -----------------------------------------------------------

export function getSystemConfig(): SystemConfig {
  const state = loadState();
  if (!state.config) {
    state.config = defaultSystemConfig;
    saveState(state);
  }
  return state.config;
}

export function saveSystemConfig(config: SystemConfig): void {
  const state = loadState();
  state.config = config;
  saveState(state);
}
