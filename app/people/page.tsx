'use client';

import { useEffect, useState, FormEvent } from 'react';
import { getAllPeople } from '@/lib/people';
import { sendMessageToPerson } from '@/lib/communications';

import type { Person, CommunicationChannel } from '@/types';

const CURRENT_USER_ID = 'system'; // TODO: replace with real authenticated user ID

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [messageBody, setMessageBody] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const all = getAllPeople();
    setPeople(all);
  }, []);

  const selectedPerson = people.find((p) => p.id === selectedPersonId) || null;

  const handleSelectPerson = (person: Person) => {
    setSelectedPersonId(person.id);
    setFeedback(null);
    setError(null);

    if (!messageBody) {
      // Simple default message; body can be edited before sending
      const defaultBody = `Hi ${person.personalData.firstName}, we’re glad to see you at ${person.personalData.churchName ?? 'church'}!`;
      setMessageBody(defaultBody);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;
    if (!messageBody.trim()) {
      setError('Message body cannot be empty.');
      return;
    }

    setSending(true);
    setFeedback(null);
    setError(null);

    try {
      const channel: CommunicationChannel = 'whatsapp';

      const result = await sendMessageToPerson({
        personId: selectedPerson.id,
        channel,
        templateId: undefined,
        bodyOverride: messageBody,
        initiatedByUserId: CURRENT_USER_ID,
        context: {},
      });

      if (!result.success) {
        setError(result.errorMessage ?? 'Failed to send WhatsApp message.');
      } else {
        setFeedback('WhatsApp message sent successfully.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message ?? 'Failed to send WhatsApp message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          People
        </h1>
        <p className="text-sm text-slate-500">
          View guests and members, and send quick WhatsApp messages.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1.4fr]">
        {/* People list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
            All People
          </h2>

          {people.length === 0 ? (
            <p className="text-sm text-slate-500">
              No people yet. Register guests or onboard members first.
            </p>
          ) : (
            <div className="max-h-[480px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-md">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                    <th className="py-2 px-3 text-left">Name</th>
                    <th className="py-2 px-3 text-left">Category</th>
                    <th className="py-2 px-3 text-left">Phone</th>
                    <th className="py-2 px-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((person) => {
                    const isSelected = person.id === selectedPersonId;
                    return (
                      <tr
                        key={person.id}
                        className={`border-b border-slate-100 dark:border-slate-800 ${
                          isSelected
                            ? 'bg-orange-50/60 dark:bg-orange-950/30'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-900/40'
                        }`}
                      >
                        <td className="py-2 px-3">
                          {person.personalData.firstName}{' '}
                          {person.personalData.lastName}
                        </td>
                        <td className="py-2 px-3 capitalize text-xs">
                          {person.category}
                          {person.engagement.isWorker ? ' (Workforce)' : ''}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {person.personalData.phone ?? '—'}
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => handleSelectPerson(person)}
                            className="inline-flex items-center rounded-md border border-orange-500 text-orange-600 px-2 py-1 text-xs font-medium hover:bg-orange-50 dark:hover:bg-orange-950/40"
                          >
                            Send WhatsApp
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* WhatsApp composer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
            WhatsApp Composer
          </h2>

          {!selectedPerson ? (
            <p className="text-sm text-slate-500">
              Select a person on the left to send a WhatsApp message.
            </p>
          ) : (
            <form onSubmit={handleSend} className="flex flex-col flex-1 space-y-3">
              <div className="text-xs text-slate-500">
                To:{' '}
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {selectedPerson.personalData.firstName}{' '}
                  {selectedPerson.personalData.lastName}
                </span>{' '}
                · {selectedPerson.personalData.phone ?? 'No phone number'}
              </div>

              {error && (
                <div className="text-xs text-red-600">
                  {error}
                </div>
              )}
              {feedback && (
                <div className="text-xs text-emerald-600">
                  {feedback}
                </div>
              )}

              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Message
                </label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="flex-1 min-h-[160px] rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sending || !selectedPerson.personalData.phone}
                  className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send WhatsApp'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
