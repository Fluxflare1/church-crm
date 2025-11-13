// components/people/people-table.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Person } from '@/types';
import { getAllPeople } from '@/lib/people';

type SegmentFilter =
  | 'all'
  | 'guests'
  | 'members'
  | 'first-time'
  | 'returning'
  | 'regular-guest'
  | 'member-only'
  | 'member-worker';

interface PeopleTableProps {
  onSelectPerson?: (person: Person) => void;
}

export function PeopleTable({ onSelectPerson }: PeopleTableProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<SegmentFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    try {
      const all = getAllPeople();
      setPeople(all);
    } catch (err) {
      console.error('Failed to load people', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    let list = [...people];

    if (segment !== 'all') {
      list = list.filter((p) => matchesSegment(p, segment));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => {
        const fullName = `${p.personalData.firstName ?? ''} ${p.personalData.lastName ?? ''}`.toLowerCase();
        const phone = p.contact?.phone ?? '';
        const email = p.contact?.email ?? '';
        return (
          fullName.includes(q) ||
          phone.toLowerCase().includes(q) ||
          email.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [people, segment, search]);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2 text-xs">
          <FilterChip
            label="All"
            active={segment === 'all'}
            onClick={() => setSegment('all')}
          />
          <FilterChip
            label="Guests"
            active={segment === 'guests'}
            onClick={() => setSegment('guests')}
          />
          <FilterChip
            label="Members"
            active={segment === 'members'}
            onClick={() => setSegment('members')}
          />
          <FilterChip
            label="First-time"
            active={segment === 'first-time'}
            onClick={() => setSegment('first-time')}
          />
          <FilterChip
            label="Returning"
            active={segment === 'returning'}
            onClick={() => setSegment('returning')}
          />
          <FilterChip
            label="Regular guests"
            active={segment === 'regular-guest'}
            onClick={() => setSegment('regular-guest')}
          />
          <FilterChip
            label="Members (no workforce)"
            active={segment === 'member-only'}
            onClick={() => setSegment('member-only')}
          />
          <FilterChip
            label="Member + Workforce"
            active={segment === 'member-worker'}
            onClick={() => setSegment('member-worker')}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search by name, phone, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {loading ? (
          <div className="p-4 text-xs text-slate-500">Loading people…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-xs text-slate-500">
            No people found with the current filters.
          </div>
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70">
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                  Name
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                  Category
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                  Segment
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                  Contact
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                  Tags
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-orange-50/60 dark:hover:bg-slate-800/70 cursor-pointer"
                  onClick={() => onSelectPerson?.(p)}
                >
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium text-slate-900 dark:text-slate-50">
                      {formatName(p)}
                    </div>
                    {p.personalData.alias && (
                      <div className="text-[11px] text-slate-500">
                        {p.personalData.alias}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-100">
                      {p.category === 'guest' ? 'Guest' : 'Member'}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <SegmentBadge person={p} />
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] text-slate-600 dark:text-slate-300">
                    {p.contact?.phone && <div>{p.contact.phone}</div>}
                    {p.contact?.email && (
                      <div className="text-slate-500">{p.contact.email}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <TagsCell person={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        'rounded-full border px-3 py-1',
        'transition text-[11px]',
        props.active
          ? 'border-orange-500 bg-orange-500 text-white'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-orange-300',
      ].join(' ')}
    >
      {props.label}
    </button>
  );
}

function formatName(p: Person): string {
  const first = p.personalData.firstName ?? '';
  const last = p.personalData.lastName ?? '';
  const full = `${first} ${last}`.trim();
  return full || '(No name)';
}

function matchesSegment(p: Person, segment: SegmentFilter): boolean {
  const guestType = p.evolution?.guestType;
  const isWorker = !!p.engagement?.isWorker;

  switch (segment) {
    case 'guests':
      return p.category === 'guest';
    case 'members':
      return p.category === 'member';
    case 'first-time':
      return p.category === 'guest' && guestType === 'first-time';
    case 'returning':
      return p.category === 'guest' && guestType === 'returning';
    case 'regular-guest':
      return p.category === 'guest' && guestType === 'regular';
    case 'member-only':
      return p.category === 'member' && !isWorker;
    case 'member-worker':
      return p.category === 'member' && isWorker;
    case 'all':
    default:
      return true;
  }
}

function SegmentBadge({ person }: { person: Person }) {
  if (person.category === 'guest') {
    const t = person.evolution?.guestType;
    const label =
      t === 'first-time'
        ? 'First-time guest'
        : t === 'returning'
        ? 'Returning guest'
        : t === 'regular'
        ? 'Regular guest'
        : 'Guest';
    const color =
      t === 'first-time'
        ? 'bg-emerald-100 text-emerald-700'
        : t === 'returning'
        ? 'bg-blue-100 text-blue-700'
        : t === 'regular'
        ? 'bg-indigo-100 text-indigo-700'
        : 'bg-slate-100 text-slate-700';

    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}
      >
        {label}
      </span>
    );
  }

  const isWorker = !!person.engagement?.isWorker;
  const label = isWorker ? 'Member + Workforce' : 'Member';
  const color = isWorker
    ? 'bg-orange-100 text-orange-700'
    : 'bg-slate-100 text-slate-700';

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}
    >
      {label}
    </span>
  );
}

function TagsCell({ person }: { person: Person }) {
  const tags: string[] = [];

  if (person.relationship?.cellName) {
    tags.push(person.relationship.cellName);
  }
  if (person.relationship?.primaryRmName) {
    tags.push(`RM: ${person.relationship.primaryRmName}`);
  }
  if (person.engagement?.serviceTeam) {
    tags.push(person.engagement.serviceTeam);
  }

  if (!tags.length) {
    return (
      <span className="text-[11px] text-slate-400">
        –
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-200"
        >
          {t}
        </span>
      ))}
    </div>
  );
}
