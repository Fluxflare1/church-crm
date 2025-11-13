import { NextResponse } from 'next/server';
import { runAbsenteeAutomation } from '@/lib/attendance';

export async function POST() {
  try {
    const result = runAbsenteeAutomation({
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
        error: e.message ?? 'Failed to run absentee automation.',
      },
      { status: 500 },
    );
  }
}
