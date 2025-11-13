'use client';

import { nanoid } from 'nanoid';
import { getAllPeople } from './people';
import { getSystemConfig } from './config';

import type {
  FollowUp,
  FollowUpStatus,
  FollowUpType,
  Person,
  SystemConfig,
} from '@/types';

const STORAGE_KEY = 'church-crm:follow-ups';

let inMemoryFollowUps: FollowUp[] = [];

/* -------------------------------------------------------------------------- */
/*  Storage helpers                                                           */
/* -------------------------------------------------------------------------- */

function loadFollowUps(): FollowUp[] {
  if (typeof window === 'undefined') {
    return inMemoryFollowUps;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      inMemoryFollowUps = [];
      return inMemoryFollowUps;
    }
    const parsed = JSON.parse(raw) as FollowUp[];
    if (!Array.isArray(parsed)) {
      inMemoryFollowUps = [];
      return inMemoryFollowUps;
    }
    inMemoryFollowUps = parsed;
    return inMemoryFollowUps;
  } catch {
    inMemoryFollowUps = [];
    return inMemoryFollowUps;
  }
}

function saveFollowUps(list: FollowUp[]): void {
  inMemoryFollowUps = list;
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // best-effort
  }
}

/* -------------------------------------------------------------------------- */
/*  Public API: basic operations                                              */
/* -------------------------------------------------------------------------- */

export function getAllFollowUps(): FollowUp[] {
  const all = loadFollowUps();
  return [...all].sort((a, b) => {
    const aDate = a.createdAt ?? '';
    const bDate = b.createdAt ?? '';
    return bDate.localeCompare(aDate);
  });
}

export function getFollowUpsForPerson(personId: string): FollowUp[] {
  return getAllFollowUps().filter((f) => f.personId === personId);
}

export function upsertFollowUp(followUp: FollowUp): FollowUp {
  const list = loadFollowUps();
  const idx = list.findIndex((f) => f.id === followUp.id);
  if (idx >= 0) {
    list[idx] = followUp;
  } else {
    list.push(followUp);
  }
  saveFollowUps(list);
  return followUp;
}

export function updateFollowUpStatus(
  followUpId: string,
  status: FollowUpStatus,
  note?: string,
): FollowUp | null {
  const list = loadFollowUps();
  const idx = list.findIndex((f) => f.id === followUpId);
  if (idx === -1) return null;

  const now = new Date().toISOString();

  const updated: FollowUp = {
    ...list[idx],
    status,
    updatedAt: now,
    closedAt: status === 'completed' || status === 'cancelled' ? now : undefined,
    notes:
      note && note.trim()
        ? [...(list[idx].notes ?? []), { createdAt: now, text: note.trim() }]
        : list[idx].notes,
  };

  list[idx] = updated;
  saveFollowUps(list);
  return updated;
}

/* -------------------------------------------------------------------------- */
/*  Public API: creation helpers                                              */
/* -------------------------------------------------------------------------- */

export interface CreateFollowUpInput {
  personId: string;
  type: FollowUpType;
  title: string;
  description?: string;
  dueAt?: string; // ISO
  priority?: 'low' | 'medium' | 'high';
  createdByUserId: string;
  assignedToUserId?: string;
  programId?: string;
  meta?: Record<string, any>;
}

export function createFollowUp(input: CreateFollowUpInput): FollowUp {
  const now = new Date().toISOString();

  const followUp: FollowUp = {
    id: nanoid(),
    personId: input.personId,
    type: input.type,
    title: input.title,
    description: input.description,
    status: 'open',
    priority: input.priority ?? 'medium',
    createdAt: now,
    updatedAt: now,
    dueAt: input.dueAt,
    createdByUserId: input.createdByUserId,
    assignedToUserId: input.assignedToUserId,
    programId: input.programId,
    meta: input.meta ?? {},
  };

  const list = loadFollowUps();
  list.push(followUp);
  saveFollowUps(list);

  return followUp;
}

/* -------------------------------------------------------------------------- */
/*  Absentee automation helpers                                               */
/* -------------------------------------------------------------------------- */

export interface AbsenteeDetected {
  person: Person;
  missedPrograms: string[]; // programIds
}

/**
 * For each absentee, create a follow-up according to FollowUpConfig.absenteeRule.
 */
export function createAbsenteeFollowUps(
  absentees: AbsenteeDetected[],
  options: { createdByUserId: string },
): FollowUp[] {
  if (!absentees.length) return [];

  const cfg: SystemConfig = getSystemConfig();
  const rule = cfg.followUp.absenteeRule;

  if (!rule.enabled || !rule.createFollowUp) {
    return [];
  }

  const now = new Date();
  const created: FollowUp[] = [];

  for (const { person, missedPrograms } of absentees) {
    // Avoid creating duplicate open absentee follow-ups for the same person
    const existingOpen = getAllFollowUps().some(
      (f) =>
        f.personId === person.id &&
        f.type === (rule.followUpType as FollowUpType) &&
        f.status === 'open',
    );
    if (existingOpen) continue;

    const dueDate = new Date(now.getTime());
    dueDate.setHours(dueDate.getHours() + cfg.followUp.timeframes.absenteeHours);

    const title = `Absentee follow-up: ${person.personalData.firstName ?? ''} ${
      person.personalData.lastName ?? ''
    }`.trim();

    const description = `This person has missed ${rule.missedProgramsCount} program(s) within the last ${rule.withinDays} day(s). Missed programs: ${missedPrograms.join(
      ', ',
    )}`;

    const followUp = createFollowUp({
      personId: person.id,
      type: rule.followUpType as FollowUpType,
      title,
      description,
      dueAt: dueDate.toISOString(),
      priority: rule.followUpPriority,
      createdByUserId: options.createdByUserId,
      // auto-assignment logic could be added here based on cfg.followUp.assignment
    });

    created.push(followUp);
  }

  return created;
}
