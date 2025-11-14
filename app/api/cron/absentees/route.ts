import { NextResponse } from 'next/server';
import { runAbsenteeDetection } from '@/lib/follow-ups';

async function handle() {
  try {
    const result = await runAbsenteeDetection(new Date());
    return NextResponse.json(
      {
        ok: true,
        result,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Absentee cron failed', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Absentee detection failed',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return handle();
}

export async function POST() {
  return handle();
}
