'use client';

import { useEffect, useState, FormEvent } from 'react';
import { createProgram, getAllPrograms } from '@/lib/programs';
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

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    type: 'sunday-service' as ProgramType,
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
    status: 'planned' as ProgramStatus,
    expectedAttendance: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrograms(getAllPrograms());
    setLoading(false);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.date || !form.startTime) {
      setError('Name, date, and start time are required.');
      return;
    }

    const expectedAttendance = form.expectedAttendance
      ? Number(form.expectedAttendance)
      : undefined;

    if (form.expectedAttendance && Number.isNaN(expectedAttendance)) {
      setError('Expected attendance must be a number.');
      return;
    }

    setCreating(true);
    try {
      const program = createProgram({
        name: form.name,
        type: form.type,
        date: form.date, // "YYYY-MM-DD"
        startTime: form.startTime,
        endTime: form.endTime || undefined,
        location: form.location || undefined,
        description: form.description || undefined,
        status: form.status,
        expectedAttendance,
      });

      setPrograms((prev) => [...prev, program]);

      setForm({
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
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message ?? 'Failed to create program.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Programs
        </h1>
        <p className="text-sm text-slate-500">
          Create and manage services and events.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid gap-4 md:grid-cols-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm"
      >
        {error && (
          <div className="md:col-span-2 text-sm text-red-600">{error}</div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Name
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
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
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
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
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
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
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
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
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
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
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Location
          </label>
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="e.g. Main Auditorium"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Expected Attendance
          </label>
          <input
            name="expectedAttendance"
            value={form.expectedAttendance}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Leave blank to use default"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">
          Existing Programs
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : programs.length === 0 ? (
          <p className="text-sm text-slate-500">No programs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-4 text-left">Name</th>
                  <th className="py-2 pr-4 text-left">Type</th>
                  <th className="py-2 pr-4 text-left">Date</th>
                  <th className="py-2 pr-4 text-left">Time</th>
                  <th className="py-2 pr-4 text-left">Status</th>
                  <th className="py-2 pr-4 text-left">Expected</th>
                  <th className="py-2 pr-4 text-left">Location</th>
                </tr>
              </thead>
              <tbody>
                {programs
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-2 pr-4">{p.name}</td>
                      <td className="py-2 pr-4">{p.type}</td>
                      <td className="py-2 pr-4">{p.date}</td>
                      <td className="py-2 pr-4">
                        {p.startTime}
                        {p.endTime ? ` – ${p.endTime}` : ''}
                      </td>
                      <td className="py-2 pr-4 capitalize">{p.status}</td>
                      <td className="py-2 pr-4">
                        {p.expectedAttendance ?? '—'}
                      </td>
                      <td className="py-2 pr-4">{p.location ?? '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
