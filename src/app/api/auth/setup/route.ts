import { NextResponse } from 'next/server';
import { createLoginSession, hashPassword, validatePassword } from '@/lib/auth.server';
import { createOrganizationWithAdmin, userCount } from '@/lib/database.server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ setupRequired: userCount() === 0 });
}

export async function POST(req: Request) {
  if (userCount() > 0) {
    return NextResponse.json({ error: 'Initial setup has already been completed.' }, { status: 409 });
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const organizationName = typeof body?.organizationName === 'string' ? body.organizationName.trim() : '';
  const adminName = typeof body?.adminName === 'string' ? body.adminName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const passwordError = validatePassword(password);

  if (organizationName.length < 2 || adminName.length < 2 || !email.includes('@') || passwordError) {
    return NextResponse.json(
      { error: passwordError ?? 'Enter a valid organisation, name, and email address.' },
      { status: 400 },
    );
  }

  try {
    const admin = createOrganizationWithAdmin({
      organizationName: organizationName.slice(0, 120),
      adminName: adminName.slice(0, 80),
      email: email.slice(0, 160),
      passwordHash: hashPassword(password),
    });
    await createLoginSession(admin.id);
    return NextResponse.json({ ok: true, role: admin.role });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Setup could not be completed.' },
      { status: 409 },
    );
  }
}
