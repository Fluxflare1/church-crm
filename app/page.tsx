'use client';

import { useEffect, useState } from 'react';
import { getAllPeople } from '@/lib/people';
import { getAllPrograms } from '@/lib/programs';
import { getAllFollowUps } from '@/lib/follow-ups';
import { getSystemConfig } from '@/lib/config';

import type { Person, Program, FollowUp, SystemConfig } from '@/types';

interface UpcomingBirthday {
  person: Person;
  date: Date;
  daysUntil: number;
}

export default function DashboardPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    // Load local data
    setPeople(getAllPeople());
    setPrograms(getAllPrograms());
    setFollowUps(getAllFollowUps());
    setConfig(getSystemConfig());

    // Fire-and-forget absentee detection
    void fetch('/api/cron/absentee').catch(() => {
      // Silent fail – dashboard should not break if this fails
    });

    // Fire-and-forget birthday automation
    void fetch('/api/cron/birthdays').catch(() => {
      // Silent fail – dashboard should not break if this fails
    });
  }, []);

  const timezone = config?.systemInfo.timezone ?? 'Africa/Lagos';

  const today = new Date();
  const upcomingBirthdays = computeUpcomingBirthdays(people, today, 7);
  const todaysPrograms = programs.filter((p) => isSameDay(p.date, today));
  const openAbsenteeFollowUps = followUps.filter(
    (f) =>
      f.status === 'open' &&
      typeof f.type === 'string' &&
      f.type.toLowerCase().includes('absent'),
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of programs, follow-ups, upcoming birthdays, and key CRM
          signals.
        </p>
      </div>

      {/* Cards row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Today&apos;s programs */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Today&apos;s programs
          </h2>
          {todaysPrograms.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              No programs scheduled for today.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
              {todaysPrograms.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 dark:bg-slate-900/60"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-[11px] text-slate-500">
                    {p.startTime ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming birthdays (next 7 days) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Upcoming birthdays (next 7 days)
          </h2>
          {upcomingBirthdays.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              No birthdays in the next 7 days.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
              {upcomingBirthdays.slice(0, 5).map(({ person, date, daysUntil }) => (
                <li
                  key={person.id}
                  className="flex items-center justify-between rounded-md bg-orange-50/60 px-2 py-1 dark:bg-orange-950/40"
                >
                  <span className="font-medium">
                    {person.personalData.firstName}{' '}
                    {person.personalData.lastName}
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-200">
                    {formatBirthday(date)} ·{' '}
                    {daysUntil === 0 ? 'Today' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                  </span>
                </li>
              ))}
              {upcomingBirthdays.length > 5 && (
                <li className="mt-1 text-[11px] text-slate-500">
                  + {upcomingBirthdays.length - 5} more
                </li>
              )}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-slate-400">
            Timezone: {timezone}
          </p>
        </div>

        {/* Absentee follow-ups */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Absentee follow-ups
          </h2>
          <p className="mt-2 text-xs text-slate-500">
            Open follow-ups linked to absentee rules.
          </p>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-orange-500">
              {openAbsenteeFollowUps.length}
            </span>
            <span className="text-xs text-slate-500">
              open absentee follow-up
              {openAbsenteeFollowUps.length === 1 ? '' : 's'}
            </span>
          </div>

          {openAbsenteeFollowUps.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-slate-700 dark:text-slate-200">
              {openAbsenteeFollowUps.slice(0, 4).map((f) => (
                <li
                  key={f.id}
                  className="rounded-md bg-slate-50 px-2 py-1 dark:bg-slate-900/60"
                >
                  <div className="line-clamp-1 font-medium">{f.title}</div>
                  <div className="text-[11px] text-slate-500">
                    Due:{' '}
                    {f.dueAt
                      ? new Date(f.dueAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Not set'}
                  </div>
                </li>
              ))}
              {openAbsenteeFollowUps.length > 4 && (
                <li className="mt-1 text-[11px] text-slate-500">
                  + {openAbsenteeFollowUps.length - 4} more
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function isSameDay(isoDate: string, ref: Date): boolean {
  const d = new Date(isoDate);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function computeUpcomingBirthdays(
  people: Person[],
  today: Date,
  daysWindow: number,
): UpcomingBirthday[] {
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const results: UpcomingBirthday[] = [];

  for (const person of people) {
    const dob = person.personalData.dob;
    if (!dob) continue;

    const dobDate = new Date(dob);
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
      // already passed this year → consider next year
      const birthdayNextYear = new Date(
        todayMid.getFullYear() + 1,
        dobDate.getMonth(),
        dobDate.getDate(),
      );
      deltaDays = Math.round(
        (birthdayNextYear.getTime() - todayMid.getTime()) /
          (24 * 60 * 60 * 1000),
      );
      if (deltaDays < 0) continue;
      if (deltaDays > daysWindow) continue;
      results.push({
        person,
        date: birthdayNextYear,
        daysUntil: deltaDays,
      });
    } else if (deltaDays <= daysWindow) {
      results.push({
        person,
        date: birthdayThisYear,
        daysUntil: deltaDays,
      });
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

function formatBirthday(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
