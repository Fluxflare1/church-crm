'use client';

import {
  getPrograms as dbGetPrograms,
  upsertProgram as dbUpsertProgram,
  deleteProgram as dbDeleteProgram,
  getSystemConfig,
} from './database';

import type { Program, ProgramStatus, ProgramType } from '@/types';

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export interface CreateProgramInput {
  name: string;
  type: ProgramType;
  date: string;                   // ISO date
  startTime: string;              // "HH:mm"
  endTime?: string;
  location?: string;
  description?: string;
  status?: ProgramStatus;
  expectedAttendance?: number;
}

export interface UpdateProgramInput {
  id: string;
  name?: string;
  type?: ProgramType;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  status?: ProgramStatus;
  expectedAttendance?: number;
}

// ---- Queries ----------------------------------------------------------------

export function getAllPrograms(): Program[] {
  return dbGetPrograms();
}

export function getProgramById(programId: string): Program | undefined {
  return dbGetPrograms().find((p) => p.id === programId);
}

export function getUpcomingPrograms(): Program[] {
  const now = new Date();
  return dbGetPrograms().filter((p) => {
    const d = new Date(p.date);
    return !Number.isNaN(d.getTime()) && d >= now;
  });
}

export function getPastPrograms(): Program[] {
  const now = new Date();
  return dbGetPrograms().filter((p) => {
    const d = new Date(p.date);
    return !Number.isNaN(d.getTime()) && d < now;
  });
}

// ---- Create / Update / Delete ----------------------------------------------

export function createProgram(input: CreateProgramInput): Program {
  const now = nowIso();
  const config = getSystemConfig();

  const program: Program = {
    id: generateId('program'),
    name: input.name,
    type: input.type,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    location: input.location,
    description: input.description,
    status: input.status ?? 'planned',
    expectedAttendance:
      input.expectedAttendance ?? config.tally.defaultExpectedAttendance,
    createdAt: now,
    updatedAt: now,
  };

  dbUpsertProgram(program);

  // NOTE: Tally auto-generation will be handled in lib/tally.ts
  // using config.tally.autoGenerateOnProgramCreate.
  // We do NOT call it here yet to avoid circular dependencies.

  return program;
}

export function updateProgram(input: UpdateProgramInput): Program | null {
  const existing = getProgramById(input.id);
  if (!existing) return null;

  const updated: Program = {
    ...existing,
    name: input.name ?? existing.name,
    type: input.type ?? existing.type,
    date: input.date ?? existing.date,
    startTime: input.startTime ?? existing.startTime,
    endTime: input.endTime ?? existing.endTime,
    location: input.location ?? existing.location,
    description: input.description ?? existing.description,
    status: input.status ?? existing.status,
    expectedAttendance:
      input.expectedAttendance ?? existing.expectedAttendance,
    updatedAt: nowIso(),
  };

  dbUpsertProgram(updated);
  return updated;
}

export function deleteProgram(programId: string): void {
  dbDeleteProgram(programId);
}
