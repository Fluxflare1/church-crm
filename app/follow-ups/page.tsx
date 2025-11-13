'use client';

import { useEffect, useState } from 'react';
import { getAllFollowUps, updateFollowUpStatus } from '@/lib/follow-ups';
import { getAllPeople } from '@/lib/people';

import type { FollowUp, Person, FollowUpStatus } from '@/types';

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [peopleMap, setPeopleMap] = useState<Record<string, Person>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fus = getAllFollowUps();
    setFollowUps(fus);

    const people = getAllPeople();
    const map: Record<string, Person> = {};
    for (const p of people) {
      map[p.id] = p;
    }
    setPeopleMap(map);
  }, []);

  const handleStatusChange = async (followUpId: string, status: FollowUpStatus) => {
    setUpdatingId(followUpId);
    try {
      const updated = updateFollowUpStatus({ followUpId, status });
      if (!updated) return;
      setFollowUps((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const openFollowUps = followUps.filter(
    (f) => f.status === 'open' || f.status === 'in-progress'
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Follow-ups
        </h1>
        <p className="text-sm text-slate-500">
          Track and complete follow-up actions for guests and members.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
          Open Follow-ups
        </h2>

        {openFollowUps.length === 0 ? (
          <p className="text-sm text-slate-500">
            No open follow-ups at the moment.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-md">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                  <th className="py-2 px-3 text-left">Person</th>
                  <th className="py-2 px-3 text-left">Type</th>
                  <th className="py-2 px-3 text-left">Priority</th>
                  <th className="py-2 px-3 text-left">Due</th>
                  <th className="py-2 px-3 text-left">Status</th>
                  <th className="py-2 px-3 text-left">Channel</th>
                  <th className="py-2 px-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {openFollowUps.map((f) => {
                  const person = peopleMap[f.personId];
                  return (
                    <tr
                      key={f.id}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-2 px-3">
                        {person
                          ? `${person.personalData.firstName} ${person.personalData.lastName}`
                          : f.personId}
                      </td>
                      <td className="py-2 px-3 text-xs">{f.type}</td>
                      <td className="py-2 px-3 capitalize text-xs">
                        {f.priority}
                      </td>
                      <td className="py-2 px-3 text-xs">{f.dueDate}</td>
                      <td className="py-2 px-3 text-xs capitalize">
                        {f.status}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {f.preferredChannel ?? '—'}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            disabled={updatingId === f.id}
                            onClick={() =>
                              handleStatusChange(
                                f.id,
                                f.status === 'open' ? 'in-progress' : 'open'
                              )
                            }
                            className="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-900/60 disabled:opacity-50"
                          >
                            {f.status === 'open'
                              ? 'Start'
                              : 'Reopen'}
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === f.id}
                            onClick={() =>
                              handleStatusChange('' + f.id, 'completed')
                            }
                            className="rounded-md bg-emerald-500 px-2 py-1 text-white hover:bg-emerald-600 disabled:opacity-50"
                          >
                            Complete
                          </button>
                        </div>
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
