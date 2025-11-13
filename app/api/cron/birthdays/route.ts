// app/api/cron/birthdays/route.ts

import { NextResponse } from 'next/server';
import { runBirthdayAutomation } from '@/lib/birthdays';

export async function GET() {
  const result = runBirthdayAutomation(new Date());
  return NextResponse.json(result);
}
