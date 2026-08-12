'use client';

/**
 * HeroPreview — a live, self-cycling preview of a session.
 *
 * Uses the real Avatar component and real scenario dialogue, so the hero shows
 * the actual product rather than a mockup. Cycles through the cast every few
 * seconds and lets the visitor click a character to jump ahead.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { scenarios } from '@/lib/scenario-catalog';
import type { EmotionType } from '@/lib/types';

const CYCLE_MS = 5200;

const EMOTION_BY_VARIANT: Record<string, { emotion: EmotionType; label: string; color: string }> = {
  margaret: { emotion: 'anxious', label: 'Anxious', color: '#fab475' },
  james: { emotion: 'angry', label: 'Angry', color: '#f49797' },
  emma: { emotion: 'sad', label: 'Withdrawn', color: '#9ec5f2' },
  robert: { emotion: 'neutral', label: 'Guarded', color: '#9eb299' },
};

export function HeroPreview() {
  const cast = useMemo(() => scenarios.slice(0, 4), []);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % cast.length);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [cast.length, paused]);

  const select = useCallback((i: number) => {
    setIndex(i);
    setPaused(true);
  }, []);

  const active = cast[index];
  const mood = EMOTION_BY_VARIANT[active.avatarVariant] ?? EMOTION_BY_VARIANT.robert;

  return (
    <div
      className="card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: 'relative',
        padding: 'clamp(20px, 3vw, 28px)',
        borderRadius: 'var(--r-xl)',
        boxShadow: 'var(--sh-4)',
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      {/* Emotion-tinted wash behind the card contents */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-30% -10% auto -10%',
          height: '75%',
          zIndex: 0,
          background: `radial-gradient(ellipse at 50% 40%, ${mood.color}30 0%, transparent 70%)`,
          filter: 'blur(30px)',
          transition: 'background var(--dur-4) var(--ease-soft)',
          pointerEvents: 'none',
        }}
      />

      {/* Window chrome */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <span className="pill">
          <span
            className="pill-dot"
            style={{ background: mood.color, animation: 'orb-pulse 1.8s ease-in-out infinite' }}
          />
          In session
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.12em' }}
        >
          {mood.label.toUpperCase()} · {Math.round(active.initialIntensity * 100)}%
        </span>
      </div>

      {/* Avatar */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <div
          key={active.id}
          className="animate-fade-in"
          style={{ animationDuration: '0.5s' }}
        >
          <Avatar
            emotion={mood.emotion}
            intensity={active.initialIntensity}
            variant={active.avatarVariant}
            size={178}
          />
        </div>
      </div>

      {/* Dialogue */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'var(--surface-2)',
          border: '1px solid var(--border-sub)',
          borderRadius: 'var(--r-md)',
          padding: '13px 15px',
          minHeight: 86,
        }}
      >
        <p
          className="font-mono"
          style={{
            fontSize: 9.5,
            color: 'var(--text-3)',
            letterSpacing: '0.12em',
            margin: '0 0 6px',
          }}
        >
          {active.patientName.toUpperCase()}, {active.patientAge}
        </p>
        <p
          key={`${active.id}-line`}
          className="animate-fade-in"
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--text-1)',
            margin: 0,
            animationDuration: '0.6s',
          }}
        >
          &ldquo;{active.openingLine}&rdquo;
        </p>
      </div>

      {/* Cast switcher */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 7 }}>
          {cast.map((item, i) => (
            <button
              key={item.id}
              onClick={() => select(i)}
              aria-label={`Preview ${item.patientName}`}
              aria-current={i === index}
              style={{
                width: i === index ? 26 : 8,
                height: 8,
                padding: 0,
                border: 'none',
                borderRadius: 'var(--r-full)',
                background: i === index ? mood.color : 'var(--border)',
                cursor: 'pointer',
                transition: 'width var(--dur-3) var(--ease), background var(--dur-3) var(--ease-soft)',
              }}
            />
          ))}
        </div>
        <Link
          href={`/session/${active.id}`}
          className="link-underline"
          style={{ fontSize: 12.5, fontWeight: 600 }}
        >
          Try this scenario
        </Link>
      </div>
    </div>
  );
}
