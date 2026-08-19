import { getCurrentUser } from '@/lib/auth.server';
import { getOrganizationSessionDetail, listOrganizationSessions, recordAuditEvent } from '@/lib/database.server';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  if (admin.role !== 'admin') return Response.json({ error: 'Administrator access required.' }, { status: 403 });
  const details = listOrganizationSessions(admin.organizationId)
    .map((item) => getOrganizationSessionDetail(admin.organizationId, item.id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const rubricIds = [...new Set(details.flatMap((session) => session.adminEvaluation.rubrics.map((item) => item.id)))];
  const headers = ['session_id', 'learner_name', 'learner_email', 'scenario', 'attempt', 'ended_at', 'duration_seconds', 'evaluation_source', ...rubricIds, 'reviewer', 'reviewer_notes'];
  const rows = details.map((session) => {
    const scores = new Map(session.adminEvaluation.rubrics.map((item) => [item.id, item.score]));
    const overrides = new Map(session.review?.overrides.map((item) => [item.rubricId, item.score]) ?? []);
    return [session.id, session.userName, session.userEmail, session.scenarioTitle, session.attemptNumber, session.endedAt, session.durationSeconds, session.adminEvaluation.fallbackUsed ? 'observable-rules' : 'gemini-plus-rules', ...rubricIds.map((id) => overrides.get(id) ?? scores.get(id) ?? ''), session.review?.reviewerName ?? '', session.review?.notes ?? ''];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  recordAuditEvent({ organizationId: admin.organizationId, actorUserId: admin.id, action: 'organization_csv_downloaded', details: { sessionCount: details.length } });
  return new Response(`\uFEFF${csv}`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ClinicalMirror-organisation-results.csv"', 'Cache-Control': 'private, no-store' } });
}

function csvCell(value: unknown) { const text = String(value ?? ''); return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
