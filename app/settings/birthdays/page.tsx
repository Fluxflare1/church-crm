'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getSystemConfig, updateSystemConfig } from '@/lib/config';

import type { SystemConfig, BirthdayMessagingConfig } from '@/types';

export default function BirthdaysSettingsPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [birthdays, setBirthdays] = useState<BirthdayMessagingConfig | null>(
    null,
  );

  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    const cfg = getSystemConfig();
    setConfig(cfg);
    setBirthdays(cfg.birthdays);
  }, []);

  function handleChange<K extends keyof BirthdayMessagingConfig>(
    field: K,
    value: BirthdayMessagingConfig[K],
  ) {
    if (!birthdays) return;
    setBirthdays({
      ...birthdays,
      [field]: value,
    });
    setMessage(null);
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!birthdays) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const updated = updateSystemConfig({
        birthdays,
      });
      setConfig(updated);
      setBirthdays(updated.birthdays);
      setMessage('Birthday settings saved successfully.');
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message ?? 'Failed to save birthday settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRunNow() {
    setRunning(true);
    setRunMessage(null);
    setRunError(null);

    try {
      const res = await fetch('/api/cron/birthdays', {
        method: 'POST',
      });

      const body = await res.json();

      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? 'Failed to run birthday automation.');
      }

      const { result } = body as {
        result: {
          configEnabled: boolean;
          consideredCount: number;
          scheduledCount: number;
          sentCount: number;
          followUpsCreated: number;
        };
      };

      setRunMessage(
        `Considered ${result.consideredCount} people, scheduled ${result.scheduledCount} birthdays, sent ${result.sentCount} message(s), created ${result.followUpsCreated} follow-up(s).`,
      );
    } catch (err: unknown) {
      const e = err as Error;
      setRunError(e.message ?? 'Failed to run birthday automation.');
    } finally {
      setRunning(false);
    }
  }

  if (!birthdays) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500">Loading birthday settings…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Birthday Messaging
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure how birthday greetings are generated and sent. You can also
            run a manual check for upcoming birthdays.
          </p>
        </div>

        <div className="flex flex-col items-end space-y-2">
          <button
            type="button"
            onClick={handleRunNow}
            disabled={running}
            className="inline-flex items-center rounded-md border border-orange-500 bg-white px-3 py-1.5 text-xs font-medium text-orange-600 shadow-sm hover:bg-orange-50 disabled:opacity-60 dark:bg-slate-900 dark:hover:bg-orange-950/20"
          >
            {running ? 'Running birthday check…' : 'Run birthday check now'}
          </button>
          {runMessage && (
            <p className="max-w-sm text-[11px] text-emerald-600 dark:text-emerald-400">
              {runMessage}
            </p>
          )}
          {runError && (
            <p className="max-w-sm text-[11px] text-red-600 dark:text-red-400">
              {runError}
            </p>
          )}
        </div>
      </div>

      {(message || error) && (
        <div className="space-y-2">
          {message && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
              {error}
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Enabled
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="birthdays-enabled"
                type="checkbox"
                checked={birthdays.enabled}
                onChange={(e) =>
                  handleChange('enabled', e.target.checked as any)
                }
                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              <label
                htmlFor="birthdays-enabled"
                className="text-xs text-slate-600 dark:text-slate-300"
              >
                Automatically prepare birthday greetings
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Lead time (days)
            </label>
            <input
              type="number"
              min={0}
              max={7}
              value={birthdays.leadTimeDays}
              onChange={(e) =>
                handleChange('leadTimeDays', Number(e.target.value) || 0)
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              0 = send on the birthday, 1 = day before, etc.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Default channel
            </label>
            <select
              value={birthdays.defaultChannel}
              onChange={(e) =>
                handleChange(
                  'defaultChannel',
                  e.target.value as BirthdayMessagingConfig['defaultChannel'],
                )
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Send automatically
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="birthdays-send-auto"
                type="checkbox"
                checked={birthdays.sendAutomatically}
                onChange={(e) =>
                  handleChange('sendAutomatically', e.target.checked as any)
                }
                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              <label
                htmlFor="birthdays-send-auto"
                className="text-xs text-slate-600 dark:text-slate-300"
              >
                If disabled, the system will create follow-ups instead of sending
                messages directly.
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Follow-up type (if not auto-send)
            </label>
            <input
              type="text"
              value={birthdays.followUpType}
              onChange={(e) =>
                handleChange('followUpType', e.target.value || 'birthday')
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
              placeholder="birthday"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Template (from Communications templates)
          </label>
          <input
            type="text"
            value={birthdays.messageTemplateId}
            onChange={(e) =>
              handleChange('messageTemplateId', e.target.value || '')
            }
            className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
            placeholder="Template ID from Settings → Communications"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            The body content is defined under Settings → Communications → Broadcast
            templates. This ID links the birthday messages to one of those templates.
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
