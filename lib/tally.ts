'use client';

import { nanoid } from 'nanoid';
import { getSystemConfig } from './config';
import { markAttendance } from './attendance';

import type {
  Tally,
  TallyStatus,
  TallyCheckInSource,
  Program,
  SystemConfig,
  AttendanceRecord,
} from '@/types';

const STORAGE_KEY = 'church-crm:tallies';

let inMemoryTallies: Tally[] = [];

/* -------------------------------------------------------------------------- */
/*  Storage helpers                                                           */
/* -------------------------------------------------------------------------- */

function loadTallies(): Tally[] {
  if (typeof window === 'undefined') {
    return inMemoryTallies;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      inMemoryTallies = [];
      return inMemoryTallies;
    }
    const parsed = JSON.parse(raw) as Tally[];
    if (!Array.isArray(parsed)) {
      inMemoryTallies = [];
      return inMemoryTallies;
    }
    inMemoryTallies = parsed;
    return inMemoryTallies;
  } catch {
    inMemoryTallies = [];
    return inMemoryTallies;
  }
}

function saveTallies(list: Tally[]): void {
  inMemoryTallies = list;
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // best-effort
  }
}

/* -------------------------------------------------------------------------- */
/*  Public getters                                                            */
/* -------------------------------------------------------------------------- */

export function getAllTallies(): Tally[] {
  return loadTallies();
}

export function getTalliesForProgram(programId: string): Tally[] {
  return loadTallies()
    .filter((t) => t.programId === programId)
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function getTallyByProgramAndCode(
  programId: string,
  code: string,
): Tally | undefined {
  return loadTallies().find(
    (t) => t.programId === programId && t.code.toUpperCase() === code.toUpperCase(),
  );
}

/* -------------------------------------------------------------------------- */
/*  Generation                                                                */
/* -------------------------------------------------------------------------- */

export interface GenerateTalliesInput {
  programId: string;
  /**
   * How many tallies to have in total for this program.
   * If tallies already exist, only the missing count will be created.
   */
  expectedCount: number;
}

/**
 * Ensure that a program has at least expectedCount tallies.
 * Uses SystemConfig.tally for prefix and padding.
 */
export function generateTalliesForProgram(
  input: GenerateTalliesInput,
): Tally[] {
  const cfg: SystemConfig = getSystemConfig();
  const tallyCfg = cfg.tally;

  if (!tallyCfg.enabled) {
    return [];
  }

  const prefix = tallyCfg.codePrefix || 'T';
  const padding = tallyCfg.codePadding ?? 3;

  const list = loadTallies();
  const existing = list.filter((t) => t.programId === input.programId);
  const existingCount = existing.length;

  if (existingCount >= input.expectedCount) {
    return existing.sort((a, b) => a.code.localeCompare(b.code));
  }

  const now = new Date().toISOString();
  const newTallies: Tally[] = [];
  const startIndex = existingCount + 1;

  for (let i = startIndex; i <= input.expectedCount; i++) {
    const seq = i.toString().padStart(padding, '0');
    const code = `${prefix}${seq}`;

    const tally: Tally = {
      id: nanoid(),
      programId: input.programId,
      code,
      status: 'available',
      createdAt: now,
      updatedAt: now,
    };

    list.push(tally);
    newTallies.push(tally);
  }

  saveTallies(list);

  return existing.concat(newTallies).sort((a, b) => a.code.localeCompare(b.code));
}

/* -------------------------------------------------------------------------- */
/*  Issuance (gate)                                                           */
/* -------------------------------------------------------------------------- */

export interface IssueTallyInput {
  programId: string;
  /**
   * Optional specific code. If omitted, the next available tally is used.
   */
  code?: string;
  issuedByUserId: string;
  /**
   * Optional person if the RM already knows the profile at the gate.
   * If present, we immediately map the tally to that person and mark attendance.
   */
  personId?: string;
  /**
   * Source of check-in when personId is provided at issuance time.
   */
  checkInSource?: TallyCheckInSource;
}

/**
 * Issue a tally at the gate. This is the TRUE arrival event.
 * - Sets issuedAt
 * - Sets status = 'issued'
 * - If personId is provided, also maps the tally and marks attendance.
 */
export function issueTally(input: IssueTallyInput): Tally {
  const cfg = getSystemConfig();
  const tallyCfg = cfg.tally;

  if (!tallyCfg.enabled) {
    throw new Error('Tally system is disabled in SystemConfig.');
  }

  const now = new Date().toISOString();
  const list = loadTallies();

  let tally: Tally | undefined;

  if (input.code) {
    tally = list.find(
      (t) =>
        t.programId === input.programId &&
        t.code.toUpperCase() === input.code!.toUpperCase(),
    );
    if (!tally) {
      throw new Error(`No tally with code ${input.code} for this program.`);
    }
    if (tally.status !== 'available') {
      throw new Error(`Tally ${input.code} is not available for issuance.`);
    }
  } else {
    tally = list
      .filter((t) => t.programId === input.programId && t.status === 'available')
      .sort((a, b) => a.code.localeCompare(b.code))[0];

    if (!tally) {
      throw new Error('No available tallies left to issue for this program.');
    }
  }

  const idx = list.findIndex((t) => t.id === tally!.id);

  const updated: Tally = {
    ...tally!,
    status: 'issued',
    issuedAt: now,
    issuedByUserId: input.issuedByUserId,
    updatedAt: now,
  };

  // If we already know the person at the gate, map immediately
  if (input.personId) {
    updated.personId = input.personId;
    updated.mappedAt = now;
    updated.checkInSource = input.checkInSource ?? 'rm';

    // Create attendance with the TRUE arrival time (issuedAt)
    markAttendance({
      programId: input.programId,
      personId: input.personId,
      status: 'present',
      timestamp: updated.issuedAt,
      markedByUserId: input.issuedByUserId,
      tallyId: updated.id,
    } as any);
  }

  list[idx] = updated;
  saveTallies(list);

  return updated;
}

/**
 * Convenience wrapper to always use next available tally.
 */
export function issueNextAvailableTally(
  programId: string,
  issuedByUserId: string,
  personId?: string,
  checkInSource?: TallyCheckInSource,
): Tally {
  return issueTally({
    programId,
    issuedByUserId,
    personId,
    checkInSource,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mapping (check-in / self-service / admin-side)                            */
/* -------------------------------------------------------------------------- */

export interface MapTallyToPersonInput {
  programId: string;
  code: string;
  personId: string;
  source: TallyCheckInSource;
}

/**
 * Map an issued tally to a person profile.
 * This step does NOT change arrival time, it only attaches the event to a person.
 * Attendance is created if not already present for that (program, person).
 */
export function mapTallyToPerson(
  input: MapTallyToPersonInput,
): Tally {
  const list = loadTallies();
  const tally = list.find(
    (t) =>
      t.programId === input.programId &&
      t.code.toUpperCase() === input.code.toUpperCase(),
  );

  if (!tally) {
    throw new Error(`No tally with code ${input.code} for this program.`);
  }

  if (tally.status !== 'issued' && tally.status !== 'logged') {
    throw new Error(`Tally ${input.code} cannot be mapped (status: ${tally.status}).`);
  }

  const now = new Date().toISOString();
  const issuedAt = tally.issuedAt ?? now;

  const updated: Tally = {
    ...tally,
    personId: input.personId,
    mappedAt: now,
    checkInSource: input.source,
    updatedAt: now,
  };

  // Optionally set status to "logged" to indicate it has been used
  if (updated.status === 'issued') {
    updated.status = 'logged';
  }

  // Create attendance if not already present for that (program, person).
  // markAttendance will upsert based on (programId, personId).
  markAttendance({
    programId: input.programId,
    personId: input.personId,
    status: 'present',
    timestamp: issuedAt,
    markedByUserId: input.source === 'self-service' ? 'self-service' : 'system',
    tallyId: updated.id,
  } as any);

  const idx = list.findIndex((t) => t.id === tally.id);
  list[idx] = updated;
  saveTallies(list);

  return updated;
}

/* -------------------------------------------------------------------------- */
/*  Reports                                                                   */
/* -------------------------------------------------------------------------- */

import type { TallyProgramStats, TallyArrivalBucket } from '@/types';

export function getProgramTallyStats(programId: string): TallyProgramStats {
  const tallies = getTalliesForProgram(programId);

  let issuedCount = 0;
  let mappedCount = 0;
  let voidCount = 0;

  for (const t of tallies) {
    if (t.status === 'issued' || t.status === 'logged') {
      issuedCount += 1;
    }
    if (t.personId) {
      mappedCount += 1;
    }
    if (t.status === 'void') {
      voidCount += 1;
    }
  }

  return {
    programId,
    totalTallies: tallies.length,
    issuedCount,
    mappedCount,
    voidCount,
  };
}

/**
 * A simple arrival pattern bucketed by hour of day from issuedAt.
 * It does not depend on program start time (keeps it generic and robust).
 */
export function getProgramArrivalBuckets(
  programId: string,
): TallyArrivalBucket[] {
  const tallies = getTalliesForProgram(programId).filter((t) => t.issuedAt);

  const bucketsMap = new Map<string, number>();

  for (const t of tallies) {
    const d = new Date(t.issuedAt!);
    if (Number.isNaN(d.getTime())) continue;

    const hour = d.getHours().toString().padStart(2, '0');
    const label = `${hour}:00 – ${hour}:59`;

    bucketsMap.set(label, (bucketsMap.get(label) ?? 0) + 1);
  }

  const buckets: TallyArrivalBucket[] = Array.from(bucketsMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }));

  return buckets;
}
