import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth.server';
import { getUserUsage } from '@/lib/database.server';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  return NextResponse.json({ usage: getUserUsage(user) });
}
