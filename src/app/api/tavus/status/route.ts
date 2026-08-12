/**
 * GET /api/tavus/status
 *
 * Lets the avatar-selection screen discover at runtime whether live video
 * patients are usable, without baking a NEXT_PUBLIC_* flag into the bundle.
 *
 * Response: { available: boolean }
 */

import { NextResponse } from 'next/server';
import { isTavusConfigured } from '@/lib/tavus.server';

export async function GET() {
  return NextResponse.json(
    { available: isTavusConfigured() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
