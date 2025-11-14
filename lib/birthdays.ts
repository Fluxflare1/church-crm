'use client';

import { getAllPeople, savePerson } from './people';
import { getSystemConfig } from './config';
import { sendMessageToPerson } from './communications';
import { createFollowUp } from './follow-ups';
import { createNotificationForEvent } from './notifications';

import type {
  Person,
  SystemConfig,
  BirthdayMessagingConfig,
  CommunicationChannel,
} from '@/types';

export interface BirthdayAutomationPersonResult {
  personId: string;
  channel: CommunicationChannel | null;
  sent: boolean;
  followUpCreated: boolean;
  error?: string;
}

export interface BirthdayAutomationResult {
  configEnabled: boolean;
  consideredCount: number;
  scheduledCount: number;
  sentCount: number;
  followUpsCreated: number;
  details: BirthdayAutomationPersonResult[];
}

/**
 * Run birthday detection and either send messages or create follow-ups,
 * depending on SystemConfig.birthdays.
 */
export async function runBirthdayAutomation(options?: {
  now?: Date;
  dryRun?: boolean;
  createdByUserId?: string;
}): Promise<BirthdayAutomationResult> {
  const now = options?.now ?? new Date();
  const cfg: SystemConfig = getSystemConfig();
  const birthdaysCfg: BirthdayMessagingConfig = cfg.birthdays;

  if (!birthdaysCfg.enabled) {
    return {
      configEnabled: false,
      consideredCount: 0,
      scheduledCount: 0,
      sentCount: 0,
      followUpsCreated: 0,
      details: [],
    };
  }

  const people = getAllPeople();
  const results: BirthdayAutomationPersonResult[] = [];

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const leadMillis = birthdaysCfg.leadTimeDays * 24 * 60 * 60 * 1000;

  let scheduledCount = 0;
  let sentCount = 0;
  let followUpsCreated = 0;

  for (const person of people) {
    const dob = person.personalData.dob;
    if (!dob) continue;

    const dobDate = new Date(dob);
    if (Number.isNaN(dobDate.getTime())) continue;

    const birthdayThisYear = new Date(
      now.getFullYear(),
      dobDate.getMonth(),
      dobDate.getDate(),
    );

    const targetTime = birthdayThisYear.getTime() - leadMillis;

    if (targetTime > today) continue;

    // don't process very old (beyond 2 days after target)
    const maxLagMillis = 2 * 24 * 60 * 60 * 1000;
    if (today - targetTime > maxLagMillis) {
      continue;
    }

    // avoid duplicate for same year
    const lastYear = person.evolution?.lastBirthdayMessageYear;
    if (lastYear === now.getFullYear()) {
      continue;
    }

    scheduledCount += 1;

    if (options?.dryRun) {
      results.push({
        personId: person.id,
        channel: birthdaysCfg.defaultChannel,
        sent: false,
        followUpCreated: false,
      });
      continue;
    }

    const channel: CommunicationChannel = birthdaysCfg.defaultChannel;

    let sent = false;
    let fuCreated = false;
    let error: string | undefined;

    const fullName = `${person.personalData.firstName ?? ''} ${
      person.personalData.lastName ?? ''
    }`.trim();

    try {
      if (birthdaysCfg.sendAutomatically) {
        const messageBody = await buildBirthdayMessage(person, cfg);
        const res = await sendMessageToPerson({
          personId: person.id,
          channel,
          templateId: birthdaysCfg.messageTemplateId || undefined,
          bodyOverride: messageBody,
          initiatedByUserId: options?.createdByUserId ?? 'system',
          context: {
            automation: 'birthday',
            year: now.getFullYear(),
          },
        });

        if (res.success) {
          sent = true;
          sentCount += 1;

          // 🔔 Notification: birthday message sent
          createNotificationForEvent('upcomingBirthday', {
            title: `Birthday message sent: ${fullName}`,
            message: `A birthday greeting was sent to ${fullName} via ${channel.toUpperCase()}.`,
            personId: person.id,
            severity: 'info',
            meta: {
              channel,
            },
          });
        } else {
          error = res.errorMessage ?? 'Failed to send birthday message.';
        }
      } else {
        // create follow-up task instead
        const title = `Birthday follow-up: ${fullName}`.trim();
        const description =
          'Send a personalised birthday greeting and prayer to this person.';

        const fu = createFollowUp({
          personId: person.id,
          type: birthdaysCfg.followUpType as any,
          title,
          description,
          createdByUserId: options?.createdByUserId ?? 'system',
          priority: 'medium',
          meta: {
            birthdayYear: now.getFullYear(),
          },
        });

        fuCreated = true;
        followUpsCreated += 1;

        // 🔔 Notification: birthday follow-up created
        createNotificationForEvent('upcomingBirthday', {
          title: `Birthday follow-up created: ${fullName}`,
          message:
            'A birthday follow-up has been created. Please reach out to them with a greeting.',
          personId: person.id,
          followUpId: fu.id,
          severity: 'info',
          meta: {
            channelPreference: channel,
          },
        });
      }

      // Persist lastBirthdayMessageYear
      const updated: Person = {
        ...person,
        evolution: {
          ...(person.evolution ?? {}),
          lastBirthdayMessageYear: now.getFullYear(),
        },
      };
      savePerson(updated);
    } catch (err: unknown) {
      const e = err as Error;
      error = e.message ?? 'Birthday automation error.';
    }

    results.push({
      personId: person.id,
      channel,
      sent,
      followUpCreated: fuCreated,
      error,
    });
  }

  return {
    configEnabled: true,
    consideredCount: people.length,
    scheduledCount,
    sentCount,
    followUpsCreated,
    details: results,
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

async function buildBirthdayMessage(
  person: Person,
  cfg: SystemConfig,
): Promise<string> {
  // At this stage, we use a built-in template.
  // messageTemplateId can be used later to link to richer templates.
  const defaultTemplate =
    'Happy Birthday {{firstName}}! We celebrate you today at {{churchName}} and pray that this new year will be full of God’s grace.';

  const fullName = `${person.personalData.firstName ?? ''} ${
    person.personalData.lastName ?? ''
  }`.trim();

  const replacements: Record<string, string> = {
    '{{firstName}}': person.personalData.firstName ?? '',
    '{{lastName}}': person.personalData.lastName ?? '',
    '{{fullName}}': fullName,
    '{{churchName}}': cfg.systemInfo.churchName ?? 'church',
  };

  let result = defaultTemplate;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.split(token).join(value);
  }
  return result;
}
