import { getCurrentUser } from '@/lib/auth.server';
import { getOrganizationSessionDetail, getUserSessionDetail, recordAuditEvent } from '@/lib/database.server';
import { createSessionReportPdf } from '@/lib/report-pdf.server';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const { sessionId } = await params;
  const requestedView = new URL(req.url).searchParams.get('view');
  const view = requestedView === 'admin' ? 'admin' : 'learner';
  if (view === 'admin' && user.role !== 'admin') return Response.json({ error: 'Administrator access required.' }, { status: 403 });
  const session = user.role === 'admin'
    ? getOrganizationSessionDetail(user.organizationId, sessionId)
    : getUserSessionDetail(user.id, sessionId);
  if (!session) return Response.json({ error: 'Session not found.' }, { status: 404 });
  const pdf = createSessionReportPdf(session, view);
  const pdfBody = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  recordAuditEvent({ organizationId: user.organizationId, actorUserId: user.id, sessionId, action: 'report_pdf_downloaded', details: { view } });
  const filename = `ClinicalMirror-${view}-${session.userName}-${session.scenarioTitle}`.replace(/[^A-Za-z0-9_-]+/g, '-');
  return new Response(pdfBody, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
