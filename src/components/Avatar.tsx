'use client';

import { useEffect, useRef } from 'react';
import { EmotionType } from '@/lib/types';

interface AvatarProps {
  emotion: EmotionType;
  intensity: number;
  isSpeaking?: boolean;
  isListening?: boolean;
  size?: number;
}

const GLOW_COLORS: Record<EmotionType, string> = {
  neutral: '#22d3ee',
  sad: '#60a5fa',
  angry: '#f87171',
  anxious: '#fbbf24',
  distressed: '#f97316',
  relieved: '#34d399',
  calm: '#818cf8',
};

// Each expression: same M Q Q structure so path morphing works
const BROWS: Record<EmotionType, { left: string; right: string }> = {
  neutral:    { left: 'M 54 75 Q 68 69 83 73',   right: 'M 117 73 Q 132 69 146 75' },
  sad:        { left: 'M 54 79 Q 65 68 83 77',   right: 'M 117 77 Q 135 68 146 79' },
  angry:      { left: 'M 54 71 Q 68 79 83 77',   right: 'M 117 77 Q 132 79 146 71' },
  anxious:    { left: 'M 54 68 Q 68 62 83 67',   right: 'M 117 67 Q 132 62 146 68' },
  distressed: { left: 'M 54 64 Q 68 57 83 63',   right: 'M 117 63 Q 132 57 146 64' },
  relieved:   { left: 'M 54 77 Q 68 72 83 75',   right: 'M 117 75 Q 132 72 146 77' },
  calm:       { left: 'M 54 78 Q 68 74 83 77',   right: 'M 117 77 Q 132 74 146 78' },
};

const MOUTHS: Record<EmotionType, string> = {
  neutral:    'M 82 132 Q 100 143 118 132',
  sad:        'M 82 138 Q 100 127 118 138',
  angry:      'M 82 135 Q 100 131 118 135',
  anxious:    'M 84 133 Q 100 137 116 133',
  distressed: 'M 83 130 Q 100 145 117 130',
  relieved:   'M 78 129 Q 100 147 122 129',
  calm:       'M 83 131 Q 100 141 117 131',
};

// Eye vertical radius per emotion (squint vs wide)
const EYE_RY: Record<EmotionType, number> = {
  neutral:    21,
  sad:        18,
  angry:      14,
  anxious:    24,
  distressed: 25,
  relieved:   17,
  calm:       19,
};

// Pupil position offset — looking slightly down when sad
const PUPIL_OFFSET_Y: Record<EmotionType, number> = {
  neutral:    0,
  sad:        2,
  angry:      0,
  anxious:    -1,
  distressed: -1,
  relieved:   0,
  calm:       1,
};

const CHEEK_OPACITY: Record<EmotionType, number> = {
  neutral:    0,
  sad:        0.12,
  angry:      0,
  anxious:    0,
  distressed: 0,
  relieved:   0.22,
  calm:       0.15,
};

export function Avatar({
  emotion,
  intensity,
  isSpeaking = false,
  isListening = false,
  size = 300,
}: AvatarProps) {
  const glowColor = GLOW_COLORS[emotion];
  const brows = BROWS[emotion];
  const mouth = MOUTHS[emotion];
  const eyeRy = EYE_RY[emotion];
  const pupilDY = PUPIL_OFFSET_Y[emotion];
  const cheekOpacity = CHEEK_OPACITY[emotion];

  // Glow size scales with intensity
  const glowSpread = 18 + intensity * 36;
  const glowOuter = glowSpread * 2;

  const eyeGroupRef = useRef<SVGGElement>(null);

  // Blink every ~4-6 seconds
  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;

    function scheduleBlink() {
      const delay = 3500 + Math.random() * 2500;
      blinkTimeout = setTimeout(() => {
        if (eyeGroupRef.current) {
          eyeGroupRef.current.style.animation = 'none';
          // Trigger reflow
          void eyeGroupRef.current.getBoundingClientRect();
          eyeGroupRef.current.style.animation = 'blink 0.22s ease-in-out';
          setTimeout(() => {
            if (eyeGroupRef.current) eyeGroupRef.current.style.animation = '';
          }, 220);
        }
        scheduleBlink();
      }, delay);
    }

    scheduleBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Ambient glow ring */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${glowColor}18 0%, ${glowColor}08 50%, transparent 70%)`,
          boxShadow: `0 0 ${glowSpread}px ${glowColor}50, 0 0 ${glowOuter}px ${glowColor}25`,
        }}
      />

      {/* Speaking indicator ring */}
      {isSpeaking && (
        <>
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: `2px solid ${glowColor}60`,
              animation: 'orb-ring 1.6s ease-out infinite',
            }}
          />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: `2px solid ${glowColor}40`,
              animation: 'orb-ring 1.6s ease-out 0.5s infinite',
            }}
          />
        </>
      )}

      {/* Listening ring */}
      {isListening && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: `3px solid #22d3ee80`,
            animation: 'orb-listen 0.8s ease-in-out infinite',
          }}
        />
      )}

      <svg
        viewBox="0 0 200 220"
        width={size}
        height={size}
        style={{ filter: 'drop-shadow(0 6px 28px rgba(0,0,0,0.15))' }}
        aria-label={`Patient avatar showing ${emotion} expression`}
      >
        {/* ── Body / shirt hint ── */}
        <ellipse cx="100" cy="216" rx="54" ry="16" fill="#1e3a5f" />
        <rect x="55" y="200" width="90" height="20" rx="6" fill="#1e3a5f" />

        {/* ── Neck ── */}
        <rect x="86" y="178" width="28" height="24" rx="8" fill="#f0c090" />
        <rect x="88" y="178" width="24" height="18" fill="#f0c090" /> {/* blend */}

        {/* ── Ear inners ── */}
        <ellipse cx="30" cy="110" rx="6" ry="9" fill="#e0a878" />
        <ellipse cx="170" cy="110" rx="6" ry="9" fill="#e0a878" />

        {/* ── Ears ── */}
        <ellipse cx="30" cy="110" rx="11" ry="15" fill="#f0c090" />
        <ellipse cx="170" cy="110" rx="11" ry="15" fill="#f0c090" />

        {/* ── Head ── */}
        <ellipse cx="100" cy="110" rx="71" ry="78" fill="#f5c898" />

        {/* ── Hair ── */}
        <path
          d="M 33 94 C 28 44 68 15 100 15 C 132 15 172 44 167 94 C 158 68 142 58 100 57 C 58 58 42 68 33 94 Z"
          fill="#5c3d1e"
        />
        {/* Hair side wisps */}
        <path d="M 33 94 C 32 100 30 106 30 112 C 28 90 32 70 38 58 Z" fill="#5c3d1e" />
        <path d="M 167 94 C 168 100 170 106 170 112 C 172 90 168 70 162 58 Z" fill="#5c3d1e" />

        {/* ── Eye whites ── */}
        <g
          ref={eyeGroupRef}
          style={{ transformOrigin: '100px 97px', transition: 'transform 0.05s' }}
        >
          {/* Left eye white */}
          <ellipse
            cx="72"
            cy="97"
            rx="20"
            ry={eyeRy}
            fill="white"
            style={{ transition: 'ry 0.5s ease' }}
          />
          {/* Right eye white */}
          <ellipse
            cx="128"
            cy="97"
            rx="20"
            ry={eyeRy}
            fill="white"
            style={{ transition: 'ry 0.5s ease' }}
          />

          {/* Left iris */}
          <circle cx="72" cy={97 + pupilDY} r="12" fill="#6b3d20" />
          <circle cx="72" cy={97 + pupilDY} r="7" fill="#1a0800" />
          <circle cx="76" cy={94 + pupilDY} r="3.5" fill="white" opacity="0.95" />
          <circle cx="69" cy={101 + pupilDY} r="1.5" fill="white" opacity="0.4" />

          {/* Right iris */}
          <circle cx="128" cy={97 + pupilDY} r="12" fill="#6b3d20" />
          <circle cx="128" cy={97 + pupilDY} r="7" fill="#1a0800" />
          <circle cx="132" cy={94 + pupilDY} r="3.5" fill="white" opacity="0.95" />
          <circle cx="125" cy={101 + pupilDY} r="1.5" fill="white" opacity="0.4" />

          {/* Eyelid covers (upper lid shading) */}
          <ellipse cx="72" cy={97 - eyeRy + 3} rx="20" ry="5" fill="#f5c898" opacity="0.4" />
          <ellipse cx="128" cy={97 - eyeRy + 3} rx="20" ry="5" fill="#f5c898" opacity="0.4" />
        </g>

        {/* ── Eyebrows ── */}
        <path
          d={brows.left}
          stroke="#3d2010"
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'd 0.5s ease' }}
        />
        <path
          d={brows.right}
          stroke="#3d2010"
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'd 0.5s ease' }}
        />

        {/* ── Nose ── */}
        <ellipse cx="100" cy="118" rx="5" ry="5.5" fill="#e0a070" opacity="0.55" />
        <path d="M 95 118 Q 100 124 105 118" stroke="#d09060" strokeWidth="1.5" fill="none" opacity="0.4" />

        {/* ── Cheek blush ── */}
        <ellipse cx="52" cy="122" rx="18" ry="11" fill="#f87171" opacity={cheekOpacity} style={{ transition: 'opacity 0.8s ease' }} />
        <ellipse cx="148" cy="122" rx="18" ry="11" fill="#f87171" opacity={cheekOpacity} style={{ transition: 'opacity 0.8s ease' }} />

        {/* ── Mouth ── */}
        <g
          style={{
            transformOrigin: '100px 133px',
            animation: isSpeaking ? 'speaking-wave 0.35s ease-in-out infinite alternate' : 'none',
          }}
        >
          {/* Mouth fill for open expressions */}
          {emotion === 'distressed' && (
            <path d="M 83 130 Q 100 148 117 130 Q 100 158 83 130 Z" fill="#c8706a" opacity="0.6" />
          )}
          {emotion === 'relieved' && (
            <path d="M 78 129 Q 100 152 122 129 Q 100 158 78 129 Z" fill="#c8706a" opacity="0.4" />
          )}

          {/* Mouth stroke */}
          <path
            d={mouth}
            stroke="#c8706a"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            style={{ transition: 'd 0.5s ease' }}
          />

          {/* Lower lip hint */}
          <path
            d={mouth}
            stroke="#e09090"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.35"
            style={{ transition: 'd 0.5s ease', transform: 'translateY(3px)' }}
          />
        </g>

        {/* ── Tears for distressed ── */}
        {emotion === 'distressed' && (
          <>
            <ellipse cx="68" cy="118" rx="2.5" ry="4" fill="#90c0e8" opacity="0.7" />
            <ellipse cx="132" cy="118" rx="2.5" ry="4" fill="#90c0e8" opacity="0.7" />
          </>
        )}

        {/* ── Sad tears ── */}
        {emotion === 'sad' && (
          <>
            <ellipse cx="68" cy="121" rx="2" ry="3" fill="#90c0e8" opacity="0.4" />
          </>
        )}
      </svg>
    </div>
  );
}
