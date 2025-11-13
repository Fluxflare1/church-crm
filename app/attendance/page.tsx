'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAllPrograms } from '@/lib/programs';
import { getAllPeople } from '@/lib/people';
import { bulkMarkAttendanceForProgram } from '@/lib/attendance';

import type { Program, Person } from '@/types';

const CURRENT_USER_ID = 'system'; // TODO: replace with actual authenticated user ID

export default function AttendancePage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const allPrograms = getAllPrograms().sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    setPrograms(allPrograms);

    const allPeople = getAllPeople().slice().sort((a, b) => {
      const aName = `${a.personalData.firstName} ${a.personalData.lastName}`.toLowerCase();
      const bName = `${b.personalData.firstName} ${b.personalData.lastName}`.toLowerCase();
      return aName.localeCompare(bName);
    });

    setPeople(allPeople);
  }, []);

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  );

  const filteredPeople = useMemo(() => {
    if (!search.trim()) return people;
    const term = search.toLowerCase();
    return people.filter((p) => {
      const name = `${p.personalData.firstName} ${p.personalData.lastName}`.toLowerCase();
      const phone = p.personalData.phone?.toLowerCase() ?? '';
      return name.includes(term) || phone.includes(term);
    });
  }, [people, search]);

  const totalPresent = useMemo(
    () => Object.values(presentMap).filter(Boolean).length,
    [presentMap],
  );

  function handleProgramChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const programId = e.target.value;
    setSelectedProgramId(programId);
    setPresentMap({});
    setMessage(null);
    setError(null);
  }

  function togglePresent(personId: string) {
    setPresentMap((prev) => ({
      ...prev,
      [personId]: !prev[personId],
    }));
  }

  async function handleSave() {
    setMessage(null);
    setError(null);

    if (!selectedProgram) {
      setError('Please select a program first.');
      return;
    }

    if (people.length === 0) {
      setError('No people available to mark attendance for.');
      return;
    }

    const entries = people.map((p) => ({
      personId: p.id,
      present: !!presentMap[p.id],
      checkInTimeIso: presentMap[p.id] ? new Date().toISOString() : undefined,
    }));

    const presentCount = entries.filter((e) => e.present).length;
    if (presentCount === 0) {
      setError('No one is marked as present yet.');
      return;
    }

    setSaving(true);
    try {
      const updated = bulkMarkAttendanceForProgram({
        programId: selectedProgram.id,
        recordedByUserId: CURRENT_USER_ID,
        entries,
      });

      setMessage(
        `Saved attendance for ${presentCount} person${presentCount === 1 ? '' : 's'} (${updated.length} record${updated.length === 1 ? '' : 's'} updated).`,
      );
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Attendance
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a program and mark who is present. Attendance updates guest/member
          evolution and absentee detection behind the scenes.
        </p>
      </div>

      {/* Program selector + summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-[1.4fr,1.6fr]">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Program
            </label>
            <select
              value={selectedProgramId}
              onChange={handleProgramChange}
              className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
            >
              <option value="">Select a program...</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatDate(p.date)} · {p.name}
                </option>
              ))}
            </select>
            {selectedProgram && (
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-medium">{selectedProgram.name}</span>{' '}
                ({formatDate(selectedProgram.date)} at{' '}
                {formatTimeRange(selectedProgram.startTime, selectedProgram.endTime)}
                ){selectedProgram.location ? ` · ${selectedProgram.location}` : ''}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
              <div className="text-[11px] text-slate-500">People loaded</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-50">
                {people.length}
              </div>
            </div>
            <div className="rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-950/40">
              <div className="text-[11px] text-orange-700 dark:text-orange-200">
                Marked present
              </div>
              <div className="mt-0.5 text-sm font-semibold text-orange-700 dark:text-orange-200">
                {totalPresent}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
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

      {/* People list */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Mark Attendance
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Tick the checkbox for everyone present in this program. You can search
              by name or phone.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people..."
              className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700 md:w-64"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !selectedProgram}
              className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-xs font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save attendance'}
            </button>
          </div>
        </div>

        {people.length === 0 ? (
          <p className="text-xs text-slate-500">
            No people found. Register guests or onboard members first.
          </p>
        ) : (
          <div className="max-h-[440px] overflow-y-auto rounded-md border border-slate-100 text-xs dark:border-slate-800">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-900/40">
                  <th className="px-3 py-2 font-medium">Present</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((person) => {
                  const id = person.id;
                  const checked = !!presentMap[id];

                  return (
                    <tr
                      key={id}
                      className="border-t border-slate-100 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePresent(id)}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 dark:border-slate-700"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 dark:text-slate-100">
                            {person.personalData.firstName}{' '}
                            {person.personalData.lastName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {person.category === 'guest'
                              ? person.evolution.guestType
                                ? `${capitalize(person.evolution.guestType)} guest`
                                : 'Guest'
                              : person.evolution.memberRating
                                ? `${capitalize(person.evolution.memberRating)} member`
                                : 'Member'}
                            {person.engagement.isWorker ? ' · Workforce' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 capitalize text-[11px] text-slate-600 dark:text-slate-300">
                        {person.category}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                        {person.personalData.phone ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {person.engagement.notes ?? '—'}
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
