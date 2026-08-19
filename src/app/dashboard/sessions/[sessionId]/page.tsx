import { notFound } from 'next/navigation';
import { AccountHeader } from '@/components/AccountHeader';
import { LearnerReport } from '@/components/LearnerReport';
import { requirePageUser } from '@/lib/auth.server';
import { getUserSessionDetail } from '@/lib/database.server';

export const runtime = 'nodejs';

export default async function LearnerSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requirePageUser();
  const { sessionId } = await params;
  const session = getUserSessionDetail(user.id, sessionId);
  if (!session) notFound();
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <AccountHeader user={user} />
      <LearnerReport feedback={session.learnerFeedback} scenarioTitle={session.scenarioTitle} sessionId={session.id} />
    </div>
  );
}
