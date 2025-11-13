'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { getAllPrograms } from '@/lib/programs';
import { getAllPeople } from '@/lib/people';
import { sendMessageToPerson } from '@/lib/communications';

import type {
  Program,
  Person,
  CommunicationChannel,
} from '@/types';

const CURRENT_USER_ID = 'system'; // TODO: replace with real authenticated user ID

type SegmentType = 'all-people' | 'members-only' | 'guests-only';

type BroadcastFormState = {
  programId: string;
  segment: SegmentType;
  channel: CommunicationChannel;
  messageBody: string;
};

export default function BroadcastPage() {
  const searchParams = useSearchParams();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [form, setForm] = useState<BroadcastFormState>({
    programId: '',
    segment: 'all-people',
    channel: 'whatsapp',
    messageBody: '',
  });

  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const allPrograms = getAllPrograms().sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    setPrograms(allPrograms);

    const allPeople = getAllPeople().slice().sort((a, b) => {
      const aName = `${a.personalData.firstName} ${a.personalData.lastName}`.toLowerCase();
      const bName = `${b.personalData.firstName} ${b.personalData.lastName}`.toLowerCase();
      return aName.localeCompare(bName);
    });
    setPeople(allPeople);
  }, []);

  // Initialize programId from query string if present
  useEffect(() => {
    if (!programs.length) return;
    const qpProgramId = searchParams.get('programId');

    setForm((prev) => {
      if (prev.programId) return prev;

      const initialProgramId =
        (qpProgramId && programs.some((p) => p.id === qpProgramId)
          ? qpProgramId
          : programs[0]?.id) ?? '';

      const program = programs.find((p) => p.id === initialProgramId) ?? null;
      const defaultBody = buildDefaultMessage(program);

      return {
        ...prev,
        programId: initialProgramId,
        messageBody: defaultBody,
      };
    });
  }, [programs, searchParams]);

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === form.programId) ?? null,
    [programs, form.programId],
  );

  const targetPeople = useMemo(() => {
    if (!people.length) return [] as Person[];
    switch (form.segment) {
      case 'members-only':
        return people.filter((p) => p.category === 'member');
      case 'guests-only':
        return people.filter((p) => p.category === 'guest');
      case 'all-people':
      default:
        return people;
    }
  }, [people, form.segment]);

  function handleChange(
    e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value as any,
    }));

    if (name === 'programId') {
      const program = programs.find((p) => p.id === value) ?? null;
      if (program && !form.messageBody.trim()) {
        setForm((prev) => ({
          ...prev,
          messageBody: buildDefaultMessage(program),
        }));
      }
    }
  }

  function handleChannelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const { value } = e.target;
    setForm((prev) => ({
      ...prev,
      channel: value as CommunicationChannel,
    }));
  }

  function buildDefaultMessage(program: Program | null): string {
    if (!program) {
      return 'Dear {{firstName}}, we look forward to seeing you in church.';
    }

    const dateLabel = formatDate(program.date);
    const timeLabel = program.startTime
      ? program.endTime
        ? `${program.startTime}–${program.endTime}`
        : program.startTime
      : '';
    const locationLabel = program.location ? ` at ${program.location}` : '';

    return `Dear {{firstName}}, you are specially invited to "${program.name}" on ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ''}${locationLabel}. We look forward to seeing you!`;
  }

  function validate(): string | null {
    if (!form.programId) return 'Please select a program.';
    if (!form.messageBody.trim()) return 'Message body cannot be empty.';
    if (!targetPeople.length) return 'No recipients found for this segment.';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSentCount(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSending(true);
    try {
      let successCount = 0;
      for (const person of targetPeople) {
        const personalizedBody = personalizeMessage(form.messageBody, person, selectedProgram);

        const result = await sendMessageToPerson({
          personId: person.id,
          channel: form.channel,
          templateId: undefined,
          bodyOverride: personalizedBody,
          initiatedByUserId: CURRENT_USER_ID,
          context: {
            programId: form.programId,
            segment: form.segment,
          },
        });

        if (result.success) {
          successCount += 1;
        }
      }

      setSentCount(successCount);
      if (successCount === 0) {
        setError('No messages were successfully sent. Please check your provider config.');
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to send broadcast.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Broadcast
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Send program-based messages via WhatsApp, SMS, or Email to members, guests,
          or everyone.
        </p>
      </div>

      {/* Feedback */}
      {(error || sentCount !== null) && (
        <div className="space-y-2">
          {sentCount !== null && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
              Broadcast sent to {sentCount} recipient{sentCount === 1 ? '' : 's'}.
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form className="grid gap-4 md:grid-cols-[1.2fr,1.8fr]" onSubmit={handleSubmit}>
          {/* Left column: configuration */}
          <div className="space-y-4 border-b border-slate-100 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4 dark:border-slate-800">
            {/* Program */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Program
              </label>
              <select
                name="programId"
                value={form.programId}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
              >
                <option value="">Select a program...</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatDate(p.date)} · {p.name}
                  </option>
                ))}
              </select>
              {selectedProgram && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {selectedProgram.name} ({formatDate(selectedProgram.date)})
                  {selectedProgram.location ? ` · ${selectedProgram.location}` : ''}
                </p>
              )}
            </div>

            {/* Segment */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Segment
              </label>
              <select
                name="segment"
                value={form.segment}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
              >
                <option value="all-people">All people (members + guests)</option>
                <option value="members-only">Members only</option>
                <option value="guests-only">Guests only</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                {targetPeople.length} recipient{targetPeople.length === 1 ? '' : 's'}{' '}
                currently match this segment.
              </p>
            </div>

            {/* Channel */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Channel
              </label>
              <select
                value={form.channel}
                onChange={handleChannelChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Provider settings are controlled in Settings → Communications.
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
              <div className="font-medium text-slate-700 dark:text-slate-100">
                Broadcast summary
              </div>
              <div className="mt-1">
                Program:{' '}
                <span className="font-medium">
                  {selectedProgram ? selectedProgram.name : 'Not selected'}
                </span>
              </div>
              <div>
                Segment:{' '}
                <span className="font-medium">
                  {segmentLabel(form.segment)}
                </span>
              </div>
              <div>
                Channel:{' '}
                <span className="font-medium">
                  {channelLabel(form.channel)}
                </span>
              </div>
            </div>
          </div>

          {/* Right column: message */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Message
            </label>
            <p className="mt-1 text-[11px] text-slate-500">
              You can use placeholders like{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] dark:bg-slate-800">
                {'{{firstName}}'}
              </code>{' '}
              and{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] dark:bg-slate-800">
                {'{{programName}}'}
              </code>
              . They will be replaced per person.
            </p>
            <textarea
              name="messageBody"
              value={form.messageBody}
              onChange={handleChange}
              className="mt-2 flex-1 min-h-[220px] rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
            />

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send broadcast'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---- Helpers -------------------------------------------------------------- */

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function segmentLabel(segment: SegmentType): string {
  switch (segment) {
    case 'members-only':
      return 'Members only';
    case 'guests-only':
      return 'Guests only';
    case 'all-people':
    default:
      return 'All people';
  }
}

function channelLabel(channel: CommunicationChannel): string {
  switch (channel) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'sms':
      return 'SMS';
    case 'email':
      return 'Email';
    case 'call':
    case 'phone-call':
      return 'Phone call';
    default:
      return channel;
  }
}

function personalizeMessage(
  template: string,
  person: Person,
  program: Program | null,
): string {
  const fullName = `${person.personalData.firstName} ${person.personalData.lastName}`.trim();
  const replacements: Record<string, string> = {
    '{{firstName}}': person.personalData.firstName ?? '',
    '{{lastName}}': person.personalData.lastName ?? '',
    '{{fullName}}': fullName,
    '{{programName}}': program?.name ?? '',
    '{{programDate}}': program ? formatDate(program.date) : '',
  };

  let result = template;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.split(token).join(value);
  }
  return result;
}
