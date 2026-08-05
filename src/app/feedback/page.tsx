'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SessionData, EmotionType } from '@/lib/types';

const EMOTION_COLORS: Record<EmotionType, string> = {
  neutral: '#22d3ee',
  sad: '#60a5fa',
  angry: '#f87171',
  anxious: '#fbbf24',
  distressed: '#f97316',
  relieved: '#34d399',
  calm: '#818cf8',
};

const SCORE_CONFIGS = [
  {
    key: 'empathy' as const,
    label: 'Empathy',
    desc: 'Acknowledging emotions before problem-solving',
    color: '#60a5fa',
  },
  {
    key: 'clarity' as const,
    label: 'Clarity',
    desc: 'Jargon-free, structured communication',
    color: '#34d399',
  },
  {
    key: 'deescalation' as const,
    label: 'De-escalation',
    desc: 'Patient intensity trend over the session',
    color: '#f97316',
  },
];

function CircleScore({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const pct = score / 10;
  const offset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          {/* Track */}
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="oklch(0.17 0.016 255)"
            strokeWidth="8"
          />
          {/* Fill */}
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="animate-score-fill"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          <span className="text-[10px]" style={{ color: 'oklch(0.45 0.02 255)' }}>/ 10</span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color: 'oklch(0.88 0.012 255)' }}>{label}</span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const emotion = payload[0]?.payload?.emotion as EmotionType | undefined;
    return (
      <div
        className="px-3 py-2 rounded-lg text-sm border"
        style={{
          background: 'oklch(0.12 0.016 255)',
          borderColor: 'oklch(0.2 0.016 255)',
          color: 'oklch(0.88 0.012 255)',
        }}
      >
        <p className="font-medium">Turn {label}</p>
        <p style={{ color: emotion ? EMOTION_COLORS[emotion] : '#22d3ee' }}>
          Intensity: {payload[0].value}%
          {emotion ? ` · ${emotion}` : ''}
        </p>
      </div>
    );
  }
  return null;
}

export default function FeedbackPage() {
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('clinicalmirror_session');
    if (!stored) {
      router.push('/');
      return;
    }
    try {
      setData(JSON.parse(stored));
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading || !data) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'oklch(0.075 0.018 255)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'oklch(0.72 0.14 200)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const { scenario, turns, feedback } = data;

  const chartData = turns
    .filter((t) => t.speaker === 'patient' && t.intensity !== undefined)
    .map((t, i) => ({
      turn: i + 1,
      intensity: Math.round((t.intensity ?? 0) * 100),
      emotion: t.emotion,
    }));

  const avgScore = Math.round(
    (feedback.scores.empathy + feedback.scores.clarity + feedback.scores.deescalation) / 3
  );

  const avgColor = avgScore >= 7 ? '#34d399' : avgScore >= 5 ? '#fbbf24' : '#f87171';

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: 'oklch(0.075 0.018 255)' }}>

      {/* Header */}
      <header
        className="flex items-center justify-between px-8 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'oklch(0.14 0.014 255)', background: 'oklch(0.085 0.018 255)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
            style={{ background: 'oklch(0.72 0.14 200)', color: 'oklch(0.08 0.018 255)' }}>
            CM
          </div>
          <span className="font-semibold" style={{ color: 'oklch(0.94 0.012 255)' }}>
            Session Feedback
          </span>
        </div>
        <Link
          href="/"
          id="btn-try-again"
          className="text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
          style={{ background: 'oklch(0.72 0.14 200)', color: 'oklch(0.08 0.018 255)' }}
        >
          Try Again
        </Link>
      </header>

      <main className="flex-1 px-8 py-8 max-w-5xl mx-auto w-full space-y-8 animate-fade-in">

        {/* ── Scenario + overall score ── */}
        <section className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'oklch(0.72 0.14 200)' }}>
              Scenario
            </p>
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'oklch(0.96 0.01 255)' }}>
              {scenario.title}
            </h1>
            <p className="text-sm" style={{ color: 'oklch(0.5 0.02 255)' }}>
              Patient: {scenario.patientName}, {scenario.patientAge}
              {' · '}
              {turns.filter((t) => t.speaker === 'student').length} exchanges
            </p>
          </div>

          <div
            className="flex items-center gap-4 px-6 py-4 rounded-2xl flex-shrink-0"
            style={{ background: 'oklch(0.1 0.016 255)', border: '1px solid oklch(0.17 0.016 255)' }}
          >
            <div>
              <p className="text-xs mb-1" style={{ color: 'oklch(0.48 0.02 255)' }}>Overall</p>
              <p className="text-5xl font-bold" style={{ color: avgColor }}>{avgScore}</p>
              <p className="text-xs" style={{ color: 'oklch(0.4 0.016 255)' }}>out of 10</p>
            </div>
            <div className="w-px h-14 self-center" style={{ background: 'oklch(0.17 0.016 255)' }} />
            <p className="text-sm leading-relaxed max-w-[22ch]" style={{ color: 'oklch(0.6 0.018 255)' }}>
              {feedback.summary}
            </p>
          </div>
        </section>

        {/* ── Score circles ── */}
        <section
          className="rounded-2xl p-6"
          style={{ background: 'oklch(0.1 0.016 255)', border: '1px solid oklch(0.17 0.016 255)' }}
        >
          <h2 className="text-base font-semibold mb-6" style={{ color: 'oklch(0.88 0.012 255)' }}>
            Performance Scores
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {SCORE_CONFIGS.map((cfg) => (
              <div key={cfg.key} className="flex flex-col items-center gap-3">
                <CircleScore
                  score={feedback.scores[cfg.key]}
                  color={cfg.color}
                  label={cfg.label}
                />
                <p className="text-xs text-center" style={{ color: 'oklch(0.45 0.018 255)' }}>
                  {cfg.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Emotion chart ── */}
        <section
          className="rounded-2xl p-6"
          style={{ background: 'oklch(0.1 0.016 255)', border: '1px solid oklch(0.17 0.016 255)' }}
        >
          <h2 className="text-base font-semibold mb-1" style={{ color: 'oklch(0.88 0.012 255)' }}>
            Patient Emotional Intensity
          </h2>
          <p className="text-xs mb-5" style={{ color: 'oklch(0.45 0.018 255)' }}>
            How the patient&apos;s distress level changed across the conversation
          </p>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.16 0.014 255)" />
                <XAxis
                  dataKey="turn"
                  tick={{ fill: 'oklch(0.4 0.016 255)', fontSize: 11 }}
                  label={{ value: 'Patient turn', position: 'insideBottom', offset: -2, fill: 'oklch(0.4 0.016 255)', fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'oklch(0.4 0.016 255)', fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="intensity"
                  stroke="#22d3ee"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#22d3ee', stroke: 'oklch(0.1 0.016 255)', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: 'oklch(0.4 0.016 255)' }}>
              Not enough data to display chart.
            </p>
          )}
        </section>

        {/* ── Strengths & improvements grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Strengths */}
          <section
            className="rounded-2xl p-6"
            style={{ background: 'oklch(0.1 0.016 255)', border: '1px solid oklch(0.17 0.016 255)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: '#34d39920', color: '#34d399' }}>✓</div>
              <h2 className="text-base font-semibold" style={{ color: 'oklch(0.88 0.012 255)' }}>Strengths</h2>
            </div>
            <ul className="space-y-3">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium mt-0.5"
                    style={{ background: '#34d39918', color: '#34d399' }}>
                    {i + 1}
                  </span>
                  <span style={{ color: 'oklch(0.72 0.016 255)' }}>{s}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Improvements */}
          <section
            className="rounded-2xl p-6"
            style={{ background: 'oklch(0.1 0.016 255)', border: '1px solid oklch(0.17 0.016 255)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: '#fbbf2420', color: '#fbbf24' }}>↑</div>
              <h2 className="text-base font-semibold" style={{ color: 'oklch(0.88 0.012 255)' }}>Areas to Improve</h2>
            </div>
            <ul className="space-y-4">
              {feedback.improvements.map((imp, i) => (
                <li key={i} className="text-sm leading-relaxed space-y-1.5">
                  <p
                    className="italic px-3 py-1.5 rounded-lg border-l-2 text-xs"
                    style={{
                      background: 'oklch(0.13 0.014 255)',
                      borderColor: '#fbbf2460',
                      color: 'oklch(0.58 0.018 255)',
                    }}
                  >
                    &ldquo;{imp.moment}&rdquo;
                  </p>
                  <p style={{ color: 'oklch(0.72 0.016 255)' }}>→ {imp.suggestion}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ── Transcript review ── */}
        <section
          className="rounded-2xl p-6"
          style={{ background: 'oklch(0.1 0.016 255)', border: '1px solid oklch(0.17 0.016 255)' }}
        >
          <h2 className="text-base font-semibold mb-4" style={{ color: 'oklch(0.88 0.012 255)' }}>
            Full Transcript
          </h2>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
            {turns.map((t, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span
                  className="flex-shrink-0 w-16 text-right font-medium text-xs pt-0.5"
                  style={{ color: t.speaker === 'student' ? 'oklch(0.72 0.14 200)' : 'oklch(0.55 0.018 255)' }}
                >
                  {t.speaker === 'student' ? 'You' : scenario.patientName.split(' ')[0]}
                </span>
                <span style={{ color: 'oklch(0.7 0.016 255)' }}>{t.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="flex gap-4 pb-8">
          <Link
            href="/"
            id="btn-home"
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{ background: 'oklch(0.72 0.14 200)', color: 'oklch(0.08 0.018 255)' }}
          >
            Try Another Scenario
          </Link>
          <Link
            href={`/session/${scenario.id}`}
            id="btn-retry"
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: 'oklch(0.13 0.014 255)',
              border: '1px solid oklch(0.2 0.016 255)',
              color: 'oklch(0.72 0.14 200)',
            }}
          >
            Retry This Scenario
          </Link>
        </div>
      </main>
    </div>
  );
}
