'use client';

import { useEffect, useMemo, useState } from 'react';

import { getAllPrograms } from '@/lib/programs';
import { getAllPeople } from '@/lib/people';
import { getTalliesForProgram, mapTallyToPerson } from '@/lib/tally';

import type { Program, Person, Tally } from '@/types';

export default function TallyLogPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [tallies, setTallies] = useState<Tally[]>([]);

  const [codeInput, setCodeInput] = useState('');
  const [personQuery, setPersonQuery] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');

  const [mapping, setMapping] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrograms(getAllPrograms());
    setPeople(getAllPeople());
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

  const filteredPeople = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    if (!q) return people;

    return people.filter((p) => {
      const fullName = `${p.personalData.firstName ?? ''} ${
        p.personalData.lastName ?? ''
      }`.toLowerCase();
      const phone = (p.personalData.phone ?? '').toLowerCase();
      return fullName.includes(q) || phone.includes(q);
    });
  }, [people, personQuery]);

  const mappableTallies = useMemo(
    () =>
      tallies.filter(
        (t) =>
          (t.status === 'issued' || t.status === 'logged') && !t.personId,
      ),
    [tallies],
  );

  function findTallyByCode(code: string): Tally | undefined {
    const norm = code.trim().toUpperCase();
    return tallies.find((t) => t.code.toUpperCase() === norm);
  }

  async function handleMapTally() {
    if (!selectedProgramId) return;

    const code = codeInput.trim();
    if (!code) {
      setError('Enter a tally code.');
      return;
    }
    if (!selectedPersonId) {
      setError('Select a person to map this tally to.');
      return;
    }

    setMapping(true);
    setFeedback(null);
    setError(null);

    try {
      const tally = findTallyByCode(code);
      if (!tally) {
        throw new Error('No tally found with that code for this program.');
      }
      if (tally.personId) {
        throw new Error('This tally is already mapped to a person.');
      }

      const updated = mapTallyToPerson({
        programId: selectedProgramId,
        code,
        personId: selectedPersonId,
        source: 'rm',
      });

      setTallies(getTalliesForProgram(selectedProgramId));

      const person = people.find((p) => p.id === selectedPersonId);
      const name = person
        ? `${person.personalData.firstName} ${person.personalData.lastName}`
        : 'selected person';

      setFeedback(
        `Tally ${updated.code} has been mapped to ${name}. Arrival time: ${
          updated.issuedAt
            ? new Date(updated.issuedAt).toLocaleTimeString()
            : 'unknown'
        }.`,
      );
      setCodeInput('');
      setSelectedPersonId('');
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message ?? 'Failed to map tally.');
    } finally {
      setMapping(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Tally Log & Check-in Mapping
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Map issued tallies to specific people profiles. This does not change
          arrival time; it only connects the tally to the person.
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

      {/* Mapping area */}
      <div className="grid gap-4 lg:grid-cols-[1.8fr,2fr]">
        {/* Code + person selection */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Map a tally to a person
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter a tally code that was issued at the gate and link it to the
            correct person.
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
                Tally code
              </label>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. T001"
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Search person
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
                  No matching people found.
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
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={handleMapTally}
              disabled={
                !selectedProgramId || !codeInput || !selectedPersonId || mapping
              }
              className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600 disabled:opacity-60"
            >
              {mapping ? 'Mapping…' : 'Map tally to person'}
            </button>
          </div>
        </div>

        {/* List of unmapped tallies */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
            Unmapped tallies for this program
          </h2>

          {mappableTallies.length === 0 ? (
            <p className="text-xs text-slate-500">
              All issued tallies are already mapped, or none have been issued yet.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto text-xs">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
                    <th className="px-3 py-1.5 text-left">Code</th>
                    <th className="px-3 py-1.5 text-left">Issued at</th>
                    <th className="px-3 py-1.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mappableTallies.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-slate-100 last:border-b-0 dark:border-slate-800"
                    >
                      <td className="px-3 py-1.5 font-semibold text-slate-900 dark:text-slate-50">
                        {t.code}
                      </td>
                      <td className="px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                        {t.issuedAt
                          ? new Date(t.issuedAt).toLocaleTimeString()
                          : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-[11px] capitalize text-slate-600 dark:text-slate-300">
                        {t.status}
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
  );
}
