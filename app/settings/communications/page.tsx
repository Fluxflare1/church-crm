'use client';

import { FormEvent, useEffect, useState } from 'react';
import { nanoid } from 'nanoid';

import { getSystemConfig, updateCommunicationsConfig } from '@/lib/config';
import type {
  SystemConfig,
  CommunicationsConfig,
  BroadcastMessageTemplateConfig,
} from '@/types';

type EditableTemplate = BroadcastMessageTemplateConfig;

export default function CommunicationsSettingsPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [templates, setTemplates] = useState<EditableTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cfg = getSystemConfig();
    setConfig(cfg);
    setTemplates(cfg.communications.broadcastTemplates ?? []);
    if (cfg.communications.broadcastTemplates?.length) {
      setSelectedTemplateId(cfg.communications.broadcastTemplates[0].id);
    }
  }, []);

  const selectedTemplate =
    templates.find((t) => t.id === selectedTemplateId) ?? null;

  function handleSelectTemplate(id: string) {
    setSelectedTemplateId(id);
    setMessage(null);
    setError(null);
  }

  function handleNewTemplate() {
    const newTemplate: EditableTemplate = {
      id: nanoid(),
      name: 'New template',
      description: '',
      defaultChannel: 'whatsapp',
      bodyTemplate: 'Dear {{firstName}}, ',
      isActive: true,
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    setSelectedTemplateId(newTemplate.id);
    setMessage(null);
    setError(null);
  }

  function handleTemplateChange(
    field: keyof EditableTemplate,
    value: string | boolean,
  ) {
    if (!selectedTemplate) return;

    const updated = templates.map((t) =>
      t.id === selectedTemplate.id
        ? {
            ...t,
            [field]: value,
          }
        : t,
    );
    setTemplates(updated);
  }

  function validateTemplates(list: EditableTemplate[]): string | null {
    if (!list.length) return null; // allowed, just no templates
    for (const t of list) {
      if (!t.name.trim()) return 'Each template must have a name.';
      if (!t.bodyTemplate.trim())
        return 'Each template must have a body content.';
    }
    return null;
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const validationError = validateTemplates(templates);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const sanitized: BroadcastMessageTemplateConfig[] = templates.map((t) => ({
        id: t.id,
        name: t.name.trim(),
        description: t.description?.trim() || undefined,
        defaultChannel: t.defaultChannel,
        bodyTemplate: t.bodyTemplate,
        isActive: t.isActive,
      }));

      const updatedConfig = updateCommunicationsConfig({
        broadcastTemplates: sanitized,
      });

      setConfig(updatedConfig);
      setTemplates(updatedConfig.communications.broadcastTemplates ?? []);
      setMessage('Communication templates saved successfully.');
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to save communication settings.');
    } finally {
      setSaving(false);
    }
  }

  const sortedTemplates = [...templates].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Communications Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure messaging providers and saved broadcast templates. These
          templates are used in Broadcast, birthdays, and other automated messages.
        </p>
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
        onSubmit={handleSave}
        className="grid gap-6 lg:grid-cols-[1.2fr,1.8fr]"
      >
        {/* Left column: Templates list */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Broadcast templates
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Saved content for invitations, reminders, thank-you messages, etc.
              </p>
            </div>
            <button
              type="button"
              onClick={handleNewTemplate}
              className="inline-flex items-center rounded-md border border-orange-500 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40"
            >
              + New template
            </button>
          </div>

          {sortedTemplates.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              No templates yet. Click &quot;New template&quot; to create one.
            </p>
          ) : (
            <div className="mt-3 max-h-[280px] overflow-y-auto rounded-md border border-slate-100 text-xs dark:border-slate-800">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-900/40">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Channel</th>
                    <th className="px-3 py-2 font-medium">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTemplates.map((t) => {
                    const isSelected = t.id === selectedTemplateId;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => handleSelectTemplate(t.id)}
                        className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50 ${
                          isSelected
                            ? 'bg-orange-50/60 dark:bg-orange-950/30'
                            : ''
                        }`}
                      >
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-100">
                          {t.name}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {t.defaultChannel ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {t.isActive ? 'Yes' : 'No'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column: Template editor */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Template details
          </h2>

          {!selectedTemplate ? (
            <p className="mt-3 text-xs text-slate-500">
              Select a template on the left or create a new one.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Name
                </label>
                <input
                  type="text"
                  value={selectedTemplate.name}
                  onChange={(e) =>
                    handleTemplateChange('name', e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
                  placeholder="e.g. Sunday invitation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={selectedTemplate.description ?? ''}
                  onChange={(e) =>
                    handleTemplateChange('description', e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
                  placeholder="Short note about when to use this template"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Default channel
                  </label>
                  <select
                    value={selectedTemplate.defaultChannel ?? 'whatsapp'}
                    onChange={(e) =>
                      handleTemplateChange(
                        'defaultChannel',
                        e.target.value as 'whatsapp' | 'sms' | 'email',
                      )
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="template-active"
                    type="checkbox"
                    checked={selectedTemplate.isActive}
                    onChange={(e) =>
                      handleTemplateChange('isActive', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                  />
                  <label
                    htmlFor="template-active"
                    className="text-xs text-slate-600 dark:text-slate-300"
                  >
                    Template is active
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Body template
                </label>
                <p className="mt-1 text-[11px] text-slate-500">
                  Use placeholders like{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] dark:bg-slate-800">
                    {'{{firstName}}'}
                  </code>
                  ,{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] dark:bg-slate-800">
                    {'{{programName}}'}
                  </code>
                  ,{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] dark:bg-slate-800">
                    {'{{programDate}}'}
                  </code>
                  .
                </p>
                <textarea
                  value={selectedTemplate.bodyTemplate}
                  onChange={(e) =>
                    handleTemplateChange('bodyTemplate', e.target.value)
                  }
                  className="mt-2 min-h-[200px] w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700"
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
