'use client';

import { nanoid } from 'nanoid';
import { getAllPeople } from './people';

import type {
  Person,
  Program,
  CommunicationChannel,
  BroadcastSegmentKey,
  BroadcastRecord,
} from '@/types';

const STORAGE_KEY = 'church-crm:broadcasts';

let inMemoryBroadcasts: BroadcastRecord[] = [];

/* -------------------------------------------------------------------------- */
/*  Persistence helpers (localStorage with SSR-safe fallback)                 */
/* -------------------------------------------------------------------------- */

function loadBroadcasts(): BroadcastRecord[] {
  if (typeof window === 'undefined') {
    return inMemoryBroadcasts;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      inMemoryBroadcasts = [];
      return inMemoryBroadcasts;
    }
    const parsed = JSON.parse(raw) as BroadcastRecord[];
    if (!Array.isArray(parsed)) {
      inMemoryBroadcasts = [];
      return inMemoryBroadcasts;
    }
    inMemoryBroadcasts = parsed;
    return inMemoryBroadcasts;
  } catch {
    inMemoryBroadcasts = [];
    return inMemoryBroadcasts;
  }
}

function saveBroadcasts(list: BroadcastRecord[]): void {
  inMemoryBroadcasts = list;
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Best-effort; do not throw in UI
  }
}

/* -------------------------------------------------------------------------- */
/*  Public API: History                                                       */
/* -------------------------------------------------------------------------- */

export function getBroadcastHistory(): BroadcastRecord[] {
  const list = loadBroadcasts();
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function recordBroadcastSummary(input: {
  programId?: string;
  channel: CommunicationChannel;
  segmentKey: BroadcastSegmentKey;
  /**
   * Optional template identifier that was used as the base for this message.
   */
  templateId?: string;
  messageBody: string;
  totalTargets: number;
  successCount: number;
  failureCount: number;
  createdByUserId: string;
}): BroadcastRecord {
  const now = new Date().toISOString();
  const record: BroadcastRecord = {
    id: nanoid(),
    createdAt: now,
    createdByUserId: input.createdByUserId,
    programId: input.programId,
    channel: input.channel,
    segmentKey: input.segmentKey,
    templateId: input.templateId,
    messageBody: input.messageBody,
    totalTargets: input.totalTargets,
    successCount: input.successCount,
    failureCount: input.failureCount,
  };

  const list = loadBroadcasts();
  list.push(record);
  saveBroadcasts(list);

  return record;
}

/* -------------------------------------------------------------------------- */
/*  Public API: Segment resolution                                            */
/* -------------------------------------------------------------------------- */

export function resolveRecipientsBySegment(
  segmentKey: BroadcastSegmentKey,
  peopleOverride?: Person[],
): Person[] {
  const people = peopleOverride ?? getAllPeople();

  switch (segmentKey) {
    case 'all-people':
      return people;

    case 'members-all':
      return people.filter((p) => p.category === 'member');

    case 'members-regular':
      return people.filter(
        (p) =>
          p.category === 'member' &&
          p.evolution?.memberRating === 'regular',
      );

    case 'members-adherent':
      return people.filter(
        (p) =>
          p.category === 'member' &&
          p.evolution?.memberRating === 'adherent',
      );

    case 'members-returning':
      return people.filter(
        (p) =>
          p.category === 'member' &&
          p.evolution?.memberRating === 'returning',
      );

    case 'members-visiting':
      return people.filter(
        (p) =>
          p.category === 'member' &&
          p.evolution?.memberRating === 'visiting',
      );

    case 'guests-all':
      return people.filter((p) => p.category === 'guest');

    case 'guests-first-time':
      return people.filter(
        (p) =>
          p.category === 'guest' &&
          p.evolution?.guestType === 'first-time',
      );

    case 'guests-returning':
      return people.filter(
        (p) =>
          p.category === 'guest' &&
          p.evolution?.guestType === 'returning',
      );

    case 'guests-regular':
      return people.filter(
        (p) =>
          p.category === 'guest' &&
          p.evolution?.guestType === 'regular',
      );

    case 'workers-all':
      return people.filter((p) => p.engagement?.isWorker === true);

    default:
      return people;
  }
}

/* -------------------------------------------------------------------------- */
/*  Optional helper: pretty labels (reused by UI)                             */
/* -------------------------------------------------------------------------- */

export function segmentLabel(segment: BroadcastSegmentKey): string {
  switch (segment) {
    case 'all-people':
      return 'All people (members + guests)';

    case 'members-all':
      return 'All members';
    case 'members-regular':
      return 'Regular members';
    case 'members-adherent':
      return 'Adherent members';
    case 'members-returning':
      return 'Returning members';
    case 'members-visiting':
      return 'Visiting members';

    case 'guests-all':
      return 'All guests';
    case 'guests-first-time':
      return 'First-time guests';
    case 'guests-returning':
      return 'Returning guests';
    case 'guests-regular':
      return 'Regular guests';

    case 'workers-all':
      return 'All workforce (workers)';

    default:
      return segment;
  }
}
