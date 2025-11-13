'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getPersonById } from '@/lib/people';
import { getAllPrograms } from '@/lib/programs';
import { getAllFollowUps, getActionsForFollowUp } from '@/lib/follow-ups';

import type {
  Person,
  Program,
  AttendanceHistoryEntry,
  FollowUp,
  FollowUpActionLogEntry,
} from '@/types';

type PersonProfilePageProps = {
  params: {
    id: string;
  };
};

export default function PersonProfilePage({ params }: PersonProfilePageProps) {
  const router = useRouter();
  const { id } = params;

  const [person, setPerson] = useState<Person | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [actionsByFollowUpId, setActionsByFollowUpId] = useState<
    Record<string, FollowUpActionLogEntry[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      const p = getPersonById(id);
      if (!p) {
        setPerson(null);
        setPrograms([]);
        setFollowUps([]);
        setActionsByFollowUpId({});
        return;
      }

      setPerson(p);

      const progs = getAllPrograms();
      setPrograms(progs);

      const allFollowUps = getAllFollowUps();
      const personFollowUps = allFollowUps
        .filter((fu) => fu.personId === id)
        .sort((a, b) => {
          const aKey = a.dueDate ?? a.createdAt;
          const bKey = b.dueDate ?? b.createdAt;
          return bKey.localeCompare(aKey);
        });

      setFollowUps(personFollowUps.slice(0, 5)); // show most recent 5

      const actionsMap: Record<string, FollowUpActionLogEntry[]> = {};
      for (const fu of personFollowUps) {
        const actions = getActionsForFollowUp(fu.id).sort((a, b) =>
          b.timestamp.localeCompare(a.timestamp),
        );
        if (actions.length > 0) {
          actionsMap[fu.id] = actions;
        }
      }
      setActionsByFollowUpId(actionsMap);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const programMap = useMemo(() => {
    const m = new Map<string, Program>();
    for (const p of programs) {
      m.set(p.id, p);
    }
    return m;
  }, [programs]);

  const attendanceHistory: AttendanceHistoryEntry[] = useMemo(() => {
    if (!person) return [];
    const history = person.evolution.attendanceHistory ?? [];
    return [...history]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [person]);

  const birthdayInfo = useMemo(() => {
    if (!person) return null;
    // Handle both dateOfBirth and legacy dob if present
    const dobIso =
      (person.personalData as any).dob || person.personalData.dateOfBirth;
    if (!dobIso) return null;
    return computeNextBirthdayInfo(dobIso);
  }, [person]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500">Loading person profile...</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="p-6 space-y-4">
        <button
          type="button"
          onClick={() => router.push('/people')}
          className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to people
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Person not found.
        </div>
      </div>
    );
  }

  const { personalData, evolution, engagement, assignment, category } = person;

  const name = `${personalData.firstName} ${personalData.lastName}`.trim();
  const phone = personalData.phone || '—';
  const email = personalData.email || '—';

  const isGuest = category === 'guest';
  const isMember = category === 'member';

  const roleBadge = isGuest
    ? evolution.guestType
      ? `${capitalize(evolution.guestType)} Guest`
      : 'Guest'
    : evolution.memberRating
      ? `${capitalize(evolution.memberRating)} Member`
      : 'Member';

  const readyForPromotion = isGuest && evolution.readyForPromotion;

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/people')}
          className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to people
        </button>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              {name || 'Unnamed person'}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                {capitalize(category)}
              </span>
              <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-200">
                {roleBadge}
              </span>
              {engagement.isWorker && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100">
                  Workforce
                </span>
              )}
              {readyForPromotion && (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-100">
                  Ready for promotion
                </span>
              )}
              {engagement.doNotContact && (
                <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-100">
                  Do not contact
                </span>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300">
            <div>
              <span className="font-medium">Phone:</span> {phone}
            </div>
            <div>
              <span className="font-medium">Email:</span> {email}
            </div>
            {birthdayInfo && (
              <div className="mt-1">
                <span className="font-medium">Next birthday:</span>{' '}
                {birthdayInfo.label}{' '}
                <span className="text-[11px] text-slate-500">
                  {birthdayInfo.isToday
                    ? 'Today 🎉'
                    : birthdayInfo.daysUntil === 1
                      ? 'Tomorrow'
                      : `In ${birthdayInfo.daysUntil} days`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary + assignment */}
      <div className="grid gap-4 md:grid-cols-[2fr,1.4fr]">
        {/* Attendance & evolution */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Attendance & Evolution
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
            <SummaryStat
              label="Total visits"
              value={evolution.totalVisits.toString()}
            />
            <SummaryStat
              label="Current streak"
              value={`${evolution.currentStreak} week${evolution.currentStreak === 1 ? '' : 's'}`}
            />
            <SummaryStat
              label="Longest streak"
              value={`${evolution.longestStreak} week${evolution.longestStreak === 1 ? '' : 's'}`}
            />
            <SummaryStat
              label="Last visit"
              value={evolution.lastVisitDate ? formatDate(evolution.lastVisitDate) : '—'}
            />
          </div>

          <div className="mt-4 text-[11px] text-slate-500">
            {isGuest && (
              <p>
                This person is currently a{' '}
                <span className="font-medium">{roleBadge.toLowerCase()}</span>.{' '}
                {readyForPromotion
                  ? 'They meet the promotion criteria based on your SystemConfig.evolution thresholds.'
                  : 'Promotion to member depends on your configured thresholds.'}
              </p>
            )}
            {isMember && (
              <p>
                This person is a{' '}
                <span className="font-medium">{roleBadge.toLowerCase()}</span>. Member
                rating is driven by attendance performance according to your configured
                thresholds.
              </p>
            )}
          </div>
        </div>

        {/* Assignment & engagement */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Assignment & Engagement
          </h2>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Primary RM</span>
              <span className="font-medium">
                {assignment.primaryRmUserId ?? 'Unassigned'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Secondary RMs</span>
              <span className="font-medium">
                {assignment.secondaryRmUserIds?.length
                  ? assignment.secondaryRmUserIds.join(', ')
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Group / Cell</span>
              <span className="font-medium">
                {assignment.groupId ? assignment.groupId : '—'}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Receives broadcasts</span>
              <span className="font-medium">
                {engagement.receivesBroadcasts ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance history + follow-ups */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr,1.6fr]">
        {/* Attendance history */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Recent Attendance
          </h2>

          {attendanceHistory.length === 0 ? (
            <p className="text-xs text-slate-500">
              No recorded attendance history yet for this person.
            </p>
          ) : (
            <div className="max-h-[260px] overflow-y-auto rounded-md border border-slate-100 text-xs dark:border-slate-800">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-900/40">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Program</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((entry) => {
                    const program = programMap.get(entry.programId);
                    return (
                      <tr
                        key={`${entry.programId}-${entry.date}-${entry.status}`}
                        className="border-t border-slate-100 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50"
                      >
                        <td className="px-3 py-2">{formatDate(entry.date)}</td>
                        <td className="px-3 py-2">
                          {program?.name ?? 'Unknown program'}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              entry.status === 'present'
                                ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
                                : 'inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-100'
                            }
                          >
                            {capitalize(entry.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Follow-ups & activity */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            Follow-ups & Activity
          </h2>

          {followUps.length === 0 ? (
            <p className="text-xs text-slate-500">
              No follow-ups have been recorded for this person yet.
            </p>
          ) : (
            <div className="space-y-3">
              {followUps.map((fu) => {
                const actions = actionsByFollowUpId[fu.id] ?? [];
                const latestAction = actions[0];

                return (
                  <div
                    key={fu.id}
                    className="rounded-md border border-slate-100 bg-slate-50/60 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-800 dark:text-slate-100">
                        {fu.type}
                      </div>
                      <span className={followUpStatusBadgeClass(fu.status)}>
                        {capitalize(fu.status)}
                      </span>
                    </div>

                    <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                      <div>
                        <span className="font-medium">Priority:</span>{' '}
                        {capitalize(fu.priority)}
                      </div>
                      <div>
                        <span className="font-medium">Due:</span>{' '}
                        {fu.dueDate ? formatDate(fu.dueDate) : '—'}
                      </div>
                      <div>
                        <span className="font-medium">Preferred channel:</span>{' '}
                        {fu.preferredChannel
                          ? channelLabel(fu.preferredChannel)
                          : 'Not specified'}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>{' '}
                        {formatDate(fu.createdAt)}
                      </div>
                    </div>

                    {fu.notes && (
                      <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
                        {fu.notes}
                      </p>
                    )}

                    {latestAction && (
                      <div className="mt-2 rounded border border-slate-100 bg-white/70 px-2.5 py-1.5 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700 dark:text-slate-100">
                            Last action
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {formatDateTime(latestAction.timestamp)}
                          </span>
                        </div>
                        <div className="mt-0.5">
                          <span className="font-medium">
                            {channelLabel(latestAction.channel)}:
                          </span>{' '}
                          {latestAction.outcome || 'No notes'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 text-right">
            <button
              type="button"
              onClick={() => router.push('/follow-ups')}
              className="inline-flex items-center rounded-md border border-orange-500 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40"
            >
              View all follow-ups →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Small helpers ------------------------------------------------------- */

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </div>
    </div>
  );
}

function capitalize(str: string | undefined | null): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function followUpStatusBadgeClass(status: string): string {
  switch (status) {
    case 'open':
      return 'inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-200';
    case 'in-progress':
      return 'inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-200';
    case 'completed':
      return 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200';
    case 'on-hold':
      return 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100';
    default:
      return 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100';
  }
}

function channelLabel(channel: string): string {
  switch (channel) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'sms':
      return 'SMS';
    case 'email':
      return 'Email';
    case 'phone-call':
    case 'call':
      return 'Phone call';
    case 'visit':
      return 'Visit';
    default:
      return channel;
  }
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffInDays(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = stripTime(b).getTime() - stripTime(a).getTime();
  return Math.round(diff / msPerDay);
}

function computeNextBirthday(dob: Date, today: Date): Date {
  const year = today.getFullYear();
  const month = dob.getMonth();
  const day = dob.getDate();

  const thisYear = new Date(year, month, day);
  if (thisYear >= stripTime(today)) {
    return thisYear;
  }
  return new Date(year + 1, month, day);
}

function computeNextBirthdayInfo(dobIso: string) {
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;

  const today = stripTime(new Date());
  const next = computeNextBirthday(dob, today);
  const daysUntil = diffInDays(today, next);

  const label = next.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return {
    nextDate: next,
    daysUntil,
    isToday: daysUntil === 0,
    label,
  };
}
