'use client';

import { useEffect, useState, FormEvent } from 'react';
import { getSystemConfig, updateBirthdaysConfig } from '@/lib/config';
import type { SystemConfig } from '@/types';

type DefaultChannel = SystemConfig['birthdays']['defaultChannel'];

export default function BirthdaySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [enabled, setEnabled] = useState<boolean>(true);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(0);
  const [defaultChannel, setDefaultChannel] = useState<DefaultChannel>('whatsapp');
  const [sendAutomatically, setSendAutomatically] = useState<boolean>(true);
  const [followUpType, setFollowUpType] = useState<string>('birthday');
  const [messageTemplateId, setMessageTemplateId] = useState<string>('');

  // Load current config on mount
  useEffect(() => {
    try {
      const cfg = getSystemConfig();
      const b = cfg.birthdays;

      setEnabled(b.enabled);
      setLeadTimeDays(b.leadTimeDays ?? 0);
      setDefaultChannel((b.defaultChannel ?? 'whatsapp') as DefaultChannel);
      setSendAutomatically(b.sendAutomatically ?? true);
      setFollowUpType(b.followUpType || 'birthday');
      setMessageTemplateId(b.messageTemplateId || '');
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message ?? 'Failed to load birthday settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const updated = updateBirthdaysConfig({
        enabled,
        leadTimeDays: Number.isNaN(leadTimeDays) ? 0 : leadTimeDays,
        defaultChannel,
        sendAutomatically,
        followUpType: followUpType.trim() || 'birthday',
        messageTemplateId: messageTemplateId.trim(),
      });

      const b = updated.birthdays;
      setEnabled(b.enabled);
      setLeadTimeDays(b.leadTimeDays ?? 0);
      setDefaultChannel((b.defaultChannel ?? 'whatsapp') as DefaultChannel);
      setSendAutomatically(b.sendAutomatically ?? true);
      setFollowUpType(b.followUpType || 'birthday');
      setMessageTemplateId(b.messageTemplateId || '');

      setSuccess('Birthday settings updated successfully.');
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message ?? 'Failed to update birthday settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Birthday Messaging Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure how the system handles birthday greetings and reminders.
        </p>
      </header>

      {loading ? (
        <div className="text-sm text-slate-500">Loading settings…</div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-5"
        >
          {error && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900 rounded-md px-3 py-2">
              {success}
            </div>
          )}

          {/* Enabled toggle */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Birthday automation
                </h2>
                <p className="text-xs text-slate-500">
                  When enabled, the system will automatically detect upcoming birthdays and
                  either send greetings or create follow-ups based on your configuration.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700"
                />
                <span>Enabled</span>
              </label>
            </div>
          </section>

          {/* Lead time and default channel */}
          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Lead time (days)
              </label>
              <input
                type="number"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(parseInt(e.target.value, 10) || 0)}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                min={0}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                0 = send on the birthday; 1 = day before; 2 = two days before, etc.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Default channel
              </label>
              <select
                value={defaultChannel}
                onChange={(e) =>
                  setDefaultChannel(e.target.value as DefaultChannel)
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                The system will attempt to use this channel first for birthday greetings.
              </p>
            </div>
          </section>

          {/* Behaviour: auto-send vs follow-up */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Behaviour
            </h2>
            <p className="text-xs text-slate-500 mb-2">
              Choose whether birthdays are handled automatically or as follow-up tasks.
            </p>

            <div className="flex flex-col gap-2 text-xs text-slate-700 dark:text-slate-200">
              <label className="inline-flex items-start gap-2">
                <input
                  type="radio"
                  name="birthday-behaviour"
                  checked={sendAutomatically}
                  onChange={() => setSendAutomatically(true)}
                  className="mt-[3px]"
                />
                <span>
                  <span className="font-medium">Auto-send greetings</span>
                  <br />
                  <span className="text-slate-500">
                    The system sends the message on your behalf using the selected channel.
                  </span>
                </span>
              </label>

              <label className="inline-flex items-start gap-2">
                <input
                  type="radio"
                  name="birthday-behaviour"
                  checked={!sendAutomatically}
                  onChange={() => setSendAutomatically(false)}
                  className="mt-[3px]"
                />
                <span>
                  <span className="font-medium">Create follow-up only</span>
                  <br />
                  <span className="text-slate-500">
                    A follow-up task is created so an RM or pastor can call/message personally.
                  </span>
                </span>
              </label>
            </div>
          </section>

          {/* Follow-up & template */}
          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Follow-up type
              </label>
              <input
                value={followUpType}
                onChange={(e) => setFollowUpType(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. birthday"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Used when creating follow-up records (e.g. &quot;birthday&quot;).
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Message template ID
              </label>
              <input
                value={messageTemplateId}
                onChange={(e) => setMessageTemplateId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. birthday-default"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                References a template in your communications provider or internal template list.
              </p>
            </div>
          </section>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
