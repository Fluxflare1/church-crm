'use client';

import {
  getTallies as dbGetTallies,
  saveTallies as dbSaveTallies,
  upsertTally as dbUpsertTally,
  getPrograms,
  getSystemConfig,
} from './database';

import type { Tally, TallyStatus, TallyGenerationResult, TallyReport, TallyArrivalBucket, Program } from '@/types';

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function padNumber(num: number, padding: number): string {
  const s = String(num);
  if (s.length >= padding) return s;
  return '0'.repeat(padding - s.length) + s;
}

function getProgram(programId: string): Program | undefined {
  return getPrograms().find((p) => p.id === programId);
}

export function getTalliesForProgram(programId: string): Tally[] {
  return dbGetTallies().filter((t) => t.programId === programId);
}

/**
 * Generate a batch of tallies for a specific program.
 * Unlimited count (bounded only by practical storage limits).
 */
export function generateTalliesForProgram(options: {
  programId: string;
  count?: number;
}): { tallies: Tally[]; summary: TallyGenerationResult } {
  const program = getProgram(options.programId);
  if (!program) {
    throw new Error('Program not found.');
  }

  const config = getSystemConfig();
  const existing = getTalliesForProgram(options.programId);
  const startingIndex = existing.length + 1;

  const count = options.count ?? program.expectedAttendance ?? config.tally.defaultExpectedAttendance;
  if (count <= 0) {
    throw new Error('Tally count must be greater than zero.');
  }

  const tallies: Tally[] = [];
  const allTallies = dbGetTallies();
  const now = nowIso();

  for (let i = 0; i < count; i++) {
    const serial = startingIndex + i;
    const code = `${config.tally.codePrefix}${padNumber(serial, config.tally.codePadding)}`;

    const tally: Tally = {
      id: generateId('tally'),
      code,
      programId: options.programId,
      status: 'available',
      issuedToPersonId: undefined,
      issuedAt: undefined,
      issuedByUserId: undefined,
      loggedAt: undefined,
      loggedByUserId: undefined,
      createdAt: now,
      updatedAt: now,
    };

    tallies.push(tally);
    allTallies.push(tally);
  }

  dbSaveTallies(allTallies);

  const summary: TallyGenerationResult = {
    programId: options.programId,
    fromCode: tallies[0].code,
    toCode: tallies[tallies.length - 1].code,
    count: tallies.length,
  };

  return { tallies, summary };
}

function findAvailableTally(programId: string): Tally | undefined {
  return dbGetTallies().find(
    (t) => t.programId === programId && t.status === 'available'
  );
}

function findTallyByCode(programId: string, code: string): Tally | undefined {
  return dbGetTallies().find(
    (t) => t.programId === programId && t.code === code
  );
}

export interface IssueTallyOptions {
  programId: string;
  personId: string;
  issuedByUserId: string;
  issuedAtIso?: string;
  code?: string; // if specified, use that code; otherwise first available
}

/**
 * Issue a tally (check-in) to a person.
 * Tracks arrival time in issuedAt.
 */
export function issueTallyToPerson(options: IssueTallyOptions): Tally {
  const now = nowIso();
  const allTallies = dbGetTallies();

  let tally: Tally | undefined;
  if (options.code) {
    tally = findTallyByCode(options.programId, options.code);
  } else {
    tally = findAvailableTally(options.programId);
  }

  if (!tally) {
    throw new Error('No available tally for this program.');
  }

  const idx = allTallies.findIndex((t) => t.id === tally!.id);
  if (idx === -1) {
    throw new Error('Tally not found in storage.');
  }

  const updated: Tally = {
    ...tally,
    status: 'issued',
    issuedToPersonId: options.personId,
    issuedAt: options.issuedAtIso ?? now,
    issuedByUserId: options.issuedByUserId,
    updatedAt: now,
  };

  allTallies[idx] = updated;
  dbSaveTallies(allTallies);

  return updated;
}

export interface LogTallyOptions {
  programId: string;
  code: string;
  loggedByUserId: string;
  loggedAtIso?: string;
}

/**
 * Log a tally (e.g. when validated or collected).
 */
export function logTally(options: LogTallyOptions): Tally {
  const now = nowIso();
  const allTallies = dbGetTallies();
  const tallyIndex = allTallies.findIndex(
    (t) => t.programId === options.programId && t.code === options.code
  );

  if (tallyIndex === -1) {
    throw new Error('Tally not found.');
  }

  const tally = allTallies[tallyIndex];

  const updatedStatus: TallyStatus =
    tally.status === 'available' ? 'logged' : 'logged';

  const updated: Tally = {
    ...tally,
    status: updatedStatus,
    loggedAt: options.loggedAtIso ?? now,
    loggedByUserId: options.loggedByUserId,
    updatedAt: now,
  };

  allTallies[tallyIndex] = updated;
  dbSaveTallies(allTallies);

  return updated;
}

/**
 * Mark a tally as void.
 */
export function voidTally(tallyId: string): Tally {
  const allTallies = dbGetTallies();
  const idx = allTallies.findIndex((t) => t.id === tallyId);
  if (idx === -1) {
    throw new Error('Tally not found.');
  }

  const now = nowIso();
  const tally = allTallies[idx];

  const updated: Tally = {
    ...tally,
    status: 'void',
    updatedAt: now,
  };

  allTallies[idx] = updated;
  dbSaveTallies(allTallies);

  return updated;
}

// ---- Reports ----------------------------------------------------------------

function parseProgramDateTime(program: Program, timeIso: string): { programTime: Date; checkIn: Date } | null {
  const programDate = new Date(program.date);
  if (Number.isNaN(programDate.getTime())) return null;

  const [hh, mm] = program.startTime.split(':');
  if (hh === undefined || mm === undefined) return null;

  programDate.setHours(Number(hh), Number(mm), 0, 0);

  const checkIn = new Date(timeIso);
  if (Number.isNaN(checkIn.getTime())) return null;

  return { programTime: programDate, checkIn };
}

function computeMinutesDifference(program: Program, tally: Tally): number | null {
  if (!tally.issuedAt) return null;

  const parsed = parseProgramDateTime(program, tally.issuedAt);
  if (!parsed) return null;

  const diffMs = parsed.checkIn.getTime() - parsed.programTime.getTime();
  return diffMs / (1000 * 60); // minutes
}

function bucketizeArrival(program: Program, tallies: Tally[]): TallyArrivalBucket[] {
  const buckets: Record<string, number> = {
    'On Time': 0,
    '0–10 min late': 0,
    '11–20 min late': 0,
    '>20 min late': 0,
  };

  for (const t of tallies) {
    const minutes = computeMinutesDifference(program, t);
    if (minutes === null) continue;

    if (minutes <= 0) {
      buckets['On Time'] += 1;
    } else if (minutes > 0 && minutes <= 10) {
      buckets['0–10 min late'] += 1;
    } else if (minutes > 10 && minutes <= 20) {
      buckets['11–20 min late'] += 1;
    } else {
      buckets['>20 min late'] += 1;
    }
  }

  return Object.entries(buckets).map<TallyArrivalBucket>(([label, count]) => ({
    label,
    count,
  }));
}

/**
 * Compute tally report for a program: totals and arrival buckets.
 */
export function getTallyReportForProgram(programId: string): TallyReport {
  const program = getProgram(programId);
  if (!program) {
    throw new Error('Program not found.');
  }

  const tallies = getTalliesForProgram(programId);
  const totalTallies = tallies.length;
  const issuedCount = tallies.filter((t) => t.status === 'issued' || t.status === 'logged').length;
  const loggedCount = tallies.filter((t) => t.status === 'logged').length;
  const arrivalBuckets = bucketizeArrival(program, tallies);

  const report: TallyReport = {
    programId,
    totalTallies,
    issuedCount,
    loggedCount,
    arrivalBuckets,
    generatedAt: nowIso(),
  };

  return report;
}
