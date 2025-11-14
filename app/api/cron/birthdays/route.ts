import { NextResponse } from 'next/server';
import { runBirthdayAutomation } from '@/lib/birthday';

async function handle() {
  try {
    const result = await runBirthdayAutomation(new Date());
    return NextResponse.json(
      {
        ok: true,
        result,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Birthday cron failed', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Birthday automation failed',
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
