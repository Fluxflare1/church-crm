'use client';

import { useEffect, useMemo, useState } from 'react';

import { getAllPrograms } from '@/lib/programs';
import { getAllPeople } from '@/lib/people';
import {
  getTalliesForProgram,
  generateTalliesForProgram,
  issueNextAvailableTally,
} from '@/lib/tally';
import { getSystemConfig } from '@/lib/config';

import type {
  Program,
  Person,
  SystemConfig,
  Tally,
} from '@/types';

const CURRENT_USER_ID = 'system'; // TODO: replace with real authenticated user ID

export default function TallyIssuePage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [tallies, setTallies] = useState<Tally[]>([]);

  const [expectedCountInput, setExpectedCountInput] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const [personQuery, setPersonQuery] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [issuing, setIssuing] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrograms(getAllPrograms());
    setPeople(getAllPeople());
    setConfig(getSystemConfig());
  }, []);

  useEffect(() => {
    if (!selectedProgramId) {
      setTallies([]);
      return;
    }
    setTallies(getTalliesForProgram(selectedProgramId));
  }, [selectedProgramId]);

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  );

  const stats = useMemo(() => {
    let issued = 0;
    let mapped = 0;
    for (const t of tallies) {
      if (t.status === 'issued' || t.status === 'logged') {
        issued += 1;
      }
      if (t.personId) {
        mapped += 1;
      }
    }
    return {
      total: tallies.length,
      issued,
      mapped,
      available: tallies.length - issued,
    };
  }, [tallies]);

  const filteredPeople = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    if (!q) return people;

    return people.filter((p) => {
      const fullName = `${p.personalData.firstName ?? ''} ${
        p.personalData.lastName ?? ''
      }`.toLowerCase();
      const phone = (p.personalData.phone ?? '').toLowerCase();
      return (
        fullName.includes(q) ||
        phone.includes(q)
      );
    });
  }, [people, personQuery]);

  async function handleGenerateTallies() {
    if (!selectedProgramId) return;

    const cfg = config;
    if (!cfg) return;

    setGenerating(true);
    setFeedback(null);
    setError(null);

    try {
      const target =
        parseInt(expectedCountInput, 10) ||
        cfg.tally.defaultExpectedAttendance ||
        0;

      if (!target || target <= 0) {
        throw new Error(
          'Please enter a positive expected count or configure a default in Settings → Tally.',
        );
      }

      generateTalliesForProgram({
        programId: selectedProgramId,
        expectedCount: target,
      });

      setTallies(getTalliesForProgram(selectedProgramId));
      setFeedback(`Tallies generated/ensured up to ${target} codes.`);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message ?? 'Failed to generate tallies.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleIssueTally(forPerson?: boolean) {
    if (!selectedProgramId) return;

    setIssuing(true);
    setFeedback(null);
    setError(null);

    try {
      const personId = forPerson ? selectedPersonId || undefined : undefined;

      const issued = issueNextAvailableTally(
        selectedProgramId,
        CURRENT_USER_ID,
        personId,
        'rm',
      );

      setTallies(getTalliesForProgram(selectedProgramId));

      if (personId) {
        const person = people.find((p) => p.id === personId);
        const name = person
          ? `${person.personalData.firstName} ${person.personalData.lastName}`
          : 'selected person';
        setFeedback(
          `Tally ${issued.code} issued to ${name} at ${new Date(
            issued.issuedAt ?? issued.updatedAt,
          ).toLocaleTimeString()}.`,
        );
      } else {
        setFeedback(
          `Tally ${issued.code} issued anonymously at ${new Date(
            issued.issuedAt ?? issued.updatedAt,
          ).toLocaleTimeString()}.`,
        );
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message ?? 'Failed to issue tally.');
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Tally Issuance
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Issue tallies at the gate to capture actual arrival time. Mapping to
          profiles can happen later via the Log page or self-service.
        </p>
      </div>

      {/* Program selector + stats */}
      <div className="grid gap-4 lg:grid-cols-[2fr,1.5fr]">
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

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Tally Stats
          </h2>
          <dl className="mt-2 grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <dt>Total tallies</dt>
              <dd className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {stats.total}
              </dd>
            </div>
            <div>
              <dt>Issued</dt>
              <dd className="text-base font-semibold text-orange-600 dark:text-orange-300">
                {stats.issued}
              </dd>
            </div>
            <div>
              <dt>Mapped to people</dt>
              <dd className="text-base font-semibold text-emerald-600 dark:text-emerald-300">
                {stats.mapped}
              </dd>
            </div>
            <div>
              <dt>Available</dt>
              <dd className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {stats.available}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Generator + issuance */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr,2fr]">
        {/* Generator card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Generate tallies for this program
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            You can top-up codes up to an expected attendance. Existing codes are
            preserved.
          </p>

          <div className="mt-3 space-y-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
              Expected count (empty = use Settings default)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={expectedCountInput}
              onChange={(e) => setExpectedCountInput(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerateTallies}
            disabled={!selectedProgramId || generating}
            className="mt-3 inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600 disabled:opacity-60"
          >
            {generating ? 'Generating…' : 'Ensure tallies up to count'}
          </button>
        </div>

        {/* Issuance card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Issue tallies at the gate
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Optionally link to a profile immediately, or issue anonymously and map
            later.
          </p>

          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {feedback && (
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              {feedback}
            </p>
          )}

          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Search person (optional)
              </label>
              <input
                type="text"
                value={personQuery}
                onChange={(e) => setPersonQuery(e.target.value)}
                placeholder="Type name or phone…"
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
              />
            </div>

            <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 text-xs dark:border-slate-800 dark:bg-slate-900/60">
              {filteredPeople.length === 0 ? (
                <p className="px-3 py-2 text-slate-500">
                  No matching people. You can still issue anonymous tallies.
                </p>
              ) : (
                <ul>
                  {filteredPeople.map((p) => {
                    const isSelected = p.id === selectedPersonId;
                    return (
                      <li
                        key={p.id}
                        className={`flex cursor-pointer items-center justify-between border-b border-slate-100 px-3 py-1.5 last:border-b-0 dark:border-slate-800 ${
                          isSelected
                            ? 'bg-orange-50/70 dark:bg-orange-950/40'
                            : 'hover:bg-slate-100/80 dark:hover:bg-slate-900/80'
                        }`}
                        onClick={() => setSelectedPersonId(p.id)}
                      >
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-100">
                            {p.personalData.firstName} {p.personalData.lastName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p.personalData.phone ?? 'No phone'} · {p.category}
                          </div>
                        </div>
                        {p.engagement?.isWorker && (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-200">
                            Workforce
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleIssueTally(true)}
                disabled={
                  !selectedProgramId || !selectedPersonId || issuing || stats.available <= 0
                }
                className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600 disabled:opacity-60"
              >
                {issuing ? 'Issuing…' : 'Issue to selected person'}
              </button>

              <button
                type="button"
                onClick={() => handleIssueTally(false)}
                disabled={!selectedProgramId || issuing || stats.available <= 0}
                className="inline-flex items-center rounded-md border border-orange-500 bg-white px-4 py-2 text-sm font-medium text-orange-600 shadow-sm hover:bg-orange-50 disabled:opacity-60 dark:bg-slate-900 dark:hover:bg-orange-950/30"
              >
                {issuing ? 'Issuing…' : 'Issue anonymous tally'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Simple list of last issued tallies */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Recently issued tallies
        </h2>
        {tallies.filter((t) => t.status === 'issued' || t.status === 'logged')
          .length === 0 ? (
          <p className="text-xs text-slate-500">
            No tallies have been issued for this program yet.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto text-xs">
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
                {tallies
                  .filter((t) => t.status === 'issued' || t.status === 'logged')
                  .sort(
                    (a, b) =>
                      (b.issuedAt ?? b.updatedAt).localeCompare(
                        a.issuedAt ?? a.updatedAt,
                      ),
                  )
                  .slice(0, 50)
                  .map((t) => (
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
                          ? new Date(t.issuedAt).toLocaleTimeString()
                          : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                        {t.personId ? t.personId : 'Not mapped yet'}
                      </td>
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
