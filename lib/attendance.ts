'use client';

import {
  getAttendanceRecords,
  saveAttendanceRecords,
  getPrograms,
  getPeople,
  getSystemConfig,
} from './database';

import { applyAttendanceToPerson } from './people';

import type {
  AttendanceRecord,
  AttendanceStatus,
  AbsenteeDetectionResult,
  Program,
  Person,
  AttendanceScope,
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

export interface MarkAttendanceOptions {
  personId: string;
  programId: string;
  present: boolean;
  checkInTimeIso?: string;
  recordedByUserId: string;
}

/**
 * Create or update an attendance record for a single person & program,
 * and apply its effect to the person's evolution state.
 */
export function markAttendanceForPerson(options: MarkAttendanceOptions): AttendanceRecord {
  const records = getAttendanceRecords();
  const existingIndex = records.findIndex(
    (r) => r.personId === options.personId && r.programId === options.programId
  );

  const status: AttendanceStatus = options.present ? 'present' : 'absent';
  const now = nowIso();

  let record: AttendanceRecord;
  if (existingIndex === -1) {
    record = {
      id: generateId('att'),
      personId: options.personId,
      programId: options.programId,
      status,
      checkInTime: options.checkInTimeIso,
      recordedByUserId: options.recordedByUserId,
      recordedAt: now,
    };
    records.push(record);
  } else {
    const existing = records[existingIndex];
    record = {
      ...existing,
      status,
      checkInTime: options.checkInTimeIso ?? existing.checkInTime,
      recordedByUserId: options.recordedByUserId,
      recordedAt: now,
    };
    records[existingIndex] = record;
  }

  saveAttendanceRecords(records);

  // Update Person evolution state
  applyAttendanceToPerson({
    personId: options.personId,
    programId: options.programId,
    dateIso: getProgramDateIso(options.programId) ?? now,
    present: options.present,
  });

  return record;
}

export interface BulkMarkAttendanceInput {
  programId: string;
  recordedByUserId: string;
  entries: Array<{
    personId: string;
    present: boolean;
    checkInTimeIso?: string;
  }>;
}

/**
 * Mark attendance for many people in a single program.
 */
export function bulkMarkAttendanceForProgram(input: BulkMarkAttendanceInput): AttendanceRecord[] {
  const updated: AttendanceRecord[] = [];

  for (const entry of input.entries) {
    const record = markAttendanceForPerson({
      personId: entry.personId,
      programId: input.programId,
      present: entry.present,
      checkInTimeIso: entry.checkInTimeIso,
      recordedByUserId: input.recordedByUserId,
    });
    updated.push(record);
  }

  return updated;
}

// ---- Absentee detection -----------------------------------------------------

function getProgramDateIso(programId: string): string | undefined {
  const program = getPrograms().find((p) => p.id === programId);
  return program?.date;
}

function parseIsoDate(dateStr: string): Date | null {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function filterProgramsInRange(programs: Program[], fromDateIso: string, toDateIso: string): Program[] {
  const from = parseIsoDate(fromDateIso);
  const to = parseIsoDate(toDateIso);
  if (!from || !to) return [];

  return programs.filter((p) => {
    const d = parseIsoDate(p.date);
    if (!d) return false;
    return d >= from && d <= to;
  });
}

function getExpectedPeople(scope: AttendanceScope, trackWorkersOnly: boolean): Person[] {
  const people = getPeople();
  return people.filter((person) => {
    if (trackWorkersOnly && !person.engagement.isWorker) {
      return false;
    }

    if (scope === 'all') return true;

    if (scope === 'members-only') {
      return person.category === 'member';
    }

    if (scope === 'guests-only') {
      return person.category === 'guest';
    }

    if (scope === 'members-and-regular-guests') {
      if (person.category === 'member') return true;
      if (
        person.category === 'guest' &&
        person.evolution.guestType === 'regular'
      ) {
        return true;
      }
      return false;
    }

    return true;
  });
}

/**
 * Detect absentees between fromDateIso and toDateIso (inclusive),
 * based on SystemConfig.attendance.defaultScope and followUp.absenteeRule.
 */
export function detectAbsenteesInRange(fromDateIso: string, toDateIso: string): AbsenteeDetectionResult[] {
  const config = getSystemConfig();
  const attendanceScope = config.attendance.defaultScope;
  const trackWorkersOnly = config.attendance.trackWorkersOnly;
  const absenteeRule = config.followUp.absenteeRule;

  if (!absenteeRule.enabled) {
    return [];
  }

  const allPrograms = getPrograms();
  const relevantPrograms = filterProgramsInRange(allPrograms, fromDateIso, toDateIso);

  const considerTypes = config.evolution.considerProgramsOfType;
  const filteredPrograms = considerTypes && considerTypes.length > 0
    ? relevantPrograms.filter((p) => considerTypes.includes(p.type))
    : relevantPrograms;

  if (!filteredPrograms.length) {
    return [];
  }

  const attendance = getAttendanceRecords();
  const expectedPeople = getExpectedPeople(attendanceScope, trackWorkersOnly);

  const results: AbsenteeDetectionResult[] = [];

  for (const person of expectedPeople) {
    const missedProgramIds: string[] = [];

    for (const program of filteredPrograms) {
      const hasPresentRecord = attendance.some(
        (r) =>
          r.programId === program.id &&
          r.personId === person.id &&
          r.status === 'present'
      );
      if (!hasPresentRecord) {
        missedProgramIds.push(program.id);
      }
    }

    if (missedProgramIds.length >= absenteeRule.missedProgramsCount) {
      results.push({
        personId: person.id,
        missedProgramIds,
        fromDate: fromDateIso,
        toDate: toDateIso,
      });
    }
  }

  return results;
}

/**
 * Detect absentees in the configured window (followUp.absenteeRule.withinDays)
 * ending "today".
 */
export function detectAbsenteesForConfiguredWindow(): AbsenteeDetectionResult[] {
  const config = getSystemConfig();
  const absenteeRule = config.followUp.absenteeRule;
  if (!absenteeRule.enabled) return [];

  const now = new Date();
  const toIso = now.toISOString();

  const from = new Date(now);
  from.setDate(now.getDate() - absenteeRule.withinDays);
  const fromIso = from.toISOString();

  return detectAbsenteesInRange(fromIso, toIso);
}
