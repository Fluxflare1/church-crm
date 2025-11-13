'use client';

import { useEffect, useState, FormEvent } from 'react';
import { getAllPrograms } from '@/lib/programs';
import {
  generateTalliesForProgram,
  getTalliesForProgram,
  getTallyReportForProgram,
} from '@/lib/tally';

import type { Program, Tally, TallyReport } from '@/types';

export default function TallyPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [tallies, setTallies] = useState<Tally[]>([]);
  const [report, setReport] = useState<TallyReport | null>(null);
  const [count, setCount] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrograms(getAllPrograms());
  }, []);

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const programId = e.target.value;
    setSelectedProgramId(programId);
    setError(null);

    if (programId) {
      setTallies(getTalliesForProgram(programId));
      try {
        const rep = getTallyReportForProgram(programId);
        setReport(rep);
      } catch {
        setReport(null);
      }
    } else {
      setTallies([]);
      setReport(null);
    }
  };

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProgramId) {
      setError('Select a program first.');
      return;
    }

    const parsed = count ? Number(count) : undefined;
    if (count && Number.isNaN(parsed)) {
      setError('Count must be a number.');
      return;
    }

    setGenerating(true);
    try {
      const { tallies: newTallies } = generateTalliesForProgram({
        programId: selectedProgramId,
        count: parsed,
      });

      const combined = [...tallies, ...newTallies];
      setTallies(combined);

      const rep = getTallyReportForProgram(selectedProgramId);
      setReport(rep);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message ?? 'Failed to generate tallies.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Tally Management
        </h1>
        <p className="text-sm text-slate-500">
          Generate and view tallies for check-in tracking.
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
          <>
            <form
              onSubmit={handleGenerate}
              className="flex flex-col md:flex-row gap-3 items-end"
            >
              <div className="flex-1 max-w-xs">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Number of tallies to generate
                </label>
                <input
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Leave blank to use expected attendance"
                />
              </div>
              <button
                type="submit"
                disabled={generating}
                className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Tallies'}
              </button>
            </form>

            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}

            {report && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <div className="text-xs text-slate-500">Total Tallies</div>
                  <div className="mt-1 text-lg font-semibold">
                    {report.totalTallies}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <div className="text-xs text-slate-500">Issued</div>
                  <div className="mt-1 text-lg font-semibold">
                    {report.issuedCount}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <div className="text-xs text-slate-500">Logged</div>
                  <div className="mt-1 text-lg font-semibold">
                    {report.loggedCount}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <div className="text-xs text-slate-500">
                    Arrival Buckets
                  </div>
                  <div className="mt-1 space-y-1 text-xs">
                    {report.arrivalBuckets.map((b) => (
                      <div key={b.label} className="flex justify-between">
                        <span>{b.label}</span>
                        <span className="font-medium">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Tallies
              </h2>
              {tallies.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No tallies generated yet for this program.
                </p>
              ) : (
                <div className="max-h-[360px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-md">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                        <th className="py-2 px-3 text-left">Code</th>
                        <th className="py-2 px-3 text-left">Status</th>
                        <th className="py-2 px-3 text-left">Issued To</th>
                        <th className="py-2 px-3 text-left">Issued At</th>
                        <th className="py-2 px-3 text-left">Logged At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tallies.map((t) => (
                        <tr
                          key={t.id}
                          className="border-b border-slate-100 dark:border-slate-800"
                        >
                          <td className="py-2 px-3 font-mono text-xs">
                            {t.code}
                          </td>
                          <td className="py-2 px-3 capitalize">
                            {t.status}
                          </td>
                          <td className="py-2 px-3 text-xs">
                            {t.issuedToPersonId ?? '—'}
                          </td>
                          <td className="py-2 px-3 text-xs">
                            {t.issuedAt ?? '—'}
                          </td>
                          <td className="py-2 px-3 text-xs">
                            {t.loggedAt ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
