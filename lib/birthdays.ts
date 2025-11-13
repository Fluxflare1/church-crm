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
 * Logic:
 * - targetDate = referenceDate + config.birthdays.daysBefore
 * - For each person with DOB (month/day) == targetDate (month/day):
 *   - Check if we've already sent for this year (birthdayLogs table)
 *   - If not, send via communications engine and log it
 */
export function runBirthdayAutomation(
  referenceDate: Date = new Date()
): BirthdayAutomationResult {
  const config = getSystemConfig();

  if (!config.birthdays || !config.birthdays.enabled) {
    return {
      processedPeople: 0,
      birthdayCandidates: 0,
      messagesSent: 0,
      skipped: true,
      reason: 'Birthdays automation disabled in SystemConfig.birthdays.',
    };
  }

  const { daysBefore = 0, defaultChannel, messageTemplate } = config.birthdays;

  const targetDate = addDays(stripTime(referenceDate), daysBefore);
  const targetMonth = targetDate.getMonth() + 1; // 1–12
  const targetDay = targetDate.getDate();
  const targetYear = targetDate.getFullYear();

  const allPeople = getAllPeople();
  const logs = db.getTable<BirthdayLog>('birthdayLogs') ?? [];

  let processed = 0;
  let candidates = 0;
  let sent = 0;

  for (const person of allPeople) {
    processed++;

    const dobISO = person.personalData.dob;
    if (!dobISO) continue;

    const dob = new Date(dobISO);
    if (isNaN(dob.getTime())) continue;

    const dobMonth = dob.getMonth() + 1;
    const dobDay = dob.getDate();

    // Only match month + day (year doesn't matter)
    if (dobMonth !== targetMonth || dobDay !== targetDay) {
      continue;
    }

    candidates++;

    // Avoid sending more than once per year
    const alreadySent = logs.some(
      (log) => log.personId === person.id && log.year === targetYear
    );
    if (alreadySent) continue;

    const channel: CommunicationChannel = defaultChannel ?? 'whatsapp';
    const body = personaliseBirthdayTemplate(messageTemplate, person);

    // Fire-and-forget; if you want strict error handling, you can await and catch
    void sendMessageToPerson({
      personId: person.id,
      channel,
      templateId: undefined,
      bodyOverride: body,
      initiatedByUserId: 'system-birthday-automation',
      context: {
        reason: 'birthday',
        year: targetYear,
      },
    });

    const newLog: BirthdayLog = {
      id: crypto.randomUUID(),
      personId: person.id,
      year: targetYear,
      channel,
      sentAt: new Date().toISOString(),
    };

    logs.push(newLog);
    sent++;
  }

  if (sent > 0) {
    db.setTable<BirthdayLog>('birthdayLogs', logs);
  }

  return {
    processedPeople: processed,
    birthdayCandidates: candidates,
    messagesSent: sent,
    skipped: false,
  };
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

function personaliseBirthdayTemplate(template: string, person: Person): string {
  const context: Record<string, string | undefined> = {
    firstName: person.personalData.firstName,
    lastName: person.personalData.lastName,
    fullName: `${person.personalData.firstName} ${person.personalData.lastName}`,
    churchName: person.personalData.churchName,
  };

  return template.replace(/{{\s*([\w.]+)\s*}}/g, (match, key) => {
    const val = context[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}
