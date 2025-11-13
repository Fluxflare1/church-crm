// components/analytics/upcoming-birthdays-card.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  getUpcomingBirthdays,
  type UpcomingBirthday,
  type BirthdayAutomationResult,
} from '@/lib/birthday';

export function UpcomingBirthdaysCard() {
  const [items, setItems] = useState<UpcomingBirthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BirthdayAutomationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load upcoming birthdays (next 7 days)
  useEffect(() => {
    try {
      const upcoming = getUpcomingBirthdays(7);
      setItems(upcoming);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message ?? 'Failed to load upcoming birthdays.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRunNow = async () => {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/cron/birthdays');
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = (await res.json()) as BirthdayAutomationResult;
      setResult(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message ?? 'Failed to run birthday check.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Upcoming birthdays (7 days)
          </h2>
          <p className="text-[11px] text-slate-500">
            Based on guests and members with a date of birth.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunNow}
          disabled={running}
          className="inline-flex items-center rounded-md bg-orange-500 px-3 py-1.5 text-[11px] font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
        >
          {running ? 'Running…' : 'Run check now'}
        </button>
      </div>

      {error && (
        <div className="mb-2 text-[11px] text-red-600">
          {error}
        </div>
      )}

      {result && !error && (
        <div className="mb-2 text-[11px] text-emerald-700">
          Processed {result.processedPeople} ·
          Candidates: {result.birthdayCandidates} ·
          Messages: {result.messagesSent} ·
          Follow-ups: {result.followUpsCreated}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="text-xs text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-500">
            No birthdays in the next 7 days.
          </div>
        ) : (
          <ul className="space-y-2 text-xs">
            {items.map((b) => (
              <li
                key={b.personId + b.nextBirthdayDate}
                className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2"
              >
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-50">
                    {b.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatNextBirthdayLabel(b)} · {b.category}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  {b.daysUntil === 0 ? 'Today 🎉' : `In ${b.daysUntil} days`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatNextBirthdayLabel(b: UpcomingBirthday): string {
  const d = new Date(b.nextBirthdayDate);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}
