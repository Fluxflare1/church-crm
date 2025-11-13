'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  createProgram,
  getUpcomingPrograms,
  getPastPrograms,
  getAllPrograms,
} from '@/lib/programs';

import type { Program, ProgramType, ProgramStatus } from '@/types';

const PROGRAM_TYPES: { value: ProgramType; label: string }[] = [
  { value: 'sunday-service', label: 'Sunday Service' },
  { value: 'midweek-service', label: 'Midweek Service' },
  { value: 'prayer-meeting', label: 'Prayer Meeting' },
  { value: 'special-event', label: 'Special Event' },
  { value: 'other', label: 'Other' },
];

const PROGRAM_STATUSES: { value: ProgramStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

type ProgramFormState = {
  name: string;
  type: ProgramType;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  status: ProgramStatus;
  expectedAttendance: string;
};

export default function ProgramsPage() {
  const [upcomingPrograms, setUpcomingPrograms] = useState<Program[]>([]);
  const [pastPrograms, setPastPrograms] = useState<Program[]>([]);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ProgramFormState>({
    name: '',
    type: 'sunday-service',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
    status: 'planned',
    expectedAttendance: '',
  });

  useEffect(() => {
    refreshPrograms();
  }, []);

  function refreshPrograms() {
    setUpcomingPrograms(
      getUpcomingPrograms().sort((a, b) => a.date.localeCompare(b.date)),
    );
    setPastPrograms(
      getPastPrograms().sort((a, b) => b.date.localeCompare(a.date)),
    );
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validateForm(): string | null {
    if (!form.name.trim()) return 'Program name is required.';
    if (!form.date) return 'Program date is required.';
    if (!form.startTime) return 'Start time is required.';
    return null;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setCreating(true);
    try {
      const expectedAttendanceNumber =
        form.expectedAttendance.trim() === ''
          ? undefined
          : Number(form.expectedAttendance);

      const program = createProgram({
        name: form.name.trim(),
        type: form.type,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime || undefined,
        location: form.location || undefined,
        description: form.description || undefined,
        status: form.status,
        expectedAttendance: Number.isNaN(expectedAttendanceNumber)
          ? undefined
          : expectedAttendanceNumber,
      });

      setMessage(`Program "${program.name}" created successfully.`);
      setForm((prev) => ({
        ...prev,
        name: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        description: '',
        expectedAttendance: '',
      }));
      refreshPrograms();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to create program.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Programs
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create and manage services, meetings, and special events. These programs
          power Attendance, Tally, and Broadcasting.
        </p>
      </div>

      {/* Feedback messages */}
      {(message || error) && (
        <div className="space-y-2">
          {message && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr,1.7fr]">
        {/* Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Create Program
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Define a service or event. Expected attendance helps with tally generation
            and planning.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Program Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
                placeholder="e.g. Sunday Celebration Service"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Type
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
              >
                {PROGRAM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
              >
                {PROGRAM_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Start Time
              </label>
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                End Time (optional)
              </label>
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
                placeholder="e.g. Main Auditorium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Expected Attendance
              </label>
              <input
                type="number"
                min={0}
                name="expectedAttendance"
                value={form.expectedAttendance}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
                placeholder="Leave empty to use default"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Description (optional)
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
                rows={3}
                placeholder="Short description or notes about this program"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Program'}
              </button>
            </div>
          </form>
        </div>

        {/* Lists */}
        <div className="space-y-4">
          {/* Upcoming */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Upcoming Programs
            </h2>

            {upcomingPrograms.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                No upcoming programs defined yet.
              </p>
            ) : (
              <div className="mt-3 max-h-[260px] overflow-y-auto rounded-md border border-slate-100 text-xs dark:border-slate-800">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-900/40">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Expected</th>
                      <th className="px-3 py-2 font-medium">Location</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingPrograms.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-slate-100 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50"
                      >
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-100">
                          {p.name}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {typeLabel(p.type)}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {formatDate(p.date)}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {formatTimeRange(p.startTime, p.endTime)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={statusBadgeClass(p.status)}>
                            {capitalize(p.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {p.expectedAttendance ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {p.location ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          <a
                            href={`/broadcast?programId=${p.id}`}
                            className="inline-flex items-center rounded-md border border-orange-500 px-2 py-1 text-[11px] font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                          >
                            Broadcast
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Past */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Past Programs
            </h2>

            {pastPrograms.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No past programs yet.</p>
            ) : (
              <div className="mt-3 max-h-[220px] overflow-y-auto rounded-md border border-slate-100 text-xs dark:border-slate-800">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-900/40">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Expected</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastPrograms.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-slate-100 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50"
                      >
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-100">
                          {p.name}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {typeLabel(p.type)}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {formatDate(p.date)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={statusBadgeClass(p.status)}>
                            {capitalize(p.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {p.expectedAttendance ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          <a
                            href={`/broadcast?programId=${p.id}`}
                            className="inline-flex items-center rounded-md border border-orange-500 px-2 py-1 text-[11px] font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                          >
                            Broadcast
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Helpers -------------------------------------------------------------- */

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

function formatTimeRange(start: string, end?: string): string {
  if (!start && !end) return '—';
  if (!end) return start;
  return `${start}–${end}`;
}

function statusBadgeClass(status: ProgramStatus): string {
  switch (status) {
    case 'planned':
      return 'inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-200';
    case 'completed':
      return 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200';
    case 'cancelled':
      return 'inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/50 dark:text-red-200';
    default:
      return 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100';
  }
}

function typeLabel(type: ProgramType): string {
  const found = PROGRAM_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}
