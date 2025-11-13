'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { getAllPrograms } from '@/lib/programs';
import { getAllPeople } from '@/lib/people';
import { sendMessageToPerson } from '@/lib/communications';
import {
  getBroadcastHistory,
  recordBroadcastSummary,
  resolveRecipientsBySegment,
  segmentLabel,
} from '@/lib/broadcasts';

import type {
  Program,
  Person,
  CommunicationChannel,
  BroadcastSegmentKey,
  BroadcastRecord,
} from '@/types';

const CURRENT_USER_ID = 'system'; // TODO: replace with real authenticated user ID

type BroadcastFormState = {
  programId: string;
  segment: BroadcastSegmentKey;
  channel: CommunicationChannel;
  messageBody: string;
};

export default function BroadcastPage() {
  const searchParams = useSearchParams();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [history, setHistory] = useState<BroadcastRecord[]>([]);

  const [form, setForm] = useState<BroadcastFormState>({
    programId: '',
    segment: 'all-people',
    channel: 'whatsapp',
    messageBody: '',
  });

  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initial load
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

    setHistory(getBroadcastHistory());
  }, []);

  // Selected program
  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === form.programId) ?? null,
    [programs, form.programId],
  );

  // Pre-select program from ?programId, and auto-build default message once
  useEffect(() => {
    if (!programs.length) return;

    setForm((prev) => {
      // only initialise once
      if (prev.programId) return prev;

      const qpProgramId = searchParams.get('programId');
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

  // Recipients based on refined segment
  const targetPeople = useMemo(
    () => resolveRecipientsBySegment(form.segment, people),
    [form.segment, people],
  );

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

    return `Dear {{firstName}}, you are specially invited to "{{programName}}" on ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ''}${locationLabel}. We look forward to seeing you!`;
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
        const personalizedBody = personalizeMessage(
          form.messageBody,
          person,
          selectedProgram,
        );

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

      const failureCount = targetPeople.length - successCount;
      setSentCount(successCount);

      // Record summary in history
      recordBroadcastSummary({
        programId: form.programId || undefined,
        channel: form.channel,
        segmentKey: form.segment,
        messageBody: form.messageBody,
        totalTargets: targetPeople.length,
        successCount,
        failureCount,
        createdByUserId: CURRENT_USER_ID,
      });

      setHistory(getBroadcastHistory());

      if (successCount === 0) {
        setError(
          'No messages were successfully sent. Please check your provider config.',
        );
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
          or workforce segments.
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
        <form
          className="grid gap-4 md:grid-cols-[1.2fr,1.8fr]"
          onSubmit={handleSubmit}
        >
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
                <optgroup label="All">
                  <option value="all-people">
                    All people (members + guests)
                  </option>
                </optgroup>

                <optgroup label="Members">
                  <option value="members-all">All members</option>
                  <option value="members-regular">Regular members</option>
                  <option value="members-adherent">Adherent members</option>
                  <option value="members-returning">Returning members</option>
                  <option value="members-visiting">Visiting members</option>
                </optgroup>

                <optgroup label="Guests">
                  <option value="guests-all">All guests</option>
                  <option value="guests-first-time">First-time guests</option>
                  <option value="guests-returning">Returning guests</option>
                  <option value="guests-regular">Regular guests</option>
                </optgroup>

                <optgroup label="Workforce">
                  <option value="workers-all">All workforce (workers)</option>
                </optgroup>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                {targetPeople.length} recipient
                {targetPeople.length === 1 ? '' : 's'} currently match this segment.
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

      {/* History */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Broadcast history
        </h2>

        {history.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            No broadcasts have been sent yet.
          </p>
        ) : (
          <div className="mt-3 max-h-[260px] overflow-y-auto rounded-md border border-slate-100 text-xs dark:border-slate-800">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-900/40">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Program</th>
                  <th className="px-3 py-2 font-medium">Segment</th>
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 font-medium">Sent / Targets</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => {
                  const program = record.programId
                    ? programs.find((p) => p.id === record.programId) ?? null
                    : null;
                  return (
                    <tr
                      key={record.id}
                      className="border-t border-slate-100 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50"
                    >
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-100">
                        {formatDateTime(record.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                        {program ? program.name : '—'}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                        {segmentLabel(record.segmentKey)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                        {channelLabel(record.channel)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-700 dark:text-slate-100">
                        {record.successCount}/{record.totalTargets}
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
  const fullName = `${person.personalData.firstName ?? ''} ${
    person.personalData.lastName ?? ''
  }`.trim();

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
