'use client';

import { nanoid } from 'nanoid';
import { getSystemConfig } from './config';
import { generateTalliesForProgram } from './tally';

import type { Program, SystemConfig } from '@/types';

const STORAGE_KEY = 'church-crm:programs';

let inMemoryPrograms: Program[] = [];

/* -------------------------------------------------------------------------- */
/*  Storage helpers                                                           */
/* -------------------------------------------------------------------------- */

function loadPrograms(): Program[] {
  if (typeof window === 'undefined') {
    return inMemoryPrograms;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      inMemoryPrograms = [];
      return inMemoryPrograms;
    }
    const parsed = JSON.parse(raw) as Program[];
    if (!Array.isArray(parsed)) {
      inMemoryPrograms = [];
      return inMemoryPrograms;
    }
    inMemoryPrograms = parsed;
    return inMemoryPrograms;
  } catch {
    inMemoryPrograms = [];
    return inMemoryPrograms;
  }
}

function savePrograms(list: Program[]): void {
  inMemoryPrograms = list;
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // best-effort
  }
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export function getAllPrograms(): Program[] {
  return loadPrograms().sort((a, b) => a.date.localeCompare(b.date));
}

export function getProgramById(id: string): Program | undefined {
  return loadPrograms().find((p) => p.id === id);
}

export interface CreateProgramInput {
  name: string;
  type: string;
  date: string; // ISO date
  startTime?: string; // optional HH:mm
  location?: string;
  expectedAttendance?: number;
  description?: string;
}

/**
 * Create a program and optionally auto-generate tallies for it.
 */
export function createProgram(input: CreateProgramInput): Program {
  const now = new Date().toISOString();
  const cfg: SystemConfig = getSystemConfig();
  const tallyCfg = cfg.tally;

  const list = loadPrograms();

  const program: Program = {
    id: nanoid(),
    name: input.name,
    type: input.type,
    date: input.date,
    startTime: input.startTime,
    location: input.location,
    expectedAttendance: input.expectedAttendance,
    description: input.description,
    createdAt: now,
    updatedAt: now,
  } as Program;

  list.push(program);
  savePrograms(list);

  if (tallyCfg.enabled && tallyCfg.autoGenerateOnProgramCreate) {
    const expected =
      input.expectedAttendance && input.expectedAttendance > 0
        ? input.expectedAttendance
        : tallyCfg.defaultExpectedAttendance;

    if (expected > 0) {
      generateTalliesForProgram({
        programId: program.id,
        expectedCount: expected,
      });
    }
  }

  return program;
}

export interface UpdateProgramInput {
  id: string;
  name?: string;
  type?: string;
  date?: string;
  startTime?: string;
  location?: string;
  expectedAttendance?: number;
  description?: string;
}

/**
 * Update a program (no tally regeneration here, to avoid accidental duplication).
 */
export function updateProgram(input: UpdateProgramInput): Program {
  const list = loadPrograms();
  const idx = list.findIndex((p) => p.id === input.id);
  if (idx === -1) {
    throw new Error('Program not found.');
  }

  const now = new Date().toISOString();
  const existing = list[idx];

  const updated: Program = {
    ...existing,
    ...input,
    id: existing.id,
    updatedAt: now,
  } as Program;

  list[idx] = updated;
  savePrograms(list);

  return updated;
}
