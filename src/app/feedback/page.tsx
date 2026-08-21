'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LearnerReport } from '@/components/LearnerReport';
import type { SessionData } from '@/lib/types';

export default function FeedbackPage() {
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const surveyUrl = process.env.NEXT_PUBLIC_POST_SESSION_SURVEY_URL;

  useEffect(() => {
    const stored = sessionStorage.getItem('clinicalmirror_session');
    if (!stored) return router.push('/dashboard');
    try { setData(JSON.parse(stored) as SessionData); }
    catch { router.push('/dashboard'); }
  }, [router]);

  if (!data) return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--text-2)' }}>Loading learning review…</main>;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="shell" style={{ minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Link href="/dashboard" style={{ color: 'var(--text-1)', fontWeight: 700, textDecoration: 'none' }}>ClinicalMirror</Link>
          <Link href="/dashboard" style={{ color: 'var(--text-2)', fontSize: 13 }}>My practice</Link>
        </div>
      </header>
      <LearnerReport feedback={data.feedback} scenarioTitle={data.scenario.title} personName={data.scenario.patientName} sessionId={data.sessionId} />
      <div style={{ width: 'min(100% - 32px, 940px)', margin: '-24px auto 44px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href={`/session/${data.scenario.id}`} className="btn btn-primary">Practice this scenario again</Link>
        <Link href="/#scenarios" className="btn">Choose another scenario</Link>
        {surveyUrl ? <a href={surveyUrl} target="_blank" rel="noreferrer" className="btn">Complete post-session survey</a> : null}
      </div>
    </div>
  );
}
