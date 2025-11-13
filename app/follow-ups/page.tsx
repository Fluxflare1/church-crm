'use client';

import { useEffect, useState } from 'react';

import { getAllFollowUps } from '@/lib/follow-ups';
import FollowUpBoard from '@/components/follow-ups/follow-up-board';

import type { FollowUp } from '@/types';

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [runningAbsentees, setRunningAbsentees] = useState(false);
  const [absenteeMessage, setAbsenteeMessage] = useState<string | null>(null);
  const [absenteeError, setAbsenteeError] = useState<string | null>(null);

  useEffect(() => {
    reloadFollowUps();
  }, []);

  function reloadFollowUps() {
    const all = getAllFollowUps();
    setFollowUps(all);
  }

  async function handleRunAbsenteeCheck() {
    setRunningAbsentees(true);
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

      reloadFollowUps();

      setAbsenteeMessage(
        `Checked ${result.consideredProgramsCount} program(s), detected ${result.absenteesCount} absentee(s), created ${result.followUpsCreated} follow-up(s).`,
      );
    } catch (err: unknown) {
      const e = err as Error;
      setAbsenteeError(e.message ?? 'Failed to run absentee automation.');
    } finally {
      setRunningAbsentees(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Follow-ups
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage follow-ups for guests and members. You can also run absentee
            detection to automatically create follow-ups.
          </p>
        </div>

        <div className="flex flex-col items-end space-y-2">
          <button
            type="button"
            onClick={handleRunAbsenteeCheck}
            disabled={runningAbsentees}
            className="inline-flex items-center rounded-md border border-orange-500 bg-white px-3 py-1.5 text-xs font-medium text-orange-600 shadow-sm hover:bg-orange-50 disabled:opacity-60 dark:bg-slate-900 dark:hover:bg-orange-950/20"
          >
            {runningAbsentees ? 'Running absentee check…' : 'Run absentee check now'}
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

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <FollowUpBoard followUps={followUps} onFollowUpsChanged={reloadFollowUps} />
      </div>
    </div>
  );
}
