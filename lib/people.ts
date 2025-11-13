'use client';

import {
  getPeople,
  upsertPerson as dbUpsertPerson,
  deletePerson as dbDeletePerson,
  getSystemConfig as dbGetSystemConfig,
} from './database';

import type {
  Person,
  PersonCategory,
  PersonalData,
  GuestData,
  GuestInterests,
  ReferralSource,
  MemberData,
  PersonEvolution,
  PersonAssignment,
  EngagementFlags,
  GuestType,
  MemberRating,
} from '@/types';

// ---- ID + time helpers ------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

// ---- Public query helpers ---------------------------------------------------

export function getAllPeople(): Person[] {
  return getPeople();
}

export function getPersonById(personId: string): Person | undefined {
  return getPeople().find((p) => p.id === personId);
}

export function getPeopleByCategory(category: PersonCategory): Person[] {
  return getPeople().filter((p) => p.category === category);
}

// ---- Creation inputs --------------------------------------------------------

export interface CreateGuestInput {
  personalData: PersonalData;
  referralSource: ReferralSource;
  referralName?: string;
  interests: GuestInterests;
  firstVisitDate?: string;          // if undefined, use now
  tags?: string[];
  primaryRmUserId?: string;
  secondaryRmUserIds?: string[];
  isWorker?: boolean;               // if true, Guest who is already in workforce
}

export interface CreateMemberInput {
  personalData: PersonalData;
  membershipDate: string;           // ISO
  membershipStatus?: MemberData['membershipStatus'];
  membershipNumber?: string;
  tags?: string[];
  primaryRmUserId?: string;
  secondaryRmUserIds?: string[];
  isWorker?: boolean;               // Member + Workforce if true
}

export interface UpdatePersonInput {
  personId: string;
  personalData?: Partial<PersonalData>;
  guestData?: Partial<GuestData> | null;
  memberData?: Partial<MemberData> | null;
  evolution?: Partial<PersonEvolution>;
  assignment?: Partial<PersonAssignment>;
  engagement?: Partial<EngagementFlags>;
  tags?: string[];
  category?: PersonCategory;        // careful: changing guest<->member should be controlled
}

// ---- Core creation helpers --------------------------------------------------

function buildInitialEvolutionForGuest(firstVisitDateIso: string): PersonEvolution {
  return {
    guestType: 'first-time',
    visitCount: 1,
    totalVisits: 1,
    firstVisitDate: firstVisitDateIso,
    lastVisitDate: firstVisitDateIso,
    currentStreak: 1,
    longestStreak: 1,
    memberRating: undefined,
    ratingHistory: [],
    attendanceHistory: [],
    readyForPromotion: false,
  };
}

function buildInitialEvolutionForMember(): PersonEvolution {
  return {
    guestType: undefined,
    visitCount: 0,
    totalVisits: 0,
    firstVisitDate: undefined,
    lastVisitDate: undefined,
    currentStreak: 0,
    longestStreak: 0,
    memberRating: undefined,
    ratingHistory: [],
    attendanceHistory: [],
    readyForPromotion: false,
  };
}

function buildAssignment(
  primaryRmUserId?: string,
  secondaryRmUserIds?: string[]
): PersonAssignment {
  return {
    primaryRmUserId,
    secondaryRmUserIds: secondaryRmUserIds ?? [],
    groupId: undefined,
  };
}

function buildEngagementFlags(isWorker: boolean | undefined): EngagementFlags {
  return {
    isWorker: Boolean(isWorker),
    receivesBroadcasts: true,
    doNotContact: false,
  };
}

// ---- Create Guest -----------------------------------------------------------

export function createGuest(input: CreateGuestInput): Person {
  const now = nowIso();
  const firstVisitDate = input.firstVisitDate ?? now;

  const guestData: GuestData = {
    referralSource: input.referralSource,
    referralName: input.referralName,
    firstVisitDate,
    interests: input.interests,
  };

  const evolution = buildInitialEvolutionForGuest(firstVisitDate);
  const assignment = buildAssignment(input.primaryRmUserId, input.secondaryRmUserIds);
  const engagement = buildEngagementFlags(input.isWorker);

  const person: Person = {
    id: generateId('person'),
    category: 'guest',
    personalData: input.personalData,
    guestData,
    memberData: undefined,
    evolution,
    assignment,
    engagement,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };

  // Apply evolution rules to set guestType & readyForPromotion correctly
  const configured = applyEvolutionRules(person);
  dbUpsertPerson(configured);
  return configured;
}

// ---- Create Member ----------------------------------------------------------

export function createMember(input: CreateMemberInput): Person {
  const now = nowIso();

  const memberData: MemberData = {
    membershipDate: input.membershipDate,
    membershipStatus: input.membershipStatus ?? 'active',
    membershipNumber: input.membershipNumber,
  };

  const evolution = buildInitialEvolutionForMember();
  const assignment = buildAssignment(input.primaryRmUserId, input.secondaryRmUserIds);
  const engagement = buildEngagementFlags(input.isWorker);

  const person: Person = {
    id: generateId('person'),
    category: 'member',
    personalData: input.personalData,
    guestData: undefined,
    memberData,
    evolution,
    assignment,
    engagement,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const configured = applyEvolutionRules(person);
  dbUpsertPerson(configured);
  return configured;
}

// ---- Update Person ----------------------------------------------------------

export function updatePerson(input: UpdatePersonInput): Person | null {
  const existing = getPersonById(input.personId);
  if (!existing) return null;

  const now = nowIso();

  const updated: Person = {
    ...existing,
    category: input.category ?? existing.category,
    personalData: input.personalData
      ? { ...existing.personalData, ...input.personalData }
      : existing.personalData,
    guestData:
      input.guestData === null
        ? undefined
        : input.guestData
        ? { ...(existing.guestData ?? {}), ...input.guestData }
        : existing.guestData,
    memberData:
      input.memberData === null
        ? undefined
        : input.memberData
        ? { ...(existing.memberData ?? {}), ...input.memberData }
        : existing.memberData,
    evolution: input.evolution
      ? { ...existing.evolution, ...input.evolution }
      : existing.evolution,
    assignment: input.assignment
      ? { ...existing.assignment, ...input.assignment }
      : existing.assignment,
    engagement: input.engagement
      ? { ...existing.engagement, ...input.engagement }
      : existing.engagement,
    tags: input.tags ?? existing.tags,
    updatedAt: now,
  };

  const configured = applyEvolutionRules(updated);
  dbUpsertPerson(configured);
  return configured;
}

export function deletePerson(personId: string): void {
  dbDeletePerson(personId);
}

// ---- Evolution & promotion logic -------------------------------------------

/**
 * Applies SystemConfig evolution rules to:
 * - guestType transitions (first-time → returning → regular)
 * - readyForPromotion flag
 * - memberRating (for members) based on attendance history
 */
export function applyEvolutionRules(person: Person): Person {
  const config = dbGetSystemConfig();
  if (!config.evolution.enabled) {
    return person;
  }

  const evolution = { ...person.evolution };
  const { thresholds, memberRatingThresholds } = config.evolution;

  // Guest evolution
  if (person.category === 'guest') {
    const v = evolution.visitCount;

    let guestType: GuestType | undefined = evolution.guestType;
    if (v <= 1) {
      guestType = 'first-time';
    } else if (v >= thresholds.returningToRegularThreshold) {
      guestType = 'regular';
    } else if (v >= thresholds.guestToReturningThreshold) {
      guestType = 'returning';
    }

    const readyForPromotion =
      guestType === 'regular' && v >= thresholds.regularGuestToMemberThreshold;

    evolution.guestType = guestType;
    evolution.readyForPromotion = readyForPromotion;
    evolution.memberRating = undefined;
  }

  // Member rating based on attendance history
  if (person.category === 'member') {
    const rating = calculateMemberRatingFromHistory(
      evolution,
      memberRatingThresholds
    );
    evolution.memberRating = rating ?? evolution.memberRating;

    if (rating && rating !== evolution.memberRating) {
      evolution.ratingHistory = [
        ...evolution.ratingHistory,
        {
          date: nowIso(),
          rating,
          attendancePercentage: computeAttendancePercentage(
            evolution,
            memberRatingThresholds[rating].minWeeksConsidered
          ),
        },
      ];
    }
    // For members, guestType and readyForPromotion are irrelevant
    evolution.guestType = undefined;
    evolution.readyForPromotion = false;
  }

  return {
    ...person,
    evolution,
  };
}

function calculateMemberRatingFromHistory(
  evolution: PersonEvolution,
  thresholds: {
    regular: { minAttendancePercentage: number; minWeeksConsidered: number };
    adherent: { minAttendancePercentage: number; minWeeksConsidered: number };
    returning: { minAttendancePercentage: number; minWeeksConsidered: number };
    visiting: { minAttendancePercentage: number; minWeeksConsidered: number };
  }
): MemberRating | undefined {
  const entries = evolution.attendanceHistory;
  if (!entries.length) return undefined;

  // We evaluate from highest commitment downwards
  const order: MemberRating[] = ['adherent', 'regular', 'returning', 'visiting'];

  for (const rating of order) {
    const threshold = thresholds[rating];
    const percentage = computeAttendancePercentage(
      evolution,
      threshold.minWeeksConsidered
    );

    if (percentage >= threshold.minAttendancePercentage) {
      return rating;
    }
  }

  return undefined;
}

function computeAttendancePercentage(
  evolution: PersonEvolution,
  weeks: number
): number {
  if (weeks <= 0) return 0;

  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - weeks * 7);

  const history = evolution.attendanceHistory.filter((entry) => {
    const d = new Date(entry.date);
    return d >= from && d <= now;
  });

  if (history.length === 0) return 0;

  const present = history.filter((h) => h.status === 'present').length;
  return (present / history.length) * 100;
}

/**
 * Called by attendance logic when a person is marked present/absent.
 * Updates visit counts, streaks, attendance history, and evolution rules.
 */
export function applyAttendanceToPerson(options: {
  personId: string;
  programId: string;
  dateIso: string;
  present: boolean;
}): Person | null {
  const existing = getPersonById(options.personId);
  if (!existing) return null;

  const evolution = { ...existing.evolution };
  const historyEntry = {
    programId: options.programId,
    date: options.dateIso,
    status: options.present ? 'present' : 'absent' as const,
  };

  evolution.attendanceHistory = [...evolution.attendanceHistory, historyEntry];

  if (options.present) {
    evolution.totalVisits += 1;
    evolution.visitCount += 1;
    evolution.lastVisitDate = options.dateIso;
    if (!evolution.firstVisitDate) {
      evolution.firstVisitDate = options.dateIso;
    }
    evolution.currentStreak += 1;
    if (evolution.currentStreak > evolution.longestStreak) {
      evolution.longestStreak = evolution.currentStreak;
    }
  } else {
    evolution.currentStreak = 0;
  }

  const updated: Person = {
    ...existing,
    evolution,
    updatedAt: nowIso(),
  };

  const configured = applyEvolutionRules(updated);
  dbUpsertPerson(configured);
  return configured;
}

// ---- Promotion: Guest -> Member --------------------------------------------

export interface PromoteGuestToMemberOptions {
  personId: string;
  membershipDate: string;           // ISO
  membershipNumber?: string;
  membershipStatus?: MemberData['membershipStatus'];
  force?: boolean;                  // if true, bypass thresholds
  isWorker?: boolean;               // Member + Workforce if true
}

/**
 * Promotes a guest to member using evolution thresholds.
 * Keeps attendance history, rating history, assignments & tags intact.
 */
export function promoteGuestToMember(
  options: PromoteGuestToMemberOptions
): Person | null {
  const existing = getPersonById(options.personId);
  if (!existing) return null;

  if (existing.category !== 'guest') {
    throw new Error('Only guests can be promoted to members.');
  }

  const config = dbGetSystemConfig();
  const { thresholds } = config.evolution;

  const meetsThreshold =
    existing.evolution.guestType === 'regular' &&
    existing.evolution.visitCount >= thresholds.regularGuestToMemberThreshold;

  if (!meetsThreshold && !options.force) {
    throw new Error('Guest does not meet promotion thresholds.');
  }

  const now = nowIso();

  const memberData: MemberData = {
    membershipDate: options.membershipDate,
    membershipStatus: options.membershipStatus ?? 'active',
    membershipNumber: options.membershipNumber,
  };

  const engagement: EngagementFlags = {
    ...existing.engagement,
    isWorker: Boolean(options.isWorker ?? existing.engagement.isWorker),
  };

  const updated: Person = {
    ...existing,
    category: 'member',
    memberData,
    guestData: existing.guestData, // keep guestData for history if desired
    engagement,
    updatedAt: now,
  };

  const configured = applyEvolutionRules(updated);
  dbUpsertPerson(configured);
  return configured;
}


  export function createGuestFromConnectForm(data: any): Person {
  return createGuest({
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    email: data.email,
    gender: data.gender,
    dob: data.dob,
    howHeard: data.howHeard,
    invitee: data.invitee,
    spiritualInterests: data.spiritualInterests ?? [],
    communicationsConsent: data.communicationsConsent ?? false,
    attendedWith: data.attendedWith,
    preferredChannel: data.preferredChannel,
  });
}

// -----------------------------------------------------------------------------
// Public-side helpers (self-service access)
// -----------------------------------------------------------------------------

/**
 * Normalize phone number for comparison:
 * - Strip all non-digits
 * - Works with +234, 0xxx, spaces, etc.
 */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Find a person by phone number (used by /access public flow).
 * This is intentionally simple and offline-friendly.
 */
export function findPersonByPhone(phone: string): Person | undefined {
  const target = normalizePhone(phone);
  if (!target) return undefined;

  const all = getAllPeople();
  return all.find((p) => normalizePhone(p.personalData.phone) === target);
}
