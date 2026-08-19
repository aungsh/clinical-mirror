import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth.server';
import { saveSessionReview } from '@/lib/database.server';
import type { RubricOverride } from '@/lib/types';

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (admin.role !== 'admin') return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  const { sessionId } = await params;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 4000) : '';
  const overrides: RubricOverride[] = Array.isArray(body?.overrides) ? body.overrides.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const value = item as Record<string, unknown>;
    const rubricId = typeof value.rubricId === 'string' ? value.rubricId.slice(0, 80) : '';
    const rationale = typeof value.rationale === 'string' ? value.rationale.trim().slice(0, 500) : '';
    const score = Math.max(0, Math.min(10, Math.round(Number(value.score))));
    return rubricId && rationale && Number.isFinite(score) ? [{ rubricId, rationale, score }] : [];
  }) : [];
  try {
    saveSessionReview({ organizationId: admin.organizationId, sessionId, reviewerUserId: admin.id, notes, overrides });
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save review.' }, { status: 400 });
  }
}
