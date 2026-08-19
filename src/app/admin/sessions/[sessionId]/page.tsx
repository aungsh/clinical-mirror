import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccountHeader } from '@/components/AccountHeader';
import { requirePageUser } from '@/lib/auth.server';
import { getLatestUserScenarioEvaluation, getOrganizationSessionDetail } from '@/lib/database.server';
import { ReportActions } from './ReportActions';
import { ReviewerPanel } from './ReviewerPanel';

export const runtime = 'nodejs';

export default async function AdminSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const admin = await requirePageUser('admin');
  const { sessionId } = await params;
  const session = getOrganizationSessionDetail(admin.organizationId, sessionId);
  if (!session) notFound();
  const report = session.adminEvaluation;
  const latest = getLatestUserScenarioEvaluation(session.userId, session.scenarioId);
  const overrides = new Map(session.review?.overrides.map((item) => [item.rubricId, item]) ?? []);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <AccountHeader user={admin} />
      <main className="shell" style={{ paddingBlock: 38, maxWidth: 1120 }}>
        <Link href="/admin" style={{ color: 'var(--text-3)', fontSize: 13 }}>← Back to admin</Link>
        <div style={{ margin: '22px 0 24px', display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <div><p className="font-mono" style={eyebrow}>ADMIN EVIDENCE REPORT · VERSION {report.version}</p><h1 style={{ margin: '0 0 8px', color: 'var(--text-1)', fontSize: 32 }}>{session.userName} · {session.scenarioTitle}</h1><p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>Attempt {session.attemptNumber} · {formatDate(session.endedAt)} · {Math.max(1, Math.round(session.durationSeconds / 60))} min · {report.fallbackUsed ? 'rules fallback used' : 'Gemini + observable rules'}</p></div>
          <ReportActions sessionId={session.id} learnerName={session.userName} scenarioTitle={session.scenarioTitle} />
        </div>

        <section style={{ ...card, marginBottom: 18 }}><p className="font-mono" style={eyebrow}>FACTUAL SUMMARY</p><p style={{ margin: 0, color: 'var(--text-1)', lineHeight: 1.65 }}>{report.factualSummary}</p></section>

        <section style={{ marginBottom: 18 }}>
          <p className="font-mono" style={eyebrow}>DETAILED RUBRIC</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {report.rubrics.map((rubric) => {
              const override = overrides.get(rubric.id);
              return <div key={rubric.id} style={card}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong style={{ color: 'var(--text-1)' }}>{rubric.label}{rubric.scenarioSpecific ? ' · scenario' : ''}</strong><span style={{ color: scoreColor(override?.score ?? rubric.score), fontSize: 24, fontWeight: 700 }}>{override?.score ?? rubric.score}<small style={{ color: 'var(--text-3)', fontSize: 10 }}>/10</small></span></div><p style={{ margin: '8px 0', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>{rubric.rationale}</p>{override ? <p style={{ margin: '8px 0', color: 'var(--primary)', fontSize: 12 }}><strong>Human override:</strong> {override.rationale}</p> : null}<p style={{ margin: 0, color: 'var(--text-3)', fontSize: 10 }}>{rubric.confidence.toUpperCase()} CONFIDENCE</p>{rubric.evidence.map((item, index) => <Evidence key={index} turn={item.turn} moment={item.moment} text={item.observation} />)}</div>;
            })}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginBottom: 18 }}>
          <section style={card}><p className="font-mono" style={{ ...eyebrow, color: 'var(--primary)' }}>OBSERVED STRENGTHS</p>{report.strengths.length ? report.strengths.map((item, index) => <Evidence key={index} turn={item.turn} moment={item.moment} text={item.observation} />) : <p style={muted}>No reliable strength evidence was detected.</p>}</section>
          <section style={card}><p className="font-mono" style={{ ...eyebrow, color: 'var(--warn)' }}>DEVELOPMENT PRIORITIES</p>{report.improvements.map((item, index) => <Evidence key={index} turn={item.turn} moment={item.moment} text={item.suggestion} />)}</section>
        </div>

        <section style={{ ...card, marginBottom: 18 }}><p className="font-mono" style={eyebrow}>DELIVERY OBSERVATIONS · NO RAW AUDIO STORED</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}><Metric label="Speaking share" value={`${report.delivery.speakingSharePercent}%`} /><Metric label="Average words/turn" value={report.delivery.averageWordsPerTurn} /><Metric label="Questions" value={report.delivery.questionCount} /><Metric label="Fillers" value={report.delivery.fillerCount} /><Metric label="Hedges" value={report.delivery.hedgingCount} /><Metric label="Profanity" value={report.delivery.profanityCount} /><Metric label="Possible overlaps" value={report.delivery.interruptions} /><Metric label="Speech segments" value={report.delivery.speakingSegments} /></div><p style={{ margin: '14px 0 0', color: 'var(--text-3)', fontSize: 12 }}>{report.delivery.interpretation}</p></section>

        {report.flags.length ? <section style={{ ...card, marginBottom: 18, borderColor: 'var(--warn)' }}><p className="font-mono" style={{ ...eyebrow, color: 'var(--warn)' }}>HUMAN-REVIEW FLAGS</p>{report.flags.map((flag, index) => <p key={index} style={{ color: 'var(--text-2)', fontSize: 13 }}><strong style={{ color: 'var(--text-1)' }}>{flag.label}:</strong> {flag.evidence}</p>)}</section> : null}

        <section style={{ ...card, marginBottom: 18 }}><p className="font-mono" style={eyebrow}>SCENARIO GOALS</p>{report.goalCompletion.map((goal, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, paddingBlock: 8, borderBottom: '1px solid var(--border-sub)' }}><span style={{ color: goal.status === 'observed' ? 'var(--primary)' : goal.status === 'partial' ? 'var(--accent)' : 'var(--warn)', fontSize: 11, fontWeight: 700 }}>{goal.status.toUpperCase()}</span><div><strong style={{ color: 'var(--text-1)', fontSize: 13 }}>{goal.goal}</strong><p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: 12 }}>{goal.evidence}</p></div></div>)}</section>

        <ReviewerPanel sessionId={session.id} rubrics={report.rubrics} existing={session.review} />

        <section style={{ ...card, marginBlock: 18 }}><p className="font-mono" style={eyebrow}>FULL TRANSCRIPT</p><div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{session.turns.map((turn, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 12, fontSize: 13, lineHeight: 1.55 }}><span className="font-mono" style={{ color: turn.speaker === 'student' ? 'var(--accent)' : 'var(--text-3)', fontSize: 9, paddingTop: 3 }}>{turn.speaker === 'student' ? 'LEARNER' : 'SIMULATION'}</span><span style={{ color: 'var(--text-2)' }}>{turn.text}</span></div>)}</div></section>

        <section style={card}><p className="font-mono" style={eyebrow}>LIMITATIONS · {report.overallConfidence.toUpperCase()} CONFIDENCE</p><ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.7 }}>{report.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul>{latest?.attemptNumber === session.attemptNumber ? null : <p style={{ ...muted, marginTop: 12 }}>A later attempt exists. Compare reports before drawing a trend conclusion.</p>}</section>
      </main>
    </div>
  );
}

function Evidence({ turn, moment, text }: { turn: number; moment: string; text: string }) { return <div style={{ paddingBlock: 9, borderTop: '1px solid var(--border-sub)', fontSize: 13, lineHeight: 1.55 }}><strong style={{ color: 'var(--text-1)' }}>Turn {turn}: “{moment}”</strong><p style={{ margin: '4px 0 0', color: 'var(--text-2)' }}>{text}</p></div>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 9 }}><strong style={{ display: 'block', color: 'var(--text-1)', fontSize: 20 }}>{value}</strong><span style={{ color: 'var(--text-3)', fontSize: 10 }}>{label}</span></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function scoreColor(score: number) { return score >= 8 ? 'var(--primary)' : score >= 5 ? 'var(--accent)' : 'var(--warn)'; }
const card: React.CSSProperties = { padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 };
const eyebrow: React.CSSProperties = { margin: '0 0 12px', color: 'var(--text-3)', fontSize: 9, letterSpacing: '0.12em' };
const muted: React.CSSProperties = { color: 'var(--text-3)', fontSize: 13, lineHeight: 1.55 };
