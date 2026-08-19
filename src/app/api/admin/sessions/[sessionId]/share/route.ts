import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth.server';
import { getOrganizationSessionDetail, recordAuditEvent } from '@/lib/database.server';

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (admin.role !== 'admin') return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  const { sessionId } = await params;
  if (!getOrganizationSessionDetail(admin.organizationId, sessionId)) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const channel = typeof body?.channel === 'string' ? body.channel.slice(0, 80) : 'unknown';
  recordAuditEvent({ organizationId: admin.organizationId, actorUserId: admin.id, sessionId, action: 'report_share_intent', details: { channel } });
  return NextResponse.json({ recorded: true });
}
