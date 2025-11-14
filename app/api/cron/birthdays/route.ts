import { NextResponse } from 'next/server';
import { runBirthdayAutomation } from '@/lib/birthday';

export async function POST() {
  try {
    const result = await runBirthdayAutomation({
      createdByUserId: 'system', // TODO: replace with real user from auth
    });

    return NextResponse.json(
      {
        ok: true,
        result,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json(
      {
        ok: false,
        error: e.message ?? 'Failed to run birthday automation.',
      },
      { status: 500 },
    );
  }
}
