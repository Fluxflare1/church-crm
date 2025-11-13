'use client';

import { useEffect, useState, FormEvent } from 'react';
import {
  getAllPeople,
  promoteGuestToMember,
  createMember,
} from '@/lib/people';
import type { Person, MemberStatus } from '@/types';

const MEMBERSHIP_STATUSES: { value: MemberStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export default function OnboardMemberPage() {
  const [people, setPeople] = useState<Person[]>([]);

  // --- Promotion state ---
  const [promotionPersonId, setPromotionPersonId] = useState<string>('');
  const [promotionDate, setPromotionDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [promotionIsWorker, setPromotionIsWorker] = useState(false);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [promoting, setPromoting] = useState(false);

  // --- New member state ---
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    gender: '',
    dob: '',
    membershipDate: new Date().toISOString().slice(0, 10),
    membershipStatus: 'active' as MemberStatus,
    membershipNumber: '',
    isWorker: false,
  });
  const [newMemberMessage, setNewMemberMessage] = useState<string | null>(null);
  const [newMemberError, setNewMemberError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const all = getAllPeople();
    setPeople(all);
  }, []);

  // Guests that evolution logic has marked as ready for promotion
  const promotableGuests = people.filter(
    (p) =>
      p.category === 'guest' &&
      p.evolution.guestType === 'regular' &&
      p.evolution.readyForPromotion
  );

  // ---------------- PROMOTE GUEST → MEMBER ----------------

  const handlePromote = (e: FormEvent) => {
    e.preventDefault();
    setPromotionError(null);
    setPromotionMessage(null);

    if (!promotionPersonId) {
      setPromotionError('Select a guest to promote.');
      return;
    }

    setPromoting(true);
    try {
      const promoted = promoteGuestToMember({
        personId: promotionPersonId,
        membershipDate: new Date(promotionDate).toISOString(),
        membershipStatus: 'active',
        membershipNumber: undefined,
        isWorker: promotionIsWorker,
        force: false, // set true if you want to override thresholds
      });

      if (!promoted) {
        setPromotionError('Failed to promote guest (no changes applied).');
      } else {
        setPromotionMessage(
          `Guest promoted to member${promotionIsWorker ? ' + Workforce' : ''} successfully.`
        );
        const all = getAllPeople();
        setPeople(all);
        setPromotionPersonId('');
        setPromotionIsWorker(false);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setPromotionError(error.message ?? 'Failed to promote guest.');
    } finally {
      setPromoting(false);
    }
  };

  // ---------------- CREATE NEW MEMBER ----------------

  const handleCreateMember = (e: FormEvent) => {
    e.preventDefault();
    setNewMemberError(null);
    setNewMemberMessage(null);

    if (!newMember.firstName || !newMember.lastName || !newMember.phone) {
      setNewMemberError('First name, last name, and phone are required.');
      return;
    }

    setCreating(true);
    try {
      const person = createMember({
        personalData: {
          firstName: newMember.firstName,
          lastName: newMember.lastName,
          phone: newMember.phone,
          email: newMember.email || undefined,
          gender: newMember.gender || undefined,
          dob: newMember.dob || undefined,
          churchName: undefined, // can be filled from SystemConfig elsewhere
        },
        membershipDate: new Date(newMember.membershipDate).toISOString(),
        membershipStatus: newMember.membershipStatus,
        membershipNumber: newMember.membershipNumber || undefined,
        isWorker: newMember.isWorker, // Member vs Member + Workforce
        tags: [],
        primaryRmUserId: undefined,
        secondaryRmUserIds: [],
      });

      if (!person) {
        setNewMemberError('Failed to create member.');
      } else {
        setNewMemberMessage(
          `Member created successfully${newMember.isWorker ? ' (Member + Workforce)' : ''}.`
        );
        const all = getAllPeople();
        setPeople(all);
        setNewMember({
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          gender: '',
          dob: '',
          membershipDate: new Date().toISOString().slice(0, 10),
          membershipStatus: 'active',
          membershipNumber: '',
          isWorker: false,
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setNewMemberError(error.message ?? 'Failed to create member.');
    } finally {
      setCreating(false);
    }
  };

  // ---------------- RENDER ----------------

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Member Onboarding
        </h1>
        <p className="text-sm text-slate-500">
          Promote regular guests to members or create new members directly. Use{' '}
          <span className="font-medium">Member</span> or{' '}
          <span className="font-medium">Member + Workforce</span> depending on their role.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ===== Left: Promote Guest → Member ===== */}
        <form
          onSubmit={handlePromote}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Promote Guest → Member
              </h2>
              <p className="text-xs text-slate-500">
                Uses evolution thresholds and keeps full guest history.
              </p>
            </div>
          </div>

          {promotionError && (
            <div className="text-xs text-red-600">{promotionError}</div>
          )}
          {promotionMessage && (
            <div className="text-xs text-emerald-600">{promotionMessage}</div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Regular guest ready for promotion
              </label>
              <select
                value={promotionPersonId}
                onChange={(e) => setPromotionPersonId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select regular guest...</option>
                {promotableGuests.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.personalData.firstName} {p.personalData.lastName} ·{' '}
                    {p.evolution.visitCount} visits
                  </option>
                ))}
              </select>
              {promotableGuests.length === 0 && (
                <p className="mt-1 text-[11px] text-slate-500">
                  No guests currently meet promotion thresholds. Adjust evolution
                  settings in <span className="font-medium">Settings → Evolution</span> if needed.
                </p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                  Membership date
                </label>
                <input
                  type="date"
                  value={promotionDate}
                  onChange={(e) => setPromotionDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={promotionIsWorker}
                    onChange={(e) => setPromotionIsWorker(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700"
                  />
                  Member + Workforce
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={promoting || promotableGuests.length === 0}
              className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-xs font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
            >
              {promoting ? 'Promoting…' : 'Promote to Member'}
            </button>
          </div>
        </form>

        {/* ===== Right: Create New Member Directly ===== */}
        <form
          onSubmit={handleCreateMember}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Create New Member
              </h2>
              <p className="text-xs text-slate-500">
                For people who join directly without passing through guest stage.
              </p>
            </div>
          </div>

          {newMemberError && (
            <div className="text-xs text-red-600">{newMemberError}</div>
          )}
          {newMemberMessage && (
            <div className="text-xs text-emerald-600">{newMemberMessage}</div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                First name *
              </label>
              <input
                value={newMember.firstName}
                onChange={(e) =>
                  setNewMember((m) => ({ ...m, firstName: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Last name *
              </label>
              <input
                value={newMember.lastName}
                onChange={(e) =>
                  setNewMember((m) => ({ ...m, lastName: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Phone *
              </label>
              <input
                value={newMember.phone}
                onChange={(e) =>
                  setNewMember((m) => ({ ...m, phone: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="+234..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Email
              </label>
              <input
                type="email"
                value={newMember.email}
                onChange={(e) =>
                  setNewMember((m) => ({ ...m, email: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Gender
              </label>
              <select
                value={newMember.gender}
                onChange={(e) =>
                  setNewMember((m) => ({ ...m, gender: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Date of birth
              </label>
              <input
                type="date"
                value={newMember.dob}
                onChange={(e) =>
                  setNewMember((m) => ({ ...m, dob: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Membership date
              </label>
              <input
                type="date"
                value={newMember.membershipDate}
                onChange={(e) =>
                  setNewMember((m) => ({
                    ...m,
                    membershipDate: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Membership status
              </label>
              <select
                value={newMember.membershipStatus}
                onChange={(e) =>
                  setNewMember((m) => ({
                    ...m,
                    membershipStatus: e.target.value as MemberStatus,
                  }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
              >
                {MEMBERSHIP_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                Membership number
              </label>
              <input
                value={newMember.membershipNumber}
                onChange={(e) =>
                  setNewMember((m) => ({
                    ...m,
                    membershipNumber: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Optional code or ID"
              />
            </div>
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={newMember.isWorker}
                  onChange={(e) =>
                    setNewMember((m) => ({ ...m, isWorker: e.target.checked }))
                  }
                  className="rounded border-slate-300 dark:border-slate-700"
                />
                Member + Workforce
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-xs font-medium text-white shadow hover:bg-orange-600 disabled:opacity-50"
            >
              {creating ? 'Saving…' : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
