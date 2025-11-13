'use client';

import { useEffect, useState, FormEvent } from 'react';
import { getAllPrograms } from '@/lib/programs';
import { getAllPeople } from '@/lib/people';
import { sendMessageToPerson } from '@/lib/communications';

import type {
  Program,
  Person,
  CommunicationChannel,
  ProviderSendResult,
} from '@/types';

const CURRENT_USER_ID = 'system'; // TODO: replace with real authenticated user ID

type SegmentKey =
  | 'all'
  | 'guests-all'
  | 'guests-first-time'
  | 'guests-returning'
  | 'guests-regular'
  | 'members-all'
  | 'members-workforce';

const SEGMENTS: { value: SegmentKey; label: string }[] = [
  { value: 'all', label: 'All people' },
  { value: 'guests-all', label: 'All guests' },
  { value: 'guests-first-time', label: 'First-time guests' },
  { value: 'guests-returning', label: 'Returning guests' },
  { value: 'guests-regular', label: 'Regular guests' },
  { value: 'members-all', label: 'All members' },
  { value: 'members-workforce', label: 'Members + Workforce' },
];

const CHANNELS: { value: CommunicationChannel; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
];

export default function BroadcastPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [segment, setSegment] = useState<SegmentKey>('all');
  const [channel, setChannel] = useState<CommunicationChannel>('whatsapp');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<{
    total: number;
    succeeded: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrograms(getAllPrograms());
    setPeople(getAllPeople());
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSummary(null);

    if (!body.trim()) {
      setError('Message body cannot be empty.');
      return;
    }

    const targets = filterPeopleBySegment(people, segment);
    if (!targets.length) {
      setError('No recipients found for this segment.');
      return;
    }

    setSending(true);
    let succeeded = 0;
    let failed = 0;

    try {
      for (const person of targets) {
        const result: ProviderSendResult = await sendMessageToPerson({
          personId: person.id,
          channel,
          templateId: undefined,
          bodyOverride: personaliseBody(body, person, selectedProgramId, programs),
          initiatedByUserId: CURRENT_USER_ID,
          context: {},
        });

        if (result.success) succeeded += 1;
        else failed += 1;
      }

      setSummary({
        total: targets.length,
        succeeded,
        failed,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message ?? 'Broadcast failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Broadcast
        </h1>
        <p className="text-sm text-slate-500">
          Send bulk WhatsApp or SMS messages to a segment of people.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4"
      >
        {error && (
          <div className="text-xs text-red-600">
            {error}
          </div>
        )}
        {summary && (
          <div className="text-xs text-slate-700 dark:text-slate-200">
            Broadcast completed: {summary.succeeded}/{summary.total} succeeded,{' '}
            {summary.failed} failed.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Program (optional)
            </label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">None</option>
              {programs
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.date} – {p.name}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Used only for context/personalisation in the message body.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Segment
            </label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as SegmentKey)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            >
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as CommunicationChannel)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              System will still fall back to other channels if this is unavailable.
            </p>
          </div>
        </div>

        {channel === 'email' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Message body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 min-h-[140px]"
            placeholder="You can use {{firstName}} and {{churchName}} in your message."
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Template tokens supported: <code>{{`{{firstName}}`}}</code>,{' '}
            <code>{{`{{lastName}}`}}</code>, <code>{{`{{fullName}}`}}</code>,{' '}
            <code>{{`{{churchName}}`}}</code>.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
          >
            {sending ? 'Broadcasting...' : 'Send Broadcast'}
          </button>
        </div>
      </form>
    </div>
  );
}

function filterPeopleBySegment(all: Person[], segment: SegmentKey): Person[] {
  return all.filter((person) => {
    const isGuest = person.category === 'guest';
    const isMember = person.category === 'member';
    const guestType = person.evolution.guestType;

    switch (segment) {
      case 'all':
        return true;
      case 'guests-all':
        return isGuest;
      case 'guests-first-time':
        return isGuest && guestType === 'first-time';
      case 'guests-returning':
        return isGuest && guestType === 'returning';
      case 'guests-regular':
        return isGuest && guestType === 'regular';
      case 'members-all':
        return isMember;
      case 'members-workforce':
        return isMember && person.engagement.isWorker;
      default:
        return true;
    }
  });
}

function personaliseBody(
  raw: string,
  person: Person,
  selectedProgramId: string,
  programs: Program[]
): string {
  let body = raw;

  const program = selectedProgramId
    ? programs.find((p) => p.id === selectedProgramId)
    : null;

  const context: Record<string, string | undefined> = {
    firstName: person.personalData.firstName,
    lastName: person.personalData.lastName,
    fullName: `${person.personalData.firstName} ${person.personalData.lastName}`,
    churchName: person.personalData.churchName,
    programName: program?.name,
    programDate: program?.date,
  };

  body = body.replace(/{{\s*([\w.]+)\s*}}/g, (match, key) => {
    const val = context[key];
    return val !== undefined && val !== null ? String(val) : '';
  });

  return body;
}
