'use client';

/**
 * StaticPatientAvatar
 *
 * Displays a static patient portrait with emotion-driven expression changes.
 *
 * - Maps AI emotion values to 4 visual states: neutral | concerned | angry | relieved
 * - Applies a subtle intensity glow that scales with the intensity value
 * - Shows a restrained pulsing ring when the patient is speaking
 * - Crossfades between expressions (300ms) to avoid abrupt swaps
 * - Falls back to the neutral portrait if the requested asset is missing
 * - Never throws on invalid/missing props
 *
 * This component owns NO conversation state.
 * It is a pure presentation layer driven by the session page.
 */

import { useEffect, useRef, useState } from 'react';
import { EmotionType, Scenario } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────

export type AvatarExpression = 'neutral' | 'concerned' | 'angry' | 'relieved';

export interface StaticPatientAvatarProps {
  /** Scenario avatarVariant — e.g. "james", "margaret", "emma", "robert" */
  patientId: Scenario['avatarVariant'];
  /** AI-generated emotion value from the conversation */
  emotion?: EmotionType;
  /** AI-generated intensity value 0–1 */
  intensity?: number;
  /** True while the patient's TTS audio is playing */
  isSpeaking?: boolean;
  /** Display size in px (square) */
  size?: number;
}

// ── Emotion → Expression mapping ─────────────────────────────────────────────
// Centralised here — do NOT duplicate this mapping elsewhere.

const EMOTION_TO_EXPRESSION: Record<EmotionType, AvatarExpression> = {
  neutral:    'neutral',
  calm:       'neutral',
  anxious:    'concerned',
  sad:        'concerned',
  distressed: 'concerned',
  angry:      'angry',
  relieved:   'relieved',
};

function toExpression(emotion: EmotionType | undefined): AvatarExpression {
  if (!emotion) return 'neutral';
  return EMOTION_TO_EXPRESSION[emotion] ?? 'neutral';
}

// ── Glow colours per expression (subtle, professional) ────────────────────────

const EXPRESSION_GLOW: Record<AvatarExpression, string> = {
  neutral:   '#9eb299',   // muted green — calm baseline
  concerned: '#9ec5f2',   // soft blue   — worry
  angry:     '#f49797',   // muted red   — tension
  relieved:  '#9eb299',   // muted green — resolution
};

// ── Custom hook: crossfade between expression images ─────────────────────────
// Avoids synchronous setState-in-effect by delegating all state updates to
// setTimeout callbacks, which execute asynchronously after the effect body.

function useCrossfade(target: AvatarExpression) {
  const [displayed, setDisplayed] = useState<AvatarExpression>(target);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (target === displayed) return;

    // Clear any in-progress transition
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    // Kick off fade-out then swap via a single async timer (not inline setState)
    timerRef.current = setTimeout(() => {
      setFading(true);

      timerRef.current = setTimeout(() => {
        setDisplayed(target);
        setFading(false);
        timerRef.current = null;
      }, 180); // duration of CSS fade-out
    }, 0); // async — avoids synchronous setState in effect body

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return { displayed, fading };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StaticPatientAvatar({
  patientId,
  emotion,
  intensity = 0.5,
  isSpeaking = false,
  size = 280,
}: StaticPatientAvatarProps) {
  const targetExpression = toExpression(emotion);
  const { displayed, fading } = useCrossfade(targetExpression);

  // Clamp intensity to [0, 1]
  const safeIntensity = Math.max(0, Math.min(1, intensity ?? 0.5));

  // Build the asset path — served from /public/avatars/
  const imgSrc = `/avatars/${patientId}/${displayed}.png`;

  // Glow parameters — scales gently with intensity
  const glowColor  = EXPRESSION_GLOW[displayed];
  const glowSpread = Math.round(12 + safeIntensity * 28);   // 12px → 40px
  const glowOuter  = glowSpread * 1.8;

  // Portrait border radius — rounded square
  const borderRadius = Math.round(size * 0.12);

  return (
    <div
      className="static-patient-avatar"
      style={{
        position:        'relative',
        width:            size,
        height:           size,
        flexShrink:       0,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}
    >
      {/* ── Ambient glow ─────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          inset:        -Math.round(size * 0.06),
          borderRadius: borderRadius + Math.round(size * 0.06),
          pointerEvents:'none',
          transition:   'box-shadow 0.7s ease, background 0.7s ease',
          background:   `radial-gradient(circle, ${glowColor}1a 0%, ${glowColor}08 55%, transparent 75%)`,
          boxShadow:    `0 0 ${glowSpread}px ${glowColor}55, 0 0 ${glowOuter}px ${glowColor}28`,
        }}
      />

      {/* ── Speaking rings ───────────────────────────────────────────────── */}
      {isSpeaking && (
        <>
          <div
            aria-hidden="true"
            style={{
              position:     'absolute',
              inset:        -4,
              borderRadius: borderRadius + 4,
              border:       `2px solid ${glowColor}70`,
              animation:    'spa-ring 1.6s ease-out infinite',
              pointerEvents:'none',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position:     'absolute',
              inset:        -4,
              borderRadius: borderRadius + 4,
              border:       `2px solid ${glowColor}45`,
              animation:    'spa-ring 1.6s ease-out 0.55s infinite',
              pointerEvents:'none',
            }}
          />
        </>
      )}

      {/* ── Portrait image ───────────────────────────────────────────────── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={displayed}  /* remount on expression change so onError re-fires */
        src={imgSrc}
        alt={`Patient portrait — ${displayed}`}
        width={size}
        height={size}
        style={{
          width:       size,
          height:      size,
          objectFit:   'cover',
          borderRadius: borderRadius,
          display:     'block',
          boxShadow:   '0 6px 28px rgba(0,0,0,0.18)',
          opacity:      fading ? 0 : 1,
          transition:  'opacity 0.18s ease',
        }}
        onError={(e) => {
          // If expression asset is missing, fall back to neutral silently
          const target = e.currentTarget;
          if (!target.src.includes('/neutral.png')) {
            console.warn(
              `[StaticPatientAvatar] Missing asset: ${target.src} — falling back to neutral`
            );
            target.src = `/avatars/${patientId}/neutral.png`;
          }
        }}
        draggable={false}
      />

      {/* ── Speaking label ───────────────────────────────────────────────── */}
      {isSpeaking && (
        <div
          style={{
            position:      'absolute',
            bottom:         8,
            left:          '50%',
            transform:     'translateX(-50%)',
            background:    `${glowColor}cc`,
            backdropFilter:'blur(6px)',
            border:        `1px solid ${glowColor}60`,
            borderRadius:   20,
            padding:       '2px 10px',
            fontSize:       10,
            fontFamily:    'var(--font-mono, monospace)',
            letterSpacing: '0.1em',
            color:         '#fff',
            pointerEvents: 'none',
            whiteSpace:    'nowrap',
          }}
        >
          SPEAKING
        </div>
      )}

      {/* ── Keyframe styles ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes spa-ring {
          0%   { transform: scale(1);    opacity: 0.8; }
          100% { transform: scale(1.18); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
