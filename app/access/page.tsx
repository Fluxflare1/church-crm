'use client';

import { useState, FormEvent } from 'react';
import { findPersonByPhone } from '@/lib/people';
import type { Person } from '@/types';

export default function AccessPage() {
  const [phone, setPhone] = useState('');
  const [person, setPerson] = useState<Person | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPerson(null);
    setSubmitted(true);

    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    const found = findPersonByPhone(phone);
    if (!found) {
      setError(
        'We could not find a record with this phone number. If this is your first time, please use the Guest Connect form.'
      );
      return;
    }

    setPerson(found);
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-lg mt-10 mb-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Access Your Record
          </h1>
          <p className="text-sm text-slate-500">
            Enter your phone number to check your status as a guest or member.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Phone number
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="+234..."
            />
          </div>
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-600"
          >
            Continue
          </button>
        </form>

        <div className="text-xs text-slate-500">
          New here?{' '}
          <a
            href="/connect"
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            Register as a first-time guest
          </a>
          .
        </div>

        {/* Result */}
        {submitted && (
          <div className="mt-4">
            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}

            {person && (
              <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 space-y-2">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {person.personalData.firstName}{' '}
                  {person.personalData.lastName}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {renderRoleSummary(person)}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Phone: {person.personalData.phone ?? '—'}
                  {person.personalData.email && (
                    <>
                      {' · '}Email: {person.personalData.email}
                    </>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  If any information here is incorrect, please speak to a
                  Relationship Manager or church admin to update your details.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderRoleSummary(person: Person): string {
  if (person.category === 'guest') {
    const guestType = person.evolution.guestType ?? 'first-time';
    if (guestType === 'first-time') {
      return 'Status: First-time guest';
    }
    if (guestType === 'returning') {
      return 'Status: Returning guest';
    }
    if (guestType === 'regular') {
      return 'Status: Regular guest';
    }
    return 'Status: Guest';
  }

  if (person.category === 'member') {
    const worker = person.engagement.isWorker;
    const segment = worker ? 'Member + Workforce' : 'Member';
    const memberStatus = person.membership?.status ?? 'active';
    return `Status: ${segment} (${memberStatus})`;
  }

  return 'Status: Unknown';
}
