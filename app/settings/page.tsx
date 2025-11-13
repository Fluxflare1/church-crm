'use client';

import { useEffect, useState, FormEvent } from 'react';
import {
  getSystemConfig,
  updateEvolutionConfig,
  updateFollowUpConfig,
  updateCommunicationsConfig,
} from '@/lib/config';

import type { SystemConfig } from '@/types';

export default function SettingsPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const cfg = getSystemConfig();
    setConfig(cfg);
  }, []);

  const updateLocalConfig = <K extends keyof SystemConfig>(
    section: K,
    updater: (prev: SystemConfig[K]) => SystemConfig[K]
  ) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: updater(prev[section]),
      };
    });
  };

  if (!config) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500">Loading settings...</p>
      </div>
    );
  }

  const handleSaveEvolution = (e: FormEvent) => {
    e.preventDefault();
    setSavingSection('evolution');
    setMessage(null);
    try {
      const updated = updateEvolutionConfig(config.evolution);
      setConfig(updated);
      setMessage('Evolution settings saved.');
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveFollowUp = (e: FormEvent) => {
    e.preventDefault();
    setSavingSection('followUp');
    setMessage(null);
    try {
      const updated = updateFollowUpConfig(config.followUp);
      setConfig(updated);
      setMessage('Follow-up settings saved.');
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveCommunications = (e: FormEvent) => {
    e.preventDefault();
    setSavingSection('communications');
    setMessage(null);
    try {
      const updated = updateCommunicationsConfig(config.communications);
      setConfig(updated);
      setMessage('Communications settings saved.');
    } finally {
      setSavingSection(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Settings
        </h1>
        <p className="text-sm text-slate-500">
          Configure thresholds, follow-up rules, and communication providers.
        </p>
      </div>

      {message && (
        <div className="text-xs text-emerald-600">
          {message}
        </div>
      )}

      {/* Evolution */}
      <form
        onSubmit={handleSaveEvolution}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Evolution & Thresholds
            </h2>
            <p className="text-xs text-slate-500">
              Control how guests move from first-time to member.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={config.evolution.enabled}
              onChange={(e) =>
                updateLocalConfig('evolution', (prev) => ({
                  ...prev,
                  enabled: e.target.checked,
                }))
              }
              className="rounded border-slate-300 dark:border-slate-700"
            />
            Enable evolution logic
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
              Guest → Returning threshold (visits)
            </label>
            <input
              type="number"
              value={config.evolution.thresholds.guestToReturningThreshold}
              onChange={(e) =>
                updateLocalConfig('evolution', (prev) => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    guestToReturningThreshold: Number(e.target.value) || 0,
                  },
                }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
              Returning → Regular threshold (visits)
            </label>
            <input
              type="number"
              value={config.evolution.thresholds.returningToRegularThreshold}
              onChange={(e) =>
                updateLocalConfig('evolution', (prev) => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    returningToRegularThreshold: Number(e.target.value) || 0,
                  },
                }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
              Regular guest → Member threshold (visits)
            </label>
            <input
              type="number"
              value={config.evolution.thresholds.regularGuestToMemberThreshold}
              onChange={(e) =>
                updateLocalConfig('evolution', (prev) => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    regularGuestToMemberThreshold: Number(e.target.value) || 0,
                  },
                }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingSection === 'evolution'}
            className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-xs font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
          >
            {savingSection === 'evolution' ? 'Saving...' : 'Save Evolution'}
          </button>
        </div>
      </form>

      {/* Follow-up */}
      <form
        onSubmit={handleSaveFollowUp}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Follow-up Rules
            </h2>
            <p className="text-xs text-slate-500">
              Configure response times and absentee rules.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={config.followUp.enabled}
              onChange={(e) =>
                updateLocalConfig('followUp', (prev) => ({
                  ...prev,
                  enabled: e.target.checked,
                }))
              }
              className="rounded border-slate-300 dark:border-slate-700"
            />
            Enable follow-ups
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {(['newGuestHours', 'returningGuestHours', 'regularGuestHours', 'absenteeHours'] as const).map(
            (key) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                  {key}
                </label>
                <input
                  type="number"
                  value={config.followUp.timeframes[key]}
                  onChange={(e) =>
                    updateLocalConfig('followUp', (prev) => ({
                      ...prev,
                      timeframes: {
                        ...prev.timeframes,
                        [key]: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )
          )}
        </div>

        <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Absentee Detection
            </h3>
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={config.followUp.absenteeRule.enabled}
                onChange={(e) =>
                  updateLocalConfig('followUp', (prev) => ({
                    ...prev,
                    absenteeRule: {
                      ...prev.absenteeRule,
                      enabled: e.target.checked,
                    },
                  }))
                }
                className="rounded border-slate-300 dark:border-slate-700"
              />
              Enable absentee rule
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Missed programs count
              </label>
              <input
                type="number"
                value={config.followUp.absenteeRule.missedProgramsCount}
                onChange={(e) =>
                  updateLocalConfig('followUp', (prev) => ({
                    ...prev,
                    absenteeRule: {
                      ...prev.absenteeRule,
                      missedProgramsCount: Number(e.target.value) || 0,
                    },
                  }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Within days
              </label>
              <input
                type="number"
                value={config.followUp.absenteeRule.withinDays}
                onChange={(e) =>
                  updateLocalConfig('followUp', (prev) => ({
                    ...prev,
                    absenteeRule: {
                      ...prev.absenteeRule,
                      withinDays: Number(e.target.value) || 0,
                    },
                  }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Follow-up type
              </label>
              <input
                value={config.followUp.absenteeRule.followUpType}
                onChange={(e) =>
                  updateLocalConfig('followUp', (prev) => ({
                    ...prev,
                    absenteeRule: {
                      ...prev.absenteeRule,
                      followUpType: e.target.value,
                    },
                  }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Follow-up priority
              </label>
              <select
                value={config.followUp.absenteeRule.followUpPriority}
                onChange={(e) =>
                  updateLocalConfig('followUp', (prev) => ({
                    ...prev,
                    absenteeRule: {
                      ...prev.absenteeRule,
                      followUpPriority: e.target.value as any,
                    },
                  }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingSection === 'followUp'}
            className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-xs font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
          >
            {savingSection === 'followUp' ? 'Saving...' : 'Save Follow-up'}
          </button>
        </div>
      </form>

      {/* Communications */}
      <form
        onSubmit={handleSaveCommunications}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Communication Providers
            </h2>
            <p className="text-xs text-slate-500">
              Configure direct API access for WhatsApp, SMS, and Email.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* WhatsApp */}
          <ChannelCard
            title="WhatsApp"
            enabled={config.communications.whatsapp.enabled}
            onToggle={(enabled) =>
              updateLocalConfig('communications', (prev) => ({
                ...prev,
                whatsapp: { ...prev.whatsapp, enabled },
              }))
            }
          >
            <ChannelFields
              baseUrl={config.communications.whatsapp.baseUrl}
              apiKey={config.communications.whatsapp.apiKey ?? ''}
              apiKeyHeaderName={config.communications.whatsapp.apiKeyHeaderName ?? ''}
              defaultSenderId={config.communications.whatsapp.defaultSenderId ?? ''}
              onChange={(patch) =>
                updateLocalConfig('communications', (prev) => ({
                  ...prev,
                  whatsapp: { ...prev.whatsapp, ...patch },
                }))
              }
            />
          </ChannelCard>

          {/* SMS */}
          <ChannelCard
            title="SMS"
            enabled={config.communications.sms.enabled}
            onToggle={(enabled) =>
              updateLocalConfig('communications', (prev) => ({
                ...prev,
                sms: { ...prev.sms, enabled },
              }))
            }
          >
            <ChannelFields
              baseUrl={config.communications.sms.baseUrl}
              apiKey={config.communications.sms.apiKey ?? ''}
              apiKeyHeaderName={config.communications.sms.apiKeyHeaderName ?? ''}
              defaultSenderId={config.communications.sms.defaultSenderId ?? ''}
              onChange={(patch) =>
                updateLocalConfig('communications', (prev) => ({
                  ...prev,
                  sms: { ...prev.sms, ...patch },
                }))
              }
            />
          </ChannelCard>

          {/* Email */}
          <ChannelCard
            title="Email"
            enabled={config.communications.email.enabled}
            onToggle={(enabled) =>
              updateLocalConfig('communications', (prev) => ({
                ...prev,
                email: { ...prev.email, enabled },
              }))
            }
          >
            <ChannelFields
              baseUrl={config.communications.email.baseUrl}
              apiKey={config.communications.email.apiKey ?? ''}
              apiKeyHeaderName={config.communications.email.apiKeyHeaderName ?? ''}
              defaultSenderId={config.communications.email.fromAddress ?? ''}
              onChange={(patch) =>
                updateLocalConfig('communications', (prev) => ({
                  ...prev,
                  email: {
                    ...prev.email,
                    ...patch,
                    fromAddress: patch.defaultSenderId ?? prev.email.fromAddress,
                  },
                }))
              }
            />
          </ChannelCard>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingSection === 'communications'}
            className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-xs font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
          >
            {savingSection === 'communications'
              ? 'Saving...'
              : 'Save Communications'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---- Small helper components (same file) ------------------------------------

interface ChannelCardProps {
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}

function ChannelCard({ title, enabled, onToggle, children }: ChannelCardProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {title}
        </div>
        <label className="inline-flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-700"
          />
          Enabled
        </label>
      </div>
      <div className="space-y-2 opacity-100">
        {children}
      </div>
    </div>
  );
}

interface ChannelFieldsProps {
  baseUrl: string;
  apiKey: string;
  apiKeyHeaderName: string;
  defaultSenderId: string;
  onChange: (patch: {
    baseUrl?: string;
    apiKey?: string;
    apiKeyHeaderName?: string;
    defaultSenderId?: string;
  }) => void;
}

function ChannelFields({
  baseUrl,
  apiKey,
  apiKeyHeaderName,
  defaultSenderId,
  onChange,
}: ChannelFieldsProps) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-200">
          API Base URL
        </label>
        <input
          value={baseUrl}
          onChange={(e) => onChange({ baseUrl: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="https://api.provider.com/send"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-200">
          API Key
        </label>
        <input
          value={apiKey}
          onChange={(e) => onChange({ apiKey: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Paste your provider API key"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-200">
            API Key Header
          </label>
          <input
            value={apiKeyHeaderName}
            onChange={(e) => onChange({ apiKeyHeaderName: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Authorization"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-200">
            Default Sender ID
          </label>
          <input
            value={defaultSenderId}
            onChange={(e) => onChange({ defaultSenderId: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="e.g. CHURCH"
          />
        </div>
      </div>
    </div>
  );
}
