'use client';

import { useEffect, useMemo, useState } from 'react';

import { getAllPrograms } from '@/lib/programs';
import {
  getProgramTallyStats,
  getProgramArrivalBuckets,
  getTalliesForProgram,
} from '@/lib/tally';

import type {
  Program,
  TallyProgramStats,
  TallyArrivalBucket,
  Tally,
} from '@/types';

export default function TallyReportsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');

  const [stats, setStats] = useState<TallyProgramStats | null>(null);
  const [buckets, setBuckets] = useState<TallyArrivalBucket[]>([]);
  const [tallies, setTallies] = useState<Tally[]>([]);

  useEffect(() => {
    setPrograms(getAllPrograms());
  }, []);

  useEffect(() => {
    if (!selectedProgramId) {
      setStats(null);
      setBuckets([]);
      setTallies([]);
      return;
    }
    setStats(getProgramTallyStats(selectedProgramId));
    setBuckets(getProgramArrivalBuckets(selectedProgramId));
    setTallies(getTalliesForProgram(selectedProgramId));
  }, [selectedProgramId]);

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Tally Reports & Arrival Patterns
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Analyse how tallies were issued and mapped, and basic arrival patterns
          based on gate issuance time.
        </p>
      </div>

      {/* Program selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
        {selectedProgram && (
          <p className="mt-2 text-xs text-slate-500">
            {selectedProgram.description ?? ''}
          </p>
        )}
      </div>

      {!selectedProgram ? (
        <p className="text-sm text-slate-500">
          Select a program above to view tally reports.
        </p>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Total tallies"
              value={stats?.totalTallies ?? 0}
            />
            <StatCard
              label="Issued"
              value={stats?.issuedCount ?? 0}
              accent="orange"
            />
            <StatCard
              label="Mapped to people"
              value={stats?.mappedCount ?? 0}
              accent="emerald"
            />
            <StatCard
              label="Void"
              value={stats?.voidCount ?? 0}
              accent="slate"
            />
          </div>

          {/* Arrival buckets */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Arrival pattern by hour (based on issuedAt)
            </h2>
            {buckets.length === 0 ? (
              <p className="text-xs text-slate-500">
                No issued tallies with valid timestamps for this program.
              </p>
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                {buckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <div className="w-32 text-slate-600 dark:text-slate-300">
                      {b.label}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-900/70">
                        <div
                          className="h-2 rounded-full bg-orange-500 dark:bg-orange-500"
                          style={{
                            width: `${Math.min(100, b.count * 10)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-10 text-right text-slate-600 dark:text-slate-300">
                      {b.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raw tallies table */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Tallies for this program
            </h2>
            {tallies.length === 0 ? (
              <p className="text-xs text-slate-500">
                No tallies found for this program.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto text-xs">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
                      <th className="px-3 py-1.5 text-left">Code</th>
                      <th className="px-3 py-1.5 text-left">Status</th>
                      <th className="px-3 py-1.5 text-left">Issued at</th>
                      <th className="px-3 py-1.5 text-left">Person</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tallies.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-slate-100 last:border-b-0 dark:border-slate-800"
                      >
                        <td className="px-3 py-1.5 font-semibold text-slate-900 dark:text-slate-50">
                          {t.code}
                        </td>
                        <td className="px-3 py-1.5 text-[11px] capitalize text-slate-600 dark:text-slate-300">
                          {t.status}
                        </td>
                        <td className="px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          {t.issuedAt
                            ? new Date(t.issuedAt).toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          {t.personId ?? 'Not mapped'}
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
  );
}

function StatCard(props: {
  label: string;
  value: number;
  accent?: 'orange' | 'emerald' | 'slate';
}) {
  const base =
    'text-base font-semibold text-slate-900 dark:text-slate-50';
  const accent =
    props.accent === 'orange'
      ? 'text-orange-600 dark:text-orange-300'
      : props.accent === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-300'
      : 'text-slate-900 dark:text-slate-50';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-slate-600 dark:text-slate-300">
        {props.label}
      </div>
      <div className={`${base} ${accent}`}>{props.value}</div>
    </div>
  );
}
