// lib/birthday.ts

import { getAllPeople } from './people';
import { getSystemConfig } from './config';
import { getTable, setTable } from './database';
import { sendMessageToPerson } from './communications';
import { createFollowUp } from './follow-ups';

import type {
  Person,
  CommunicationChannel,
} from '@/types';

type BirthdayLogMode = 'message' | 'follow-up';

interface BirthdayLogEntry {
  id: string;
  personId: string;
  year: number;
  mode: BirthdayLogMode;
  createdAt: string; // ISO string
}

export interface BirthdayAutomationResult {
  date: string; // ISO date of the check (reference date)
  leadTimeDays: number;
  processed: number;          // people with valid DOB we examined
  candidates: number;         // birthdays matching target day
  messagesSent: number;
  followUpsCreated: number;
  alreadyHandled: number;     // skipped because already logged this year
  skippedNoChannel: number;   // no usable contact for chosen channel
}

/** Normalize a date to midnight (local). */
function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Generate a simple ID (local only, no backend). */
function generateId(): string {
  return `bdlog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Check if two dates (same year) share the same month/day. */
function isSameMonthDay(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Returns true if we already logged a birthday action for this person
 * in the given year.
 */
function hasBirthdayLogForYear(
  logs: BirthdayLogEntry[],
  personId: string,
  year: number,
): boolean {
  return logs.some((log) => log.personId === personId && log.year === year);
}

/**
 * Core automation:
 * - looks at SystemConfig.birthdays
 * - finds all people whose birthday is `leadTimeDays` from referenceDate
 * - if sendAutomatically: sends via communications layer
 * - else: creates follow-ups
 * - logs actions to avoid duplicates in the same year
 */
export async function runBirthdayAutomation(
  referenceDate: Date = new Date(),
): Promise<BirthdayAutomationResult> {
  const config = getSystemConfig();
  const bConfig = config.birthdays;

  if (!bConfig || !bConfig.enabled) {
    return {
      date: referenceDate.toISOString(),
      leadTimeDays: bConfig?.leadTimeDays ?? 0,
      processed: 0,
      candidates: 0,
      messagesSent: 0,
      followUpsCreated: 0,
      alreadyHandled: 0,
      skippedNoChannel: 0,
    };
  }

  const people = getAllPeople();
  let logs = getTable<BirthdayLogEntry>('birthdayLogs') ?? [];

  const todayMid = normalizeDate(referenceDate);
  const targetDate = new Date(todayMid);
  targetDate.setDate(targetDate.getDate() + bConfig.leadTimeDays);
  const targetYear = targetDate.getFullYear();

  let processed = 0;
  let candidates = 0;
  let messagesSent = 0;
  let followUpsCreated = 0;
  let alreadyHandled = 0;
  let skippedNoChannel = 0;

  for (const person of people) {
    const dobIso = person.personalData.dob;
    if (!dobIso) continue;

    processed += 1;

    const dobDate = new Date(dobIso);
    if (Number.isNaN(dobDate.getTime())) continue;

    // Person's birthday for this target year
    const birthdayThisYear = new Date(
      targetYear,
      dobDate.getMonth(),
      dobDate.getDate(),
    );

    // If month/day don't match the target date, skip
    if (!isSameMonthDay(birthdayThisYear, targetDate)) {
      continue;
    }

    candidates += 1;

    // Avoid duplicate handling for same person/year
    if (hasBirthdayLogForYear(logs, person.id, targetYear)) {
      alreadyHandled += 1;
      continue;
    }

    const nowIso = new Date().toISOString();

    if (bConfig.sendAutomatically) {
      const channel: CommunicationChannel = bConfig.defaultChannel ?? 'whatsapp';

      const phone =
        person.contact?.phone ??
        person.personalData.phone ??
        null;
      const email =
        person.contact?.email ??
        person.personalData.email ??
        null;

      let hasContact = false;
      if (channel === 'whatsapp' || channel === 'sms') {
        hasContact = !!phone;
      } else if (channel === 'email') {
        hasContact = !!email;
      } else {
        // 'call' doesn't make sense as auto channel, treat as no contact
        hasContact = false;
      }

      if (!hasContact) {
        skippedNoChannel += 1;
        continue;
      }

      try {
        const result = await sendMessageToPerson({
          personId: person.id,
          channel,
          templateId: bConfig.messageTemplateId || undefined,
          bodyOverride: undefined,
          initiatedByUserId: 'system-birthday-cron',
          context: {
            reason: 'birthday',
            leadTimeDays: bConfig.leadTimeDays,
            referenceDate: referenceDate.toISOString(),
          },
        });

        if (result.success) {
          messagesSent += 1;
          logs.push({
            id: generateId(),
            personId: person.id,
            year: targetYear,
            mode: 'message',
            createdAt: nowIso,
          });
        } else {
          // Could not send due to provider error; treat as skipped for now
          skippedNoChannel += 1;
        }
      } catch {
        // Communications failure: treat as skipped
        skippedNoChannel += 1;
      }
    } else {
      // Create a follow-up instead of auto-send
      try {
        await createFollowUp({
          personId: person.id,
          type: bConfig.followUpType || 'birthday',
          title: `Birthday for ${person.personalData.firstName ?? ''} ${person.personalData.lastName ?? ''}`.trim(),
          description: `Birthday follow-up created automatically for ${birthdayThisYear.toDateString()}.`,
          priority: 'medium',
          createdByUserId: 'system-birthday-cron',
          dueAt: targetDate.toISOString(),
          meta: {
            reason: 'birthday',
            leadTimeDays: bConfig.leadTimeDays,
          },
        });

        followUpsCreated += 1;
        logs.push({
          id: generateId(),
          personId: person.id,
          year: targetYear,
          mode: 'follow-up',
          createdAt: nowIso,
        });
      } catch {
        // If follow-up creation fails, we simply skip logging; it can be retried later
      }
    }
  }

  setTable<BirthdayLogEntry>('birthdayLogs', logs);

  return {
    date: referenceDate.toISOString(),
    leadTimeDays: bConfig.leadTimeDays,
    processed,
    candidates,
    messagesSent,
    followUpsCreated,
    alreadyHandled,
    skippedNoChannel,
  };
}

/**
 * Utility to retrieve upcoming birthdays for a dashboard card.
 * This does NOT log or send anything – it's read-only.
 */
export function getUpcomingBirthdays(
  daysAhead: number = 7,
): {
  person: Person;
  date: Date;
  daysUntil: number;
}[] {
  const people = getAllPeople();
  const today = new Date();
  const todayMid = normalizeDate(today);

  const results: { person: Person; date: Date; daysUntil: number }[] = [];

  for (const person of people) {
    const dobIso = person.personalData.dob;
    if (!dobIso) continue;

    const dobDate = new Date(dobIso);
    if (Number.isNaN(dobDate.getTime())) continue;

    const birthdayThisYear = new Date(
      todayMid.getFullYear(),
      dobDate.getMonth(),
      dobDate.getDate(),
    );

    let deltaDays = Math.round(
      (birthdayThisYear.getTime() - todayMid.getTime()) /
        (24 * 60 * 60 * 1000),
    );

    if (deltaDays < 0) {
      // Already passed this year → consider next year
      const birthdayNextYear = new Date(
        todayMid.getFullYear() + 1,
        dobDate.getMonth(),
        dobDate.getDate(),
      );
      deltaDays = Math.round(
        (birthdayNextYear.getTime() - todayMid.getTime()) /
          (24 * 60 * 60 * 1000),
      );
      if (deltaDays < 0 || deltaDays > daysAhead) continue;

      results.push({
        person,
        date: birthdayNextYear,
        daysUntil: deltaDays,
      });
    } else if (deltaDays <= daysAhead) {
      results.push({
        person,
        date: birthdayThisYear,
        daysUntil: deltaDays,
      });
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}
