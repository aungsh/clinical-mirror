'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { SessionData, EmotionType } from '@/lib/types';

const EMOTION_LABELS: Record<EmotionType, string> = {
  neutral: 'Neutral', sad: 'Sad', angry: 'Angry',
  anxious: 'Anxious', distressed: 'Distressed', relieved: 'Relieved', calm: 'Calm',
};

const SCORE_CONFIGS = [
  { key: 'empathy'      as const, label: 'Empathy',       color: '#9ec5f2' },
  { key: 'clarity'      as const, label: 'Clarity',        color: '#9eb299' },
  { key: 'deescalation' as const, label: 'De-escalation',  color: '#fab475' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const emo = payload[0]?.payload?.emotion as EmotionType | undefined;
  return (
    <div style={{
      padding: '8px 12px', background: 'var(--surface-2)',
      border: '1px solid var(--border)', borderRadius: 'var(--r)',
      fontSize: 12, color: 'var(--text-1)',
    }}>
      <p style={{ margin: 0, color: 'var(--text-2)' }}>Turn {label}</p>
      <p style={{ margin: '2px 0 0', color: '#22c55e', fontWeight: 600 }}>
        {payload[0].value}% {emo ? `· ${EMOTION_LABELS[emo]}` : ''}
      </p>
    </div>
  );
}

export default function FeedbackPage() {
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('clinicalmirror_session');
    if (!stored) { router.push('/'); return; }
    try { setData(JSON.parse(stored)); } catch { router.push('/'); }
  }, [router]);

  if (!data) return (
    <div style={{
      background: 'var(--bg)', minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
        animation: 'spin-r 0.7s linear infinite',
      }} />
    </div>
  );

  const { scenario, turns, feedback } = data;

  const chartData = turns
    .filter(t => t.speaker === 'patient' && t.intensity !== undefined)
    .map((t, i) => ({
      turn: i + 1,
      intensity: Math.round((t.intensity ?? 0) * 100),
      emotion: t.emotion,
    }));

  const avg = Math.round(
    (feedback.scores.empathy + feedback.scores.clarity + feedback.scores.deescalation) / 3
  );
  const avgColor = avg >= 7 ? '#9eb299' : avg >= 5 ? '#fab475' : '#f49797';
  const studentTurns = turns.filter(t => t.speaker === 'student').length;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--r)',
            background: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#0a0a0a', flexShrink: 0,
          }}>CM</div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
            Session Feedback
          </span>
        </div>
        <Link
          href="/"
          id="btn-home"
          style={{
            padding: '8px 18px', background: 'var(--accent)',
            color: '#0a0a0a', borderRadius: 'var(--r)',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Try another scenario
        </Link>
      </header>

      <main style={{ flex: 1, padding: '48px 40px', maxWidth: 960, width: '100%', margin: '0 auto' }}>

        {/* ── Hero: scenario + overall score ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 48,
          alignItems: 'start', marginBottom: 56,
          paddingBottom: 48, borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <p className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', marginBottom: 10 }}>
              {scenario.title.toUpperCase()}
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-1)', margin: '0 0 12px' }}>
              {feedback.summary}
            </p>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {scenario.patientName}, {scenario.patientAge}
              </span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {studentTurns} exchanges
              </span>
            </div>
          </div>

          {/* Overall score: large number */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1, color: avgColor }}>
              {avg}
            </div>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', marginTop: 6 }}>
              OVERALL / 10
            </div>
          </div>
        </div>

        {/* ── Score breakdown ── */}
        <section style={{ marginBottom: 48 }}>
          <p className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', marginBottom: 20 }}>
            SCORE BREAKDOWN
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border)' }}>
            {SCORE_CONFIGS.map((cfg, i) => (
              <div key={cfg.key} style={{
                background: 'var(--surface)',
                padding: '24px',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: cfg.color }}>
                    {feedback.scores[cfg.key]}
                  </span>
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>/10</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>
                    {cfg.label}
                  </div>
                  {/* Simple bar - no filled background track */}
                  <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <div key={j} style={{
                        height: 3, flex: 1, borderRadius: 1,
                        background: j < feedback.scores[cfg.key] ? cfg.color : 'var(--border)',
                        transition: `background 0.4s ease ${j * 0.04}s`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Emotion chart ── */}
        {chartData.length > 1 && (
          <section style={{ marginBottom: 48 }}>
            <p className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', marginBottom: 6 }}>
              PATIENT INTENSITY OVER SESSION
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
              Emotional distress level across the conversation. Downward trend indicates de-escalation.
            </p>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--r)', padding: '24px',
            }}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="turn" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone" dataKey="intensity" stroke="#9eb299"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#9eb299', stroke: 'var(--surface)', strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Strengths + Improvements ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>

          {/* Strengths */}
          <section>
            <p className="font-mono" style={{ fontSize: 10, color: 'var(--primary)', letterSpacing: '0.12em', marginBottom: 16 }}>
              WHAT WORKED
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feedback.strengths.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 14, fontSize: 13, lineHeight: 1.5,
                  paddingBottom: 12, borderBottom: '1px solid var(--border-sub)',
                }}>
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--primary)', opacity: 0.6, paddingTop: 2, flexShrink: 0 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ color: 'var(--text-2)' }}>{s}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Improvements */}
          <section>
            <p className="font-mono" style={{ fontSize: 10, color: 'var(--warn)', letterSpacing: '0.12em', marginBottom: 16 }}>
              AREAS TO IMPROVE
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {feedback.improvements.map((imp, i) => (
                <div key={i} style={{
                  paddingBottom: 16, borderBottom: '1px solid var(--border-sub)',
                }}>
                  <p style={{
                    fontSize: 12, fontStyle: 'italic', color: 'var(--text-3)',
                    margin: '0 0 6px',
                    paddingLeft: 10, borderLeft: '2px solid var(--warn)', opacity: 0.7,
                    lineHeight: 1.5,
                  }}>
                    "{imp.moment}"
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>
                    {imp.suggestion}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Transcript ── */}
        <section style={{ marginBottom: 48 }}>
          <p className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', marginBottom: 16 }}>
            FULL TRANSCRIPT
          </p>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', padding: '20px',
            maxHeight: 280, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {turns.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, fontSize: 13, lineHeight: 1.5 }}>
                <span className="font-mono" style={{
                  width: 60, flexShrink: 0, textAlign: 'right',
                  fontSize: 9, letterSpacing: '0.1em', paddingTop: 2,
                  color: t.speaker === 'student' ? 'var(--accent)' : 'var(--text-3)',
                }}>
                  {t.speaker === 'student' ? 'YOU' : scenario.patientName.split(' ')[0].toUpperCase()}
                </span>
                <span style={{ color: t.speaker === 'student' ? 'var(--text-1)' : 'var(--text-2)' }}>
                  {t.text}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12, paddingBottom: 48 }}>
          <Link
            href="/"
            id="btn-try-again"
            style={{
              padding: '12px 24px', background: 'var(--accent)',
              color: '#0a0a0a', borderRadius: 'var(--r)',
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Try another scenario
          </Link>
          <Link
            href={`/session/${scenario.id}`}
            id="btn-retry"
            style={{
              padding: '12px 24px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)', borderRadius: 'var(--r)',
              fontSize: 14, fontWeight: 500, textDecoration: 'none',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-3)'; e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            Retry this scenario
          </Link>
        </div>
      </main>
    </div>
  );
}
