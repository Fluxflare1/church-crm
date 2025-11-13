'use client';

import { useEffect, useState } from 'react';
import { getAllPrograms } from '@/lib/programs';
import { getAllPeople } from '@/lib/people';
import { bulkMarkAttendanceForProgram } from '@/lib/attendance';

import type { Program, Person } from '@/types';

const CURRENT_USER_ID = 'system';

export default function AttendancePage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPrograms(getAllPrograms());
    setPeople(getAllPeople());
  }, []);

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const programId = e.target.value;
    setSelectedProgramId(programId);
    setPresentMap({});
    setMessage(null);
  };

  const togglePresent = (personId: string) => {
    setPresentMap((prev) => ({
      ...prev,
      [personId]: !prev[personId],
    }));
  };

  const handleSave = async () => {
    if (!selectedProgramId) return;
    setSaving(true);
    setMessage(null);

    try {
      const entries = Object.keys(presentMap).map((personId) => ({
        personId,
        present: !!presentMap[personId],
      }));

      // If no one has been toggled, nothing to do
      if (entries.length === 0) {
        setMessage('No changes to save.');
        setSaving(false);
        return;
      }

      bulkMarkAttendanceForProgram({
        programId: selectedProgramId,
        recordedByUserId: CURRENT_USER_ID,
        entries,
      });

      setMessage('Attendance saved successfully.');
    } catch (err: unknown) {
      const error = err as Error;
      setMessage(error.message ?? 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Attendance
        </h1>
        <p className="text-sm text-slate-500">
          Mark attendance for programs and track presence.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Program
          </label>
          <select
            value={selectedProgramId}
            onChange={handleProgramChange}
            className="mt-1 w-full max-w-md rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select a program...</option>
            {programs
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.date} – {p.name}
                </option>
              ))}
          </select>
        </div>

        {selectedProgramId && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                People
              </h2>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>

            {message && (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {message}
              </p>
            )}

            {people.length === 0 ? (
              <p className="text-sm text-slate-500">
                No people yet. Register guests or onboard members first.
              </p>
            ) : (
              <div className="max-h-[420px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-md">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                      <th className="py-2 px-3 text-left">Name</th>
                      <th className="py-2 px-3 text-left">Category</th>
                      <th className="py-2 px-3 text-center">Present?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((person) => {
                      const key = person.id;
                      const present = !!presentMap[key];

                      return (
                        <tr
                          key={person.id}
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                        >
                          <td className="py-2 px-3">
                            {person.personalData.firstName}{' '}
                            {person.personalData.lastName}
                          </td>
                          <td className="py-2 px-3 capitalize">
                            {person.category}
                            {person.engagement.isWorker ? ' (Workforce)' : ''}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => togglePresent(key)}
                              className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium ${
                                present
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {present ? 'Present' : 'Not Marked'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
