'use client';

/**
 * RealisticAvatar
 *
 * Displays a lip-synced video clip when in Realistic Avatar mode.
 * Shows a "Patient is responding…" skeleton while the video is generating,
 * and silently falls back to rendering the Mii Avatar if generation fails
 * or if `fallback` is true.
 *
 * Props:
 *   videoUrl   – URL returned by /api/patient-reply-video (null = loading / fallback)
 *   isLoading  – true while the backend is generating the clip
 *   fallback   – true if generation failed; caller should render Mii instead
 *   avatarId   – which stock avatar is active (used in the idle poster image)
 *   emotion    – current patient emotion (for the ambient glow, passed through)
 *   size       – display size in px (square)
 */

import { useEffect, useRef } from 'react';
import { EmotionType, StockAvatarId } from '@/lib/types';

const GLOW_COLORS: Record<EmotionType, string> = {
  neutral:    '#22d3ee',
  sad:        '#60a5fa',
  angry:      '#f87171',
  anxious:    '#fbbf24',
  distressed: '#f97316',
  relieved:   '#34d399',
  calm:       '#818cf8',
};

// Human-readable labels for each stock avatar, shown in the UI
export const STOCK_AVATAR_LABELS: Record<StockAvatarId, string> = {
  'patient-a': 'Patient A',
  'patient-b': 'Patient B',
  'patient-c': 'Patient C',
};

interface RealisticAvatarProps {
  videoUrl:  string | null;
  isLoading: boolean;
  fallback:  boolean;
  avatarId:  StockAvatarId;
  emotion:   EmotionType;
  size?:     number;
  onPlaybackEnd?: () => void;
}

export function RealisticAvatar({
  videoUrl,
  isLoading,
  fallback,
  avatarId,
  emotion,
  size = 280,
  onPlaybackEnd,
}: RealisticAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const glowColor = GLOW_COLORS[emotion];
  const glowSpread = 24;

  // Auto-play the new clip whenever videoUrl changes
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    vid.load();
    vid.play().catch(() => {
      // Autoplay blocked — treat as end of playback
      onPlaybackEnd?.();
    });
  }, [videoUrl, onPlaybackEnd]);

  // If generation failed, return null so parent renders Mii avatar instead
  if (fallback) return null;

  return (
    <div
      style={{
        position:        'relative',
        width:            size,
        height:           size,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:       0,
      }}
    >
      {/* Ambient glow ring — matches Mii avatar aesthetic */}
      <div
        style={{
          position:        'absolute',
          inset:            0,
          borderRadius:    '50%',
          pointerEvents:   'none',
          transition:      'box-shadow 0.7s ease',
          background:      `radial-gradient(circle, ${glowColor}18 0%, ${glowColor}08 50%, transparent 70%)`,
          boxShadow:       `0 0 ${glowSpread}px ${glowColor}50, 0 0 ${glowSpread * 2}px ${glowColor}25`,
        }}
      />

      {/* ── Loading skeleton ────────────────────────────────────────────── */}
      {isLoading && (
        <div
          style={{
            position:        'absolute',
            inset:            0,
            borderRadius:    '50%',
            overflow:        'hidden',
            display:         'flex',
            flexDirection:   'column',
            alignItems:      'center',
            justifyContent:  'center',
            gap:              12,
            background:      'var(--surface)',
            border:          `1px solid var(--border)`,
          }}
        >
          {/* Pulsing face silhouette */}
          <div
            style={{
              width:           80,
              height:          80,
              borderRadius:    '50%',
              background:      'var(--surface-2)',
              animation:       'realistic-pulse 1.4s ease-in-out infinite',
            }}
          />
          <div
            style={{
              display:         'flex',
              flexDirection:   'column',
              alignItems:      'center',
              gap:              4,
            }}
          >
            <span
              style={{
                fontSize:   11,
                color:      'var(--text-3)',
                fontWeight: 500,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em',
              }}
            >
              Patient is responding
            </span>
            {/* Animated dots */}
            <span style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map((j) => (
                <span
                  key={j}
                  style={{
                    width:       5,
                    height:      5,
                    borderRadius: '50%',
                    background:  'var(--text-3)',
                    display:     'inline-block',
                    animation:   `orb-pulse 1s ease-in-out ${j * 0.17}s infinite`,
                  }}
                />
              ))}
            </span>
          </div>
        </div>
      )}

      {/* ── Video player ────────────────────────────────────────────────── */}
      {videoUrl && !isLoading && (
        <video
          ref={videoRef}
          key={videoUrl}               // force remount on new URL
          autoPlay
          playsInline
          muted={false}
          onEnded={onPlaybackEnd}
          onError={onPlaybackEnd}
          style={{
            width:        size,
            height:       size,
            objectFit:   'cover',
            borderRadius: '50%',
            display:     'block',
          }}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}

      {/* ── Idle state (no video yet, not loading) ───────────────────────── */}
      {!videoUrl && !isLoading && (
        <div
          style={{
            width:           size,
            height:          size,
            borderRadius:    '50%',
            background:      'var(--surface)',
            border:          `1px solid var(--border)`,
            display:         'flex',
            flexDirection:   'column',
            alignItems:      'center',
            justifyContent:  'center',
            gap:              8,
          }}
        >
          {/* Generic person silhouette */}
          <svg
            viewBox="0 0 64 64"
            width={72}
            height={72}
            fill="none"
            aria-hidden="true"
          >
            <circle cx="32" cy="22" r="14" fill="var(--surface-2)" />
            <ellipse cx="32" cy="52" rx="22" ry="12" fill="var(--surface-2)" />
          </svg>
          <span
            style={{
              fontSize:      10,
              color:         'var(--text-3)',
              fontFamily:    'var(--font-mono)',
              letterSpacing: '0.1em',
            }}
          >
            {STOCK_AVATAR_LABELS[avatarId].toUpperCase()}
          </span>
        </div>
      )}

      <style>{`
        @keyframes realistic-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
