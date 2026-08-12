'use client';

/**
 * ScenarioCard — a scenario entry on the landing page.
 *
 * Uses the real stylised Avatar rather than an icon, so the card previews the
 * actual character the student is about to meet, at the emotional baseline the
 * scenario opens on.
 */

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import type { EmotionType, Scenario } from '@/lib/types';

const DIFFICULTY = {
  easy: { label: 'Easy', color: '#9eb299' },
  medium: { label: 'Medium', color: '#fab475' },
  hard: { label: 'Hard', color: '#f49797' },
} as const;

/** Resting expression each character wears before the conversation starts. */
const RESTING_EMOTION: Record<Scenario['avatarVariant'], EmotionType> = {
  margaret: 'anxious',
  james: 'angry',
  emma: 'sad',
  robert: 'neutral',
};

const HALO_TONE: Record<Scenario['avatarVariant'], string> = {
  margaret: 'rgba(250, 180, 117, 0.4)',
  james: 'rgba(244, 151, 151, 0.4)',
  emma: 'rgba(158, 197, 242, 0.42)',
  robert: 'rgba(158, 178, 153, 0.45)',
};

export function ScenarioCard({ scenario, index }: { scenario: Scenario; index: number }) {
  const [hovered, setHovered] = useState(false);
  const difficulty = DIFFICULTY[scenario.difficulty];
  const emotion = RESTING_EMOTION[scenario.avatarVariant] ?? 'neutral';
  const isReview = scenario.availability === 'faculty-review';

  return (
    <Link
      href={`/session/${scenario.id}`}
      id={`scenario-row-${scenario.id}`}
      className="card lift"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: 18,
        padding: 22,
        textDecoration: 'none',
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      {/* Avatar with its own soft halo */}
      <div
        style={{
          position: 'relative',
          width: 96,
          height: 96,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: -10,
            zIndex: 0,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 45%, ${HALO_TONE[scenario.avatarVariant]} 0%, transparent 68%)`,
            filter: 'blur(16px)',
            opacity: hovered ? 1 : 0.62,
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            transition: 'opacity var(--dur-3) var(--ease), transform var(--dur-4) var(--ease)',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform var(--dur-4) var(--ease)',
          }}
        >
          <Avatar
            emotion={emotion}
            intensity={scenario.initialIntensity}
            variant={scenario.avatarVariant}
            size={96}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            className="font-mono"
            style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em' }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: 9.5,
              fontWeight: 500,
              letterSpacing: '0.12em',
              color: difficulty.color,
              padding: '3px 9px',
              border: `1px solid ${difficulty.color}40`,
              borderRadius: 'var(--r-full)',
              background: `${difficulty.color}12`,
            }}
          >
            {difficulty.label.toUpperCase()}
          </span>
          {isReview && (
            <span
              className="font-mono"
              style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.1em' }}
            >
              FACULTY REVIEW
            </span>
          )}
        </div>

        <h3 className="t-h3">{scenario.title}</h3>

        <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>
          {scenario.patientName}, {scenario.patientAge}
        </p>

        <p
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--text-2)',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {scenario.description}
        </p>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 2,
            fontSize: 13,
            fontWeight: 600,
            color: hovered ? 'var(--accent-dim)' : 'var(--text-3)',
            transition: 'color var(--dur-2) var(--ease-soft)',
          }}
        >
          Begin
          <ArrowRight
            size={14}
            style={{
              transform: hovered ? 'translateX(3px)' : 'none',
              transition: 'transform var(--dur-3) var(--ease)',
            }}
          />
        </span>
      </div>
    </Link>
  );
}
