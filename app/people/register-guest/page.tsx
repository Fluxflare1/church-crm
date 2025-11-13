'use client';

import { useState, FormEvent } from 'react';
import { createGuest } from '@/lib/people';

import type { CreateGuestInput } from '@/lib/people';
import type { ReferralSource, GuestInterests } from '@/types';

const REFERRAL_SOURCES: { value: ReferralSource; label: string }[] = [
  { value: 'invited-by-friend', label: 'Invited by a friend' },
  { value: 'social-media', label: 'Social media' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'online-service', label: 'Online service' },
  { value: 'other', label: 'Other' },
];

const INTEREST_OPTIONS: { value: GuestInterests[number]; label: string }[] = [
  'prayer',
  'counselling',
  'membership',
  'cell-group',
  'volunteering',
  'discipleship',
].map((v) => ({ value: v as GuestInterests[number], label: v[0].toUpperCase() + v.slice(1) }));

export default function RegisterGuestPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [personal, setPersonal] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    phone: '',
    email: '',
  });

  const [visit, setVisit] = useState({
    firstVisitDate: new Date().toISOString().slice(0, 10),
    referralSource: 'walk-in' as ReferralSource,
    referralName: '',
    notes: '',
  });

  const [interests, setInterests] = useState<GuestInterests>([]);
  const [acceptComms, setAcceptComms] = useState(true);

  const nextStep = () => setStep((s) => Math.min(3, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const toggleInterest = (value: GuestInterests[number]) => {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!personal.firstName || !personal.lastName || !personal.phone) {
      setErrorMessage('First name, last name, and phone are required.');
      return;
    }

    const payload: CreateGuestInput = {
      personalData: {
        firstName: personal.firstName,
        lastName: personal.lastName,
        gender: personal.gender || undefined,
        dob: personal.dob || undefined,
        phone: personal.phone,
        email: personal.email || undefined,
        churchName: undefined, // can be filled from settings elsewhere
      },
      referralSource: visit.referralSource,
      referralName: visit.referralName || undefined,
      interests,
      firstVisitDate: new Date(visit.firstVisitDate).toISOString(),
      tags: [],
      primaryRmUserId: undefined,
      secondaryRmUserIds: [],
      isWorker: false,
    };

    setSubmitting(true);
    try {
      createGuest(payload);
      setSuccessMessage('First-time guest registered successfully.');
      setStep(1);
      setPersonal({
        firstName: '',
        lastName: '',
        gender: '',
        dob: '',
        phone: '',
        email: '',
      });
      setVisit({
        firstVisitDate: new Date().toISOString().slice(0, 10),
        referralSource: 'walk-in',
        referralName: '',
        notes: '',
      });
      setInterests([]);
      setAcceptComms(true);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message ?? 'Failed to register guest.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Register First-Time Guest
        </h1>
        <p className="text-sm text-slate-500">
          3-step form for new guests. Returning guests are handled via attendance.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4 max-w-3xl"
      >
        {/* Step indicator */}
        <div className="flex items-center justify-between text-xs">
          <StepDot active={step === 1} label="Personal details" />
          <StepDot active={step === 2} label="Visit & referral" />
          <StepDot active={step === 3} label="Interests & consent" />
        </div>

        {errorMessage && (
          <div className="text-xs text-red-600">{errorMessage}</div>
        )}
        {successMessage && (
          <div className="text-xs text-emerald-600">{successMessage}</div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                First name *
              </label>
              <input
                value={personal.firstName}
                onChange={(e) =>
                  setPersonal((p) => ({ ...p, firstName: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Last name *
              </label>
              <input
                value={personal.lastName}
                onChange={(e) =>
                  setPersonal((p) => ({ ...p, lastName: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Gender
              </label>
              <select
                value={personal.gender}
                onChange={(e) =>
                  setPersonal((p) => ({ ...p, gender: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Date of birth
              </label>
              <input
                type="date"
                value={personal.dob}
                onChange={(e) =>
                  setPersonal((p) => ({ ...p, dob: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Phone number *
              </label>
              <input
                value={personal.phone}
                onChange={(e) =>
                  setPersonal((p) => ({ ...p, phone: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="+234..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
              </label>
              <input
                type="email"
                value={personal.email}
                onChange={(e) =>
                  setPersonal((p) => ({ ...p, email: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                First visit date
              </label>
              <input
                type="date"
                value={visit.firstVisitDate}
                onChange={(e) =>
                  setVisit((v) => ({ ...v, firstVisitDate: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                How did they hear about us?
              </label>
              <select
                value={visit.referralSource}
                onChange={(e) =>
                  setVisit((v) => ({
                    ...v,
                    referralSource: e.target.value as ReferralSource,
                  }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              >
                {REFERRAL_SOURCES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Referral name (if invited)
              </label>
              <input
                value={visit.referralName}
                onChange={(e) =>
                  setVisit((v) => ({ ...v, referralName: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Notes (optional)
              </label>
              <textarea
                value={visit.notes}
                onChange={(e) =>
                  setVisit((v) => ({ ...v, notes: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 min-h-[80px]"
              />
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Interests
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((opt) => {
                  const active = interests.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleInterest(opt.value)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        active
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={acceptComms}
                  onChange={(e) => setAcceptComms(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700"
                />
                I consent to receive communication from this church.
              </label>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-2">
          <button
            type="button"
            disabled={step === 1}
            onClick={prevStep}
            className="inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40 disabled:opacity-50"
          >
            Previous
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-xs font-medium text-white shadow hover:bg-orange-600"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-xs font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Guest'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function StepDot({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex-1 flex items-center gap-2">
      <div
        className={`h-2 w-2 rounded-full ${
          active ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      />
      <span
        className={`text-[11px] ${
          active
            ? 'text-slate-900 dark:text-slate-50 font-medium'
            : 'text-slate-500'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
