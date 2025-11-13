'use client';

import {
  getFollowUps as dbGetFollowUps,
  saveFollowUps as dbSaveFollowUps,
  addFollowUpAction as dbAddFollowUpAction,
  getFollowUpActions as dbGetFollowUpActions,
  getSystemConfig,
  getUsers,
  getPeople,
} from './database';

import { detectAbsenteesForConfiguredWindow } from './attendance';

import type {
  FollowUp,
  FollowUpStatus,
  FollowUpPriority,
  FollowUpChannel,
  FollowUpActionLogEntry,
  Person,
  User,
} from '@/types';

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export interface CreateFollowUpInput {
  personId: string;
  type: string;                       // "new-guest", "returning-guest", "absentee", "birthday", etc.
  priority: FollowUpPriority;
  dueInHours: number;
  createdByUserId: string;
  preferredChannel?: FollowUpChannel;
  notes?: string;
}

export interface UpdateFollowUpStatusInput {
  followUpId: string;
  status: FollowUpStatus;
  completedAtIso?: string;
}

// ---- Helpers: users & assignment --------------------------------------------

function getActiveRms(): User[] {
  return getUsers().filter(
    (u) => u.isActive && u.roles.includes('RM')
  );
}

/**
 * Assign according to SystemConfig.followUp.assignment.
 * - round-robin: hash-based distribution using personId
 * - fixed-rm: use defaultRmUserId if set
 * - by-cell: try Person.assignment.primaryRmUserId first
 * - none: returns undefined
 */
function chooseAssignedUserId(person: Person): string | undefined {
  const config = getSystemConfig();
  const assignmentConfig = config.followUp.assignment;
  const mode = assignmentConfig.defaultAssignmentMode;

  const rms = getActiveRms();
  if (!rms.length) return undefined;

  if (mode === 'fixed-rm' && assignmentConfig.defaultRmUserId) {
    const exists = rms.some((u) => u.id === assignmentConfig.defaultRmUserId);
    return exists ? assignmentConfig.defaultRmUserId : rms[0].id;
  }

  if (mode === 'by-cell') {
    if (person.assignment.primaryRmUserId) {
      const candidate = rms.find((u) => u.id === person.assignment.primaryRmUserId);
      if (candidate) return candidate.id;
    }
    return rms[0].id;
  }

  if (mode === 'round-robin') {
    const hash = Math.abs(hashString(person.id));
    const index = hash % rms.length;
    return rms[index].id;
  }

  // mode === 'none'
  return undefined;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}

// ---- Core CRUD --------------------------------------------------------------

export function getAllFollowUps(): FollowUp[] {
  return dbGetFollowUps();
}

export function getFollowUpById(followUpId: string): FollowUp | undefined {
  return dbGetFollowUps().find((f) => f.id === followUpId);
}

export function getOpenFollowUps(): FollowUp[] {
  return dbGetFollowUps().filter(
    (f) => f.status === 'open' || f.status === 'in-progress'
  );
}

export function createFollowUp(input: CreateFollowUpInput): FollowUp {
  const people = getPeople();
  const person = people.find((p) => p.id === input.personId);
  if (!person) {
    throw new Error('Person not found.');
  }

  const now = nowIso();
  const dueDate = computeDueDate(now, input.dueInHours);

  const assignedToUserId = chooseAssignedUserId(person);

  const followUp: FollowUp = {
    id: generateId('fu'),
    personId: input.personId,
    type: input.type,
    priority: input.priority,
    status: 'open',
    dueDate,
    completedAt: undefined,
    createdAt: now,
    createdByUserId: input.createdByUserId,
    assignedToUserId,
    preferredChannel: input.preferredChannel,
    notes: input.notes ?? '',
  };

  const all = dbGetFollowUps();
  all.push(followUp);
  dbSaveFollowUps(all);

  return followUp;
}

export function updateFollowUpStatus(input: UpdateFollowUpStatusInput): FollowUp | null {
  const all = dbGetFollowUps();
  const idx = all.findIndex((f) => f.id === input.followUpId);
  if (idx === -1) return null;

  const now = nowIso();
  const existing = all[idx];

  const updated: FollowUp = {
    ...existing,
    status: input.status,
    completedAt:
      input.status === 'completed'
        ? input.completedAtIso ?? now
        : existing.completedAt,
  };

  all[idx] = updated;
  dbSaveFollowUps(all);

  return updated;
}

// ---- Follow-up action logs --------------------------------------------------

export interface LogFollowUpActionInput {
  followUpId: string;
  channel: FollowUpChannel;
  outcome: string;
  createdByUserId: string;
}

export function logFollowUpAction(input: LogFollowUpActionInput): FollowUpActionLogEntry {
  const now = nowIso();

  const entry: FollowUpActionLogEntry = {
    id: generateId('fua'),
    followUpId: input.followUpId,
    timestamp: now,
    channel: input.channel,
    outcome: input.outcome,
    createdByUserId: input.createdByUserId,
  };

  dbAddFollowUpAction(entry);
  return entry;
}

export function getActionsForFollowUp(followUpId: string): FollowUpActionLogEntry[] {
  return dbGetFollowUpActions().filter((a) => a.followUpId === followUpId);
}

// ---- High-level helpers (new/returning/regular guest) -----------------------

export function createFollowUpForNewGuest(options: {
  personId: string;
  createdByUserId: string;
  notes?: string;
}): FollowUp {
  const config = getSystemConfig();
  const hours = config.followUp.timeframes.newGuestHours;

  return createFollowUp({
    personId: options.personId,
    type: 'new-guest',
    priority: 'high',
    dueInHours: hours,
    createdByUserId: options.createdByUserId,
    preferredChannel: 'whatsapp',
    notes: options.notes,
  });
}

export function createFollowUpForReturningGuest(options: {
  personId: string;
  createdByUserId: string;
  notes?: string;
}): FollowUp {
  const config = getSystemConfig();
  const hours = config.followUp.timeframes.returningGuestHours;

  return createFollowUp({
    personId: options.personId,
    type: 'returning-guest',
    priority: 'medium',
    dueInHours: hours,
    createdByUserId: options.createdByUserId,
    preferredChannel: 'whatsapp',
    notes: options.notes,
  });
}

export function createFollowUpForRegularGuest(options: {
  personId: string;
  createdByUserId: string;
  notes?: string;
}): FollowUp {
  const config = getSystemConfig();
  const hours = config.followUp.timeframes.regularGuestHours;

  return createFollowUp({
    personId: options.personId,
    type: 'regular-guest',
    priority: 'medium',
    dueInHours: hours,
    createdByUserId: options.createdByUserId,
    preferredChannel: 'whatsapp',
    notes: options.notes,
  });
}

// ---- Absentee auto follow-ups -----------------------------------------------

/**
 * Generate absentee follow-ups based on SystemConfig.followUp.absenteeRule
 * and detectAbsenteesForConfiguredWindow().
 *
 * It will NOT create duplicates for the same person & type if an open
 * absentee follow-up already exists.
 */
export function generateAbsenteeFollowUpsForConfiguredWindow(options: {
  createdByUserId: string;
}): FollowUp[] {
  const config = getSystemConfig();
  const absenteeRule = config.followUp.absenteeRule;
  if (!absenteeRule.enabled || !absenteeRule.createFollowUp) {
    return [];
  }

  const detections = detectAbsenteesForConfiguredWindow();
  if (!detections.length) return [];

  const allFollowUps = dbGetFollowUps();
  const created: FollowUp[] = [];

  for (const det of detections) {
    const personId = det.personId;

    const alreadyOpen = allFollowUps.some(
      (f) =>
        f.personId === personId &&
        f.type === absenteeRule.followUpType &&
        (f.status === 'open' || f.status === 'in-progress')
    );

    if (alreadyOpen) {
      continue;
    }

    const fu = createFollowUp({
      personId,
      type: absenteeRule.followUpType,
      priority: absenteeRule.followUpPriority,
      dueInHours: config.followUp.timeframes.absenteeHours,
      createdByUserId: options.createdByUserId,
      preferredChannel: 'whatsapp',
      notes: `Auto-created absentee follow-up for missed programs: ${det.missedProgramIds.join(
        ', '
      )}`,
    });

    created.push(fu);
  }

  return created;
}

// ---- Utilities --------------------------------------------------------------

function computeDueDate(fromIso: string, hours: number): string {
  const base = new Date(fromIso);
  if (Number.isNaN(base.getTime())) {
    return nowIso();
  }
  base.setHours(base.getHours() + hours);
  return base.toISOString();
}
