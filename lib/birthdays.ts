// lib/birthdays.ts

import { getSystemConfig } from './config';
import { getAllPeople } from './people';
import { db } from './database';
import { sendMessageToPerson } from './communications';

import type { Person, CommunicationChannel } from '@/types';

export interface BirthdayAutomationResult {
  processedPeople: number;
  birthdayCandidates: number;
  messagesSent: number;
  followUpsCreated: number;
  skipped: boolean;
  reason?: string;
}

interface BirthdayLog {
  id: string;
  personId: string;
  year: number;
  channel: CommunicationChannel;
  sentAt: string;
}

/**
 * Run birthday automation for a given reference date (default: today).
 *
 * Uses SystemConfig.birthdays (BirthdayMessagingConfig):
 * - enabled
 * - leadTimeDays
 * - defaultChannel
 * - sendAutomatically
 * - followUpType
 * - messageTemplateId
 */
export function runBirthdayAutomation(
  referenceDate: Date = new Date()
): BirthdayAutomationResult {
  const cfg = getSystemConfig();
  const birthdaysCfg = cfg.birthdays;

  if (!birthdaysCfg?.enabled) {
    return {
      processedPeople: 0,
      birthdayCandidates: 0,
      messagesSent: 0,
      followUpsCreated: 0,
      skipped: true,
      reason: 'Birthdays automation disabled in SystemConfig.birthdays.',
    };
  }

  const targetDate = addDays(stripTime(referenceDate), birthdaysCfg.leadTimeDays || 0);
  const targetMonth = targetDate.getMonth() + 1; // 1–12
  const targetDay = targetDate.getDate();
  const targetYear = targetDate.getFullYear();

  const allPeople = getAllPeople();
  const logs = db.getTable<BirthdayLog>('birthdayLogs') ?? [];

  type FollowUpRecord = import('@/types').FollowUpRecord;
  const followUps = db.getTable<FollowUpRecord>('followUps') ?? [];

  let processed = 0;
  let candidates = 0;
  let messagesSent = 0;
  let followUpsCreated = 0;

  for (const person of allPeople) {
    processed++;

    const dobISO = person.personalData.dob;
    if (!dobISO) continue;

    const dob = new Date(dobISO);
    if (isNaN(dob.getTime())) continue;

    const dobMonth = dob.getMonth() + 1;
    const dobDay = dob.getDate();

    // Only match month + day (year does not matter)
    if (dobMonth !== targetMonth || dobDay !== targetDay) {
      continue;
    }

    candidates++;

    // Avoid sending/creating more than once per year
    const alreadyLogged = logs.some(
      (log) => log.personId === person.id && log.year === targetYear
    );
    if (alreadyLogged) continue;

    if (birthdaysCfg.sendAutomatically) {
      // Auto-send via communications engine
      const channel: CommunicationChannel =
        birthdaysCfg.defaultChannel ?? 'whatsapp';

      void sendMessageToPerson({
        personId: person.id,
        channel,
        templateId: birthdaysCfg.messageTemplateId,
        bodyOverride: undefined,
        initiatedByUserId: 'system-birthday-automation',
        context: { reason: 'birthday', year: targetYear },
      });

      messagesSent++;
    } else {
      // Create a follow-up instead of auto-sending
      const followUpType = birthdaysCfg.followUpType || 'birthday';
      const dueAt = new Date(targetDate);

      const newFollowUp: FollowUpRecord = {
        id: crypto.randomUUID(),
        personId: person.id,
        type: followUpType,
        reason: 'birthday',
        priority: 'low',
        status: 'open',
        createdAt: new Date().toISOString(),
        dueAt: dueAt.toISOString(),
        assignedRmUserId: person.relationship?.primaryRmUserId ?? null,
        metadata: {
          year: targetYear,
        },
      };

      followUps.push(newFollowUp);
      followUpsCreated++;
    }

    // Record we handled this person for this year
    const newLog: BirthdayLog = {
      id: crypto.randomUUID(),
      personId: person.id,
      year: targetYear,
      channel: birthdaysCfg.defaultChannel as CommunicationChannel,
      sentAt: new Date().toISOString(),
    };
    logs.push(newLog);
  }

  if (messagesSent > 0 || followUpsCreated > 0) {
    db.setTable<BirthdayLog>('birthdayLogs', logs);
    db.setTable('followUps', followUps);
  }

  return {
    processedPeople: processed,
    birthdayCandidates: candidates,
    messagesSent,
    followUpsCreated,
    skipped: false,
  };
}

// -----------------------------------------------------------------------------
// Upcoming birthdays helper for dashboard
// -----------------------------------------------------------------------------

export interface UpcomingBirthday {
  personId: string;
  fullName: string;
  dob: string;
  nextBirthdayDate: string; // ISO
  daysUntil: number;
  isToday: boolean;
  category: Person['category'];
}

/**
 * Returns upcoming birthdays in the next `daysAhead` days (inclusive).
 * Uses local time (browser/server default).
 */
export function getUpcomingBirthdays(daysAhead: number = 7): UpcomingBirthday[] {
  const allPeople = getAllPeople();
  const today = stripTime(new Date());

  const results: UpcomingBirthday[] = [];

  for (const person of allPeople) {
    const dobISO = person.personalData.dob;
    if (!dobISO) continue;

    const dob = new Date(dobISO);
    if (isNaN(dob.getTime())) continue;

    const next = computeNextBirthday(dob, today);
    const daysUntil = diffInDays(today, next);
    if (daysUntil < 0 || daysUntil > daysAhead) continue;

    results.push({
      personId: person.id,
      fullName: `${person.personalData.firstName} ${person.personalData.lastName}`,
      dob: dob.toISOString(),
      nextBirthdayDate: next.toISOString(),
      daysUntil,
      isToday: daysUntil === 0,
      category: person.category,
    });
  }

  // Sort: soonest first, then by name
  results.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return a.fullName.localeCompare(b.fullName);
  });

  return results;
}

// ----------------- helpers -----------------

function stripTime(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, delta: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + delta);
  return copy;
}

function diffInDays(a: Date, b: Date): number {
  const ms = stripTime(b).getTime() - stripTime(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function computeNextBirthday(dob: Date, today: Date): Date {
  const year = today.getFullYear();
  const month = dob.getMonth(); // 0–11
  const day = dob.getDate(); // 1–31

  const thisYear = new Date(year, month, day);
  if (thisYear >= stripTime(today)) {
    return thisYear;
  }
  return new Date(year + 1, month, day);
}
