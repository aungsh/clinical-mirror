import Link from 'next/link';
import type { LearnerFeedback } from '@/lib/types';

export function LearnerReport({
  feedback,
  scenarioTitle,
  personName,
  sessionId,
}: {
  feedback: LearnerFeedback;
  scenarioTitle: string;
  personName?: string;
  sessionId?: string;
}) {
  return (
    <main style={{ width: 'min(100% - 32px, 940px)', margin: '0 auto', paddingBlock: 44 }}>
      <p className="font-mono" style={eyebrow}>LEARNING REVIEW · FORMATIVE, NOT PASS OR FAIL</p>
      <h1 style={{ margin: '0 0 10px', color: 'var(--text-1)', fontSize: 'clamp(30px, 5vw, 44px)', lineHeight: 1.12 }}>{feedback.headline}</h1>
      <p style={{ margin: '0 0 14px', color: 'var(--text-3)', fontSize: 13 }}>{scenarioTitle}{personName ? ` · ${personName}` : ''}</p>
      <p style={{ margin: '0 0 30px', maxWidth: 780, color: 'var(--text-2)', fontSize: 16, lineHeight: 1.65 }}>{feedback.summary}</p>

      <section style={{ marginBottom: 28 }}>
        <p className="font-mono" style={eyebrow}>RUBRIC SNAPSHOT</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          {feedback.rubricSnapshot.map((item) => (
            <div key={item.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <strong style={{ color: 'var(--text-1)', fontSize: 14 }}>{item.label}</strong>
                <span style={{ color: scoreColor(item.score), fontSize: 21, fontWeight: 700 }}>{item.score}<small style={{ color: 'var(--text-3)', fontSize: 10 }}>/10</small></span>
              </div>
              <p style={{ margin: '8px 0 0', color: scoreColor(item.score), fontSize: 11, fontWeight: 600 }}>{item.descriptor}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16, marginBottom: 18 }}>
        <section style={card}>
          <p className="font-mono" style={{ ...eyebrow, color: 'var(--primary)' }}>WHAT WORKED</p>
          {feedback.strengths.length ? feedback.strengths.map((item, index) => (
            <Evidence key={index} turn={item.turn} moment={item.moment} detail={item.observation} />
          )) : <Empty text="The transcript did not provide enough evidence for a reliable strength yet." />}
        </section>

        <section style={card}>
          <p className="font-mono" style={{ ...eyebrow, color: 'var(--warn)' }}>PRIORITIES TO IMPROVE</p>
          {feedback.priorities.map((item, index) => (
            <div key={index} style={{ paddingBlock: 10, borderBottom: '1px solid var(--border-sub)' }}>
              <strong style={{ color: 'var(--text-1)', fontSize: 13 }}>Turn {item.turn}: “{item.moment}”</strong>
              <p style={{ margin: '6px 0', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>{item.whyItMatters}</p>
              <p style={{ margin: 0, color: 'var(--accent)', fontSize: 13, lineHeight: 1.55 }}><strong>Try instead:</strong> {item.tryInstead}</p>
            </div>
          ))}
        </section>
      </div>

      <section style={{ ...card, marginBottom: 18, background: 'var(--accent-bg)', borderColor: 'var(--accent-bd)' }}>
        <p className="font-mono" style={{ ...eyebrow, color: 'var(--accent)' }}>NEXT ATTEMPT PLAN</p>
        <ol style={{ margin: 0, paddingLeft: 22, color: 'var(--text-1)', lineHeight: 1.8 }}>
          {feedback.nextAttemptPlan.map((item, index) => <li key={index}>{item}</li>)}
        </ol>
      </section>

      {feedback.progress ? (
        <section style={{ ...card, marginBottom: 18 }}>
          <p className="font-mono" style={eyebrow}>CHANGE SINCE ATTEMPT {feedback.progress.previousAttemptNumber}</p>
          <ProgressLine label="Improved indicators" values={feedback.progress.improved} color="var(--primary)" />
          <ProgressLine label="Priority indicators" values={feedback.progress.declined} color="var(--warn)" />
          <p style={{ margin: '10px 0 0', color: 'var(--text-3)', fontSize: 12 }}>{feedback.progress.note}</p>
        </section>
      ) : null}

      <p style={{ margin: '20px 0 0', color: 'var(--text-3)', fontSize: 12, lineHeight: 1.55 }}>{feedback.educationalDisclaimer}</p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
        {sessionId ? <a href={`/api/reports/${sessionId}/pdf?view=learner`} className="btn">Download learner PDF</a> : null}
        <Link href="/dashboard" className="btn">My practice history</Link>
      </div>
    </main>
  );
}

function Evidence({ turn, moment, detail }: { turn: number; moment: string; detail: string }) {
  return <div style={{ paddingBlock: 10, borderBottom: '1px solid var(--border-sub)' }}><strong style={{ color: 'var(--text-1)', fontSize: 13 }}>Turn {turn}: “{moment}”</strong><p style={{ margin: '5px 0 0', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>{detail}</p></div>;
}
function Empty({ text }: { text: string }) { return <p style={{ color: 'var(--text-3)', fontSize: 13, lineHeight: 1.6 }}>{text}</p>; }
function ProgressLine({ label, values, color }: { label: string; values: string[]; color: string }) { return <p style={{ margin: '7px 0', color: 'var(--text-2)', fontSize: 13 }}><strong style={{ color }}>{label}:</strong> {values.length ? values.join(', ') : 'No clear change yet'}</p>; }
function scoreColor(score: number) { return score >= 8 ? 'var(--primary)' : score >= 5 ? 'var(--accent)' : 'var(--warn)'; }
const card: React.CSSProperties = { padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 };
const eyebrow: React.CSSProperties = { margin: '0 0 11px', color: 'var(--text-3)', fontSize: 9, letterSpacing: '0.12em' };
