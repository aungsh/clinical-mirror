'use client';

import { useEffect, useRef } from 'react';

interface VoiceOrbProps {
  isSpeaking: boolean;   // patient TTS active
  isListening: boolean;  // mic STT active
  isIdle: boolean;       // neither — gentle breathe
  color?: string;
  size?: number;
}

const BAR_COUNT = 20;

export function VoiceOrb({
  isSpeaking,
  isListening,
  isIdle,
  color = '#22d3ee',
  size = 120,
}: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    function draw(ts: number) {
      if (!ctx) return;
      timeRef.current = ts / 1000;
      const t = timeRef.current;

      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const baseR = size * 0.28;

      // ── Outer ambient rings ──
      if (isSpeaking) {
        for (let r = 0; r < 3; r++) {
          const ringT = (t * 0.7 + r * 0.55) % 1;
          const ringR = baseR + ringT * baseR * 1.6;
          const alpha = (1 - ringT) * 0.4;
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      if (isListening) {
        for (let r = 0; r < 2; r++) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 4 + r * Math.PI);
          const ringR = baseR * (1.1 + r * 0.2 + pulse * 0.15);
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `${color}${Math.round(0.25 * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // ── Center orb gradient ──
      const orbPulse = isSpeaking
        ? 1 + 0.08 * Math.sin(t * 8)
        : isListening
        ? 1 + 0.06 * Math.sin(t * 6)
        : 1 + 0.02 * Math.sin(t * 1.5);

      const orbR = baseR * orbPulse;

      const grad = ctx.createRadialGradient(cx - orbR * 0.2, cy - orbR * 0.2, 0, cx, cy, orbR);
      const alpha = isSpeaking ? 0.9 : isListening ? 0.85 : 0.55;

      grad.addColorStop(0, `${color}ff`);
      grad.addColorStop(0.45, `${color}cc`);
      grad.addColorStop(1, `${color}${Math.round(alpha * 80).toString(16).padStart(2, '0')}`);

      ctx.beginPath();
      ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // ── Waveform bars (when speaking or listening) ──
      if (isSpeaking || isListening) {
        const barMaxH = orbR * 0.55;

        for (let i = 0; i < BAR_COUNT; i++) {
          const angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
          const phase = i * 0.4 + t * (isSpeaking ? 7 : 4);
          const amp = isSpeaking
            ? 0.4 + 0.6 * Math.abs(Math.sin(phase) * Math.cos(phase * 0.7))
            : 0.2 + 0.8 * Math.abs(Math.sin(phase));

          const barH = barMaxH * amp;
          const innerR = orbR + 4;
          const outerR = innerR + barH;

          const x1 = cx + Math.cos(angle) * innerR;
          const y1 = cy + Math.sin(angle) * innerR;
          const x2 = cx + Math.cos(angle) * outerR;
          const y2 = cy + Math.sin(angle) * outerR;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `${color}bb`;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      // ── Inner highlight ──
      const hilite = ctx.createRadialGradient(cx - orbR * 0.3, cy - orbR * 0.35, 0, cx, cy, orbR * 0.6);
      hilite.addColorStop(0, 'rgba(255,255,255,0.28)');
      hilite.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
      ctx.fillStyle = hilite;
      ctx.fill();

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isSpeaking, isListening, isIdle, color, size]);

  const label = isSpeaking ? 'Patient speaking' : isListening ? 'Listening' : 'Idle';

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      {/* Soft outer glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          opacity: isSpeaking || isListening ? 1 : 0.4,
        }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="rounded-full"
      />
      {/* State label */}
      <div
        className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs font-medium tracking-widest uppercase whitespace-nowrap transition-all duration-300"
        style={{ color: `${color}99` }}
      >
        {label}
      </div>
    </div>
  );
}
