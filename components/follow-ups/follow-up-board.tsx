'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getAllFollowUps, getActionsForFollowUp } from '@/lib/follow-ups';
import { getAllPeople } from '@/lib/people';

import type {
  FollowUp,
  FollowUpActionLogEntry,
  Person,
} from '@/types';

type FollowUpStatusFilter = 'all' | 'open' | 'in-progress' | 'completed' | 'on-hold';
type DueFilter = 'all' | 'overdue' | 'today' | 'this-week';

export function FollowUpBoard() {
  const router = useRouter();

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [actionsByFollowUpId, setActionsByFollowUpId] = useState<
    Record<string, FollowUpActionLogEntry[]>
  >({});
  const [peopleById, setPeopleById] = useState<Map<string, Person>>(new Map());
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<FollowUpStatusFilter>('open');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    try {
      const allFollowUps = getAllFollowUps().sort((a, b) => {
        const aKey = a.dueDate ?? a.createdAt;
        const bKey = b.dueDate ?? b.createdAt;
        return aKey.localeCompare(bKey);
      });
      setFollowUps(allFollowUps);

      const actionsMap: Record<string, FollowUpActionLogEntry[]> = {};
      for (const fu of allFollowUps) {
        const actions = getActionsForFollowUp(fu.id).sort((a, b) =>
          b.timestamp.localeCompare(a.timestamp),
        );
        if (actions.length > 0) {
          actionsMap[fu.id] = actions;
        }
      }
      setActionsByFollowUpId(actionsMap);

      const people = getAllPeople();
      const peopleMap = new Map<string, Person>();
      for (const p of people) {
        peopleMap.set(p.id, p);
      }
      setPeopleById(peopleMap);
    } finally {
      setLoading(false);
    }
  }, []);

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    for (const fu of followUps) {
      if (fu.type) types.add(fu.type);
    }
    return Array.from(types.values()).sort();
  }, [followUps]);

  const filteredFollowUps = useMemo(() => {
    const now = new Date();
    const today = stripTime(now);

    return followUps.filter((fu) => {
      // status
      if (statusFilter !== 'all' && fu.status !== statusFilter) {
        return false;
      }

      // type
      if (typeFilter !== 'all' && fu.type !== typeFilter) {
        return false;
      }

      // due date filter
      if (dueFilter !== 'all' && fu.dueDate) {
        const due = stripTime(new Date(fu.dueDate));
        const diffDays = diffInDays(today, due);

        if (dueFilter === 'overdue' && due >= today) return false;
        if (dueFilter === 'today' && diffDays !== 0) return false;
        if (dueFilter === 'this-week' && (diffDays < 0 || diffDays > 7)) return false;
      } else if (dueFilter !== 'all' && !fu.dueDate) {
        // if there's no dueDate and a specific due filter is selected, hide it
        return false;
      }

      // search: match on person name, phone, notes
      if (search.trim()) {
        const person = peopleById.get(fu.personId);
        const term = search.toLowerCase();
        const name = person
          ? `${person.personalData.firstName} ${person.personalData.lastName}`.toLowerCase()
          : '';
        const phone = person?.personalData.phone?.toLowerCase() ?? '';
        const notes = fu.notes?.toLowerCase() ?? '';
        if (!name.includes(term) && !phone.includes(term) && !notes.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [followUps, peopleById, statusFilter, typeFilter, dueFilter, search]);

  const openCount = followUps.filter((fu) => fu.status === 'open').length;
  const overdueCount = followUps.filter((fu) => {
    if (!fu.dueDate) return false;
    const today = stripTime(new Date());
    const due = stripTime(new Date(fu.dueDate));
    return fu.status !== 'completed' && due < today;
  }).length;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500">Loading follow-ups...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header + stats */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Follow-up Board
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Track open follow-ups from birthdays, absentees, new guests, and more.
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="rounded-lg bg-orange-50 px-3 py-1.5 text-orange-700 dark:bg-orange-950/40 dark:text-orange-200">
            <span className="font-semibold">{openCount}</span>{' '}
            <span className="opacity-80">open</span>
          </div>
          <div className="rounded-lg bg-red-50 px-3 py-1.5 text-red-700 dark:bg-red-950/40 dark:text-red-200">
            <span className="font-semibold">{overdueCount}</span>{' '}
            <span className="opacity-80">overdue</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FollowUpStatusFilter)}
            className="rounded-md border border-slate-300 bg-transparent px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On hold</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-transparent px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
          >
            <option value="all">All types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {capitalize(t)}
              </option>
            ))}
          </select>

          <select
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value as DueFilter)}
            className="rounded-md border border-slate-300 bg-transparent px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
          >
            <option value="all">All due dates</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="this-week">Due this week</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or notes..."
            className="w-full rounded-md border border-slate-300 bg-transparent px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700 md:w-64"
          />
        </div>
      </div>

      {/* List */}
      <div className="mt-4 max-h-[420px] overflow-y-auto rounded-md border border-slate-100 text-xs dark:border-slate-800">
        {filteredFollowUps.length === 0 ? (
          <div className="p-4 text-xs text-slate-500">
            No follow-ups match the current filters.
          </div>
        ) : (
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-900/40">
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Due</th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">Last action</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFollowUps.map((fu) => {
                const person = peopleById.get(fu.personId);
                const latestAction =
                  (actionsByFollowUpId[fu.id] ?? [])[0] ?? undefined;

                const personName = person
                  ? `${person.personalData.firstName} ${person.personalData.lastName}`.trim()
                  : 'Unknown person';

                return (
                  <tr
                    key={fu.id}
                    className="border-t border-slate-100 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50"
                  >
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {personName || 'Unknown person'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {person?.personalData.phone ?? 'No phone'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        {capitalize(fu.type)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={followUpStatusBadgeClass(fu.status)}>
                        {capitalize(fu.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={priorityBadgeClass(fu.priority)}>
                        {capitalize(fu.priority)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {fu.dueDate ? (
                        <span className={dueBadgeClass(fu.dueDate, fu.status)}>
                          {formatDate(fu.dueDate)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">
                        {fu.preferredChannel
                          ? channelLabel(fu.preferredChannel)
                          : 'Not set'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {latestAction ? (
                        <div className="flex flex-col text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="font-medium">
                            {channelLabel(latestAction.channel)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {formatDateTime(latestAction.timestamp)}
                          </span>
                          {latestAction.outcome && (
                            <span className="truncate text-[10px] text-slate-500">
                              {latestAction.outcome}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          No activity yet
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => router.push(`/people/${fu.personId}`)}
                          className="inline-flex items-center rounded-md border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900/60"
                        >
                          View person
                        </button>
                        {/* In future we can add "Update status" or "Log action" buttons here */}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ---- Helpers ------------------------------------------------------------- */

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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffInDays(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = stripTime(b).getTime() - stripTime(a).getTime();
  return Math.round(diff / msPerDay);
}

function followUpStatusBadgeClass(status: string): string {
  switch (status) {
    case 'open':
      return 'inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-200';
    case 'in-progress':
      return 'inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-200';
    case 'completed':
      return 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200';
    case 'on-hold':
      return 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100';
    default:
      return 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100';
  }
}

function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case 'high':
      return 'inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/50 dark:text-red-200';
    case 'medium':
      return 'inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-200';
    case 'low':
      return 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100';
    default:
      return 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100';
  }
}

function dueBadgeClass(dueIso: string, status: string): string {
  const today = stripTime(new Date());
  const due = stripTime(new Date(dueIso));
  const diff = diffInDays(today, due);

  if (status === 'completed') {
    return 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200';
  }

  if (due < today) {
    return 'inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/50 dark:text-red-200';
  }

  if (diff === 0) {
    return 'inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-200';
  }

  if (diff <= 7) {
    return 'inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-200';
  }

  return 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100';
}

function channelLabel(channel: string): string {
  switch (channel) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'sms':
      return 'SMS';
    case 'email':
      return 'Email';
    case 'phone-call':
    case 'call':
      return 'Phone call';
    case 'visit':
      return 'Visit';
    default:
      return channel;
  }
}
