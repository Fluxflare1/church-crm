'use client';

import { nanoid } from 'nanoid';
import { getAllPeople } from './people';
import { getAllPrograms } from './programs';
import { getSystemConfig } from './config';
import { createAbsenteeFollowUps, AbsenteeDetected } from './follow-ups';
import { createNotificationForEvent } from './notifications';

import type {
  AttendanceRecord,
  AttendanceStatus,
  Person,
  Program,
  SystemConfig,
  FollowUp,
} from '@/types';

const STORAGE_KEY = 'church-crm:attendance';

let inMemoryAttendance: AttendanceRecord[] = [];

/* -------------------------------------------------------------------------- */
/*  Storage helpers                                                           */
/* -------------------------------------------------------------------------- */

function loadAttendance(): AttendanceRecord[] {
  if (typeof window === 'undefined') {
    return inMemoryAttendance;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      inMemoryAttendance = [];
      return inMemoryAttendance;
    }
    const parsed = JSON.parse(raw) as AttendanceRecord[];
    if (!Array.isArray(parsed)) {
      inMemoryAttendance = [];
      return inMemoryAttendance;
    }
    inMemoryAttendance = parsed;
    return inMemoryAttendance;
  } catch {
    inMemoryAttendance = [];
    return inMemoryAttendance;
  }
}

function saveAttendance(list: AttendanceRecord[]): void {
  inMemoryAttendance = list;
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // best-effort
  }
}

/* -------------------------------------------------------------------------- */
/*  Public API: basic attendance                                              */
/* -------------------------------------------------------------------------- */

export function getAllAttendanceRecords(): AttendanceRecord[] {
  return loadAttendance();
}

export function getAttendanceForProgram(programId: string): AttendanceRecord[] {
  return loadAttendance().filter((r) => r.programId === programId);
}

export function getAttendanceForPerson(personId: string): AttendanceRecord[] {
  return loadAttendance().filter((r) => r.personId === personId);
}

export interface MarkAttendanceInput {
  programId: string;
  personId: string;
  status: AttendanceStatus; // 'present' | 'absent' | 'excused' etc.
  timestamp?: string;
  markedByUserId: string;
  tallyId?: string;
}

/**
 * Mark or update a person’s attendance for a program.
 * Upserts based on (programId, personId).
 */
export function markAttendance(input: MarkAttendanceInput): AttendanceRecord {
  const now = new Date().toISOString();
  const ts = input.timestamp ?? now;

  const list = loadAttendance();
  const existingIndex = list.findIndex(
    (r) => r.programId === input.programId && r.personId === input.personId,
  );

  let record: AttendanceRecord;

  if (existingIndex >= 0) {
    record = {
      ...list[existingIndex],
      status: input.status,
      timestamp: ts,
      updatedAt: now,
      markedByUserId: input.markedByUserId,
      tallyId: input.tallyId ?? list[existingIndex].tallyId,
    };
    list[existingIndex] = record;
  } else {
    record = {
      id: nanoid(),
      programId: input.programId,
      personId: input.personId,
      status: input.status,
      timestamp: ts,
      createdAt: now,
      updatedAt: now,
      markedByUserId: input.markedByUserId,
      tallyId: input.tallyId,
    };
    list.push(record);
  }

  saveAttendance(list);
  return record;
}

/* -------------------------------------------------------------------------- */
/*  Absentee automation                                                       */
/* -------------------------------------------------------------------------- */

export interface AbsenteeAutomationResult {
  ruleEnabled: boolean;
  consideredProgramsCount: number;
  absenteesCount: number;
  followUpsCreated: number;
  details: AbsenteeDetected[];
}

/**
 * Run absentee detection over a window of days and create follow-ups
 * for people who have missed enough programs.
 *
 * Uses SystemConfig.followUp.absenteeRule.
 */
export function runAbsenteeAutomation(options?: {
  now?: Date;
  dryRun?: boolean;
  createdByUserId?: string;
}): AbsenteeAutomationResult {
  const now = options?.now ?? new Date();
  const createdByUserId = options?.createdByUserId ?? 'system';

  const cfg: SystemConfig = getSystemConfig();
  const rule = cfg.followUp.absenteeRule;

  if (!rule.enabled) {
    return {
      ruleEnabled: false,
      consideredProgramsCount: 0,
      absenteesCount: 0,
      followUpsCreated: 0,
      details: [],
    };
  }

  const allPrograms = getAllPrograms();
  const allAttendance = getAllAttendanceRecords();
  const allPeople = getAllPeople();

  const cutoff = new Date(
    now.getTime() - rule.withinDays * 24 * 60 * 60 * 1000,
  );

  const consideredProgramTypes = cfg.evolution.considerProgramsOfType;

  const relevantPrograms = allPrograms.filter((p) => {
    const date = new Date(p.date);
    if (Number.isNaN(date.getTime())) return false;
    if (date < cutoff || date > now) return false;
    if (consideredProgramTypes && consideredProgramTypes.length > 0) {
      return consideredProgramTypes.includes(p.type);
    }
    return true;
  });

  const consideredProgramIds = new Set(relevantPrograms.map((p) => p.id));

  const trackedPeople = allPeople.filter((person) =>
    isPersonTrackedByScope(person, rule.scope),
  );

  const attendanceByKey = new Map<string, AttendanceRecord>();
  for (const rec of allAttendance) {
    const key = `${rec.programId}:${rec.personId}`;
    attendanceByKey.set(key, rec);
  }

  const absentees: AbsenteeDetected[] = [];

  for (const person of trackedPeople) {
    const missedProgramIds: string[] = [];

    for (const programId of consideredProgramIds) {
      const key = `${programId}:${person.id}`;
      const rec = attendanceByKey.get(key);

      if (!rec) {
        missedProgramIds.push(programId);
      } else if (rec.status === 'absent') {
        missedProgramIds.push(programId);
      }
    }

    if (missedProgramIds.length >= rule.missedProgramsCount) {
      absentees.push({
        person,
        missedPrograms: missedProgramIds,
      });
    }
  }

  let followUpsCreated = 0;

  if (!options?.dryRun && absentees.length > 0 && rule.createFollowUp) {
    const created: FollowUp[] = createAbsenteeFollowUps(absentees, {
      createdByUserId,
    });
    followUpsCreated = created.length;

    for (const fu of created) {
      createNotificationForEvent('followUpAssigned', {
        title: fu.title,
        message:
          fu.description ??
          'A new absentee follow-up has been created and assigned.',
        personId: fu.personId,
        followUpId: fu.id,
        programId: fu.programId,
        severity: 'warning',
        meta: {
          reason: 'absentee',
        },
      });
    }
  }

  return {
    ruleEnabled: true,
    consideredProgramsCount: consideredProgramIds.size,
    absenteesCount: absentees.length,
    followUpsCreated,
    details: absentees,
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function isPersonTrackedByScope(
  person: Person,
  scope: SystemConfig['followUp']['absenteeRule']['scope'],
): boolean {
  switch (scope) {
    case 'all':
      return true;
    case 'members-only':
      return person.category === 'member';
    case 'guests-only':
      return person.category === 'guest';
    case 'members-and-regular-guests':
      if (person.category === 'member') return true;
      if (person.category === 'guest') {
        return person.evolution?.guestType === 'regular';
      }
      return false;
    default:
      return true;
  }
}
