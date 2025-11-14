'use client';

import { useEffect, useMemo, useState } from 'react';

import { getAllPrograms } from '@/lib/programs';
import { getAllPeople } from '@/lib/people';
import {
  getAttendanceForProgram,
  markAttendance,
} from '@/lib/attendance';
import { getSystemConfig } from '@/lib/config';

import type {
  Program,
  Person,
  AttendanceRecord,
  AttendanceStatus,
  SystemConfig,
} from '@/types';

const CURRENT_USER_ID = 'system'; // TODO: replace with real authenticated user ID

export default function AttendancePage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [absenteeRunning, setAbsenteeRunning] = useState(false);
  const [absenteeMessage, setAbsenteeMessage] = useState<string | null>(null);
  const [absenteeError, setAbsenteeError] = useState<string | null>(null);

  useEffect(() => {
    setPrograms(
      getAllPrograms().sort((a, b) => a.date.localeCompare(b.date)),
    );
    setPeople(getAllPeople());
    setConfig(getSystemConfig());
  }, []);

  useEffect(() => {
    if (!selectedProgramId) {
      setAttendance([]);
      return;
    }
    setAttendance(getAttendanceForProgram(selectedProgramId));
  }, [selectedProgramId]);

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  );

  const attendanceByPersonId = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of attendance) {
      map.set(r.personId, r);
    }
    return map;
  }, [attendance]);

  const scope =
    config?.attendance?.defaultScope ?? 'members-and-regular-guests';

  const scopedPeople = useMemo(
    () => people.filter((p) => isPersonVisibleForScope(p, scope)),
    [people, scope],
  );

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let excused = 0;
    for (const r of attendance) {
      if (r.status === 'present') present += 1;
      else if (r.status === 'absent') absent += 1;
      else if (r.status === 'excused') excused += 1;
    }
    return {
      present,
      absent,
      excused,
      totalTracked: scopedPeople.length,
    };
  }, [attendance, scopedPeople.length]);

  async function handleMark(
    personId: string,
    status: AttendanceStatus,
  ) {
    if (!selectedProgramId) return;

    setSavingId(personId);
    try {
      const record = markAttendance({
        programId: selectedProgramId,
        personId,
        status,
        markedByUserId: CURRENT_USER_ID,
      });

      setAttendance((prev) => {
        const idx = prev.findIndex((r) => r.id === record.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = record;
          return clone;
        }
        return [...prev, record];
      });
    } finally {
      setSavingId(null);
    }
  }

  async function handleRunAbsenteeCheck() {
    setAbsenteeRunning(true);
    setAbsenteeMessage(null);
    setAbsenteeError(null);

    try {
      const res = await fetch('/api/cron/absentees', {
        method: 'POST',
      });

      const body = await res.json();

      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? 'Failed to run absentee automation.');
      }

      const { result } = body as {
        result: {
          ruleEnabled: boolean;
          consideredProgramsCount: number;
          absenteesCount: number;
          followUpsCreated: number;
        };
      };

      setAbsenteeMessage(
        `Checked ${result.consideredProgramsCount} program(s), detected ${result.absenteesCount} absentee(s), created ${result.followUpsCreated} follow-up(s).`,
      );
    } catch (err: unknown) {
      const e = err as Error;
      setAbsenteeError(e.message ?? 'Failed to run absentee automation.');
    } finally {
      setAbsenteeRunning(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Attendance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Mark attendance for programs and use absentee automation to drive
            follow-ups.
          </p>
        </div>

        <div className="flex flex-col items-end space-y-2">
          <button
            type="button"
            onClick={handleRunAbsenteeCheck}
            disabled={absenteeRunning}
            className="inline-flex items-center rounded-md border border-orange-500 bg-white px-3 py-1.5 text-xs font-medium text-orange-600 shadow-sm hover:bg-orange-50 disabled:opacity-60 dark:bg-slate-900 dark:hover:bg-orange-950/20"
          >
            {absenteeRunning ? 'Running absentee check…' : 'Run absentee check now'}
          </button>
          {absenteeMessage && (
            <p className="max-w-sm text-[11px] text-emerald-600 dark:text-emerald-400">
              {absenteeMessage}
            </p>
          )}
          {absenteeError && (
            <p className="max-w-sm text-[11px] text-red-600 dark:text-red-400">
              {absenteeError}
            </p>
          )}
        </div>
      </div>

      {/* Program selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Program
            </label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
            >
              <option value="">Select a program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ·{' '}
                  {new Date(p.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Tracking scope
            </label>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
              {scopeDescription(scope)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Summary
            </label>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <span className="font-semibold text-emerald-600">
                  {summary.present}
                </span>{' '}
                present
              </div>
              <div>
                <span className="font-semibold text-red-600">
                  {summary.absent}
                </span>{' '}
                absent
              </div>
              <div>
                <span className="font-semibold text-slate-700">
                  {summary.excused}
                </span>{' '}
                excused
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Tracking {summary.totalTracked} person(s) in current scope.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {!selectedProgram ? (
          <p className="text-sm text-slate-500">
            Select a program above to start marking attendance.
          </p>
        ) : scopedPeople.length === 0 ? (
          <p className="text-sm text-slate-500">
            No people found for the selected scope.
          </p>
        ) : (
          <div className="max-h-[540px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scopedPeople.map((person) => {
                  const rec = attendanceByPersonId.get(person.id);
                  const status = rec?.status ?? 'none';

                  return (
                    <tr
                      key={person.id}
                      className="border-b border-slate-100 text-xs text-slate-700 hover:bg-slate-50/70 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900/60"
                    >
                      <td className="px-3 py-2">
                        {person.personalData.firstName}{' '}
                        {person.personalData.lastName}
                      </td>
                      <td className="px-3 py-2">
                        <span className="capitalize">
                          {person.category === 'guest'
                            ? person.evolution?.guestType ?? 'guest'
                            : 'member'}
                        </span>
                        {person.engagement?.isWorker && (
                          <span className="ml-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-200">
                            Workforce
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={status as AttendanceStatus | 'none'} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            disabled={savingId === person.id}
                            onClick={() => handleMark(person.id, 'present')}
                            className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium shadow-sm ${
                              status === 'present'
                                ? 'bg-emerald-500 text-white'
                                : 'border border-emerald-500 bg-white text-emerald-600 hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-emerald-950/40'
                            }`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            disabled={savingId === person.id}
                            onClick={() => handleMark(person.id, 'absent')}
                            className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium shadow-sm ${
                              status === 'absent'
                                ? 'bg-red-500 text-white'
                                : 'border border-red-500 bg-white text-red-600 hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-950/40'
                            }`}
                          >
                            A
                          </button>
                          <button
                            type="button"
                            disabled={savingId === person.id}
                            onClick={() => handleMark(person.id, 'excused')}
                            className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium shadow-sm ${
                              status === 'excused'
                                ? 'bg-slate-700 text-white'
                                : 'border border-slate-500 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900/70'
                            }`}
                          >
                            E
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function isPersonVisibleForScope(
  person: Person,
  scope: SystemConfig['attendance']['defaultScope'],
): boolean {
  switch (scope) {
    case 'all':
      return true;
    case 'members-only':
      return person.category === 'member';
    case 'guests-only':
      return person.category === 'guest';
    case 'members-and-regular-guests':
      if (person.category === 'member') return true;
      if (person.category === 'guest') {
        return person.evolution?.guestType === 'regular';
      }
      return false;
    default:
      return true;
  }
}

function scopeDescription(
  scope: SystemConfig['attendance']['defaultScope'],
): string {
  switch (scope) {
    case 'all':
      return 'All guests and members are listed for attendance.';
    case 'members-only':
      return 'Only members are listed for attendance.';
    case 'guests-only':
      return 'Only guests are listed for attendance.';
    case 'members-and-regular-guests':
      return 'Members and regular guests are listed for attendance.';
    default:
      return 'Attendance scope not configured.';
  }
}

function StatusBadge(props: { status: AttendanceStatus | 'none' }) {
  const { status } = props;

  if (status === 'present') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
        Present
      </span>
    );
  }

  if (status === 'absent') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">
        Absent
      </span>
    );
  }

  if (status === 'excused') {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
        Excused
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-900/60 dark:text-slate-300">
      Not marked
    </span>
  );
}
