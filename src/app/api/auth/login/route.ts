import { NextResponse } from 'next/server';
import { createLoginSession, verifyPassword } from '@/lib/auth.server';
import { findUserByEmail, userCount } from '@/lib/database.server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (userCount() === 0) {
    return NextResponse.json({ error: 'Initial setup is required.', setupRequired: true }, { status: 409 });
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const user = email ? findUserByEmail(email) : null;

  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }

  await createLoginSession(user.id);
  return NextResponse.json({ ok: true, role: user.role });
}
