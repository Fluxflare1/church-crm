import { NextResponse } from 'next/server';
import { runAbsenteeDetection } from '@/lib/follow-ups';

export async function GET() {
  const result = runAbsenteeDetection(new Date());
  return NextResponse.json(result);
}
