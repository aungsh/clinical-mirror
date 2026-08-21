import { NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, validatePassword } from '@/lib/auth.server';
import { createOrganizationUser } from '@/lib/database.server';
import type { UserRole } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (admin.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const role: UserRole = body?.role === 'admin' ? 'admin' : 'user';
  const passwordError = validatePassword(password);

  if (displayName.length < 2 || !email.includes('@') || passwordError) {
    return NextResponse.json(
      { error: passwordError ?? 'Enter a valid name and email address.' },
      { status: 400 },
    );
  }

  try {
    const id = createOrganizationUser({
      organizationId: admin.organizationId,
      displayName: displayName.slice(0, 80),
      email: email.slice(0, 160),
      passwordHash: hashPassword(password),
      role,
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error && /unique/i.test(error.message)
      ? 'An account with that email already exists.'
      : 'The account could not be created.';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
