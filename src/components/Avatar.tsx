'use client';

/**
 * Avatar — stylised ("Mii-style") patient face.
 *
 * Every scenario character has its own FaceSpec: head silhouette, hair,
 * eye size, brow weight, nose, mouth width, skin/hair/iris palette and
 * character-specific features (glasses, moustache, stubble, earrings,
 * freckles, wrinkles, collar style).
 *
 * Emotion is applied on top of the spec parametrically, so expression
 * morphing keeps working for every character:
 *   - brows  → BROW_SHAPES  (offsets from the character's own brow line)
 *   - mouth  → MOUTH_SHAPES (scale + offset from the character's own mouth)
 *   - eyes   → EYE_RY       (scaled by the character's own eye size)
 */

import { useEffect, useRef } from 'react';
import { EmotionType, Scenario } from '@/lib/types';

type Variant = Scenario['avatarVariant'];

interface AvatarProps {
  emotion: EmotionType;
  intensity: number;
  isSpeaking?: boolean;
  isListening?: boolean;
  size?: number;
  variant?: Variant;
}

/* ─── Emotion → expression deltas ────────────────────────────────────────── */

const GLOW_COLORS: Record<EmotionType, string> = {
  neutral: '#22d3ee',
  sad: '#60a5fa',
  angry: '#f87171',
  anxious: '#fbbf24',
  distressed: '#f97316',
  relieved: '#34d399',
  calm: '#818cf8',
};

/**
 * Brow deltas, relative to the character's own brow line.
 * outerDY / innerDY: vertical offset of the outer and inner brow tips.
 * ctrlDY: vertical offset of the quadratic control point (negative = arched up).
 * ctrlDX: horizontal shift of the control point, outward-positive.
 */
const BROW_SHAPES: Record<
  EmotionType,
  { outerDY: number; innerDY: number; ctrlDY: number; ctrlDX: number }
> = {
  neutral: { outerDY: 1, innerDY: -1, ctrlDY: -5, ctrlDX: 0 },
  sad: { outerDY: 5, innerDY: 3, ctrlDY: -6, ctrlDX: 3.5 },
  angry: { outerDY: -3, innerDY: 3, ctrlDY: 5, ctrlDX: 0 },
  anxious: { outerDY: -6, innerDY: -7, ctrlDY: -12, ctrlDX: 0 },
  distressed: { outerDY: -10, innerDY: -11, ctrlDY: -17, ctrlDX: 0 },
  relieved: { outerDY: 3, innerDY: 1, ctrlDY: -2, ctrlDX: 0 },
  calm: { outerDY: 4, innerDY: 3, ctrlDY: 0, ctrlDX: 0 },
};

/** Mouth deltas: w = width multiplier, dy = vertical shift, curve = smile/frown depth. */
const MOUTH_SHAPES: Record<EmotionType, { w: number; dy: number; curve: number }> = {
  neutral: { w: 1.0, dy: 0, curve: 11 },
  sad: { w: 1.0, dy: 6, curve: -11 },
  angry: { w: 1.02, dy: 3, curve: -4 },
  anxious: { w: 0.88, dy: 1, curve: 4 },
  distressed: { w: 0.96, dy: -2, curve: 15 },
  relieved: { w: 1.2, dy: -3, curve: 18 },
  calm: { w: 0.95, dy: -1, curve: 10 },
};

/** Base eye vertical radius per emotion (squint vs wide), scaled per character. */
const EYE_RY: Record<EmotionType, number> = {
  neutral: 21,
  sad: 18,
  angry: 14,
  anxious: 24,
  distressed: 25,
  relieved: 17,
  calm: 19,
};

const PUPIL_OFFSET_Y: Record<EmotionType, number> = {
  neutral: 0,
  sad: 2,
  angry: 0,
  anxious: -1,
  distressed: -1,
  relieved: 0,
  calm: 1,
};

const CHEEK_OPACITY: Record<EmotionType, number> = {
  neutral: 0,
  sad: 0.12,
  angry: 0,
  anxious: 0,
  distressed: 0,
  relieved: 0.22,
  calm: 0.15,
};

/* ─── Per-character face specification ───────────────────────────────────── */

interface FaceSpec {
  /** Short description used for the accessible label. */
  described: string;

  // Palette
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  browColor: string;
  iris: string;
  lip: string;
  lipDark: string;
  shirt: string;
  shirtTrim: string;

  // Head silhouette
  headRx: number;
  headRy: number;
  /** Jaw half-width near the chin. Small = pointed, large = square/heavy. */
  jawW: number;

  // Ears
  earCy: number;
  earRx: number;
  earRy: number;

  // Eyes
  eyeDx: number;
  eyeCy: number;
  eyeRx: number;
  eyeRyScale: number;
  lashes: boolean;

  // Brows
  browY: number;
  browInnerX: number;
  browOuterX: number;
  browWeight: number;
  /** Multiplier on the emotion brow deltas — expressive vs stoic faces. */
  browLift: number;

  // Nose
  noseCy: number;
  noseRx: number;
  noseRy: number;

  // Mouth
  mouthY: number;
  mouthHalfW: number;

  // Neck / body
  neckW: number;
  collar: 'blouse' | 'shirt-tie' | 'crew' | 'polo';

  // Hair geometry
  hairBack: string[];
  hairFront: string[];

  // Character features
  glasses?: boolean;
  moustache?: boolean;
  stubble?: boolean;
  freckles?: boolean;
  earrings?: boolean;
  wrinkles?: boolean;
  underEyeBags?: boolean;
  /** Long hair falls over the ears, so draw them behind the hair mass. */
  earsBehindHair?: boolean;
}

const FACE_SPECS: Record<Variant, FaceSpec> = {
  /* Margaret Chen — 52, primary school teacher. Soft oval face,
     shoulder-length side-parted bob, warm skin, small drop earrings. */
  margaret: {
    described: 'a woman in her fifties with a shoulder-length bob',
    skin: '#f2c69b',
    skinShade: '#dda877',
    hair: '#4a3323',
    hairShade: '#3a2618',
    browColor: '#4a3323',
    iris: '#6b4423',
    lip: '#c9716f',
    lipDark: '#a85a58',
    shirt: '#284b6f',
    shirtTrim: '#1c3550',

    headRx: 66,
    headRy: 76,
    jawW: 30,

    earCy: 112,
    earRx: 10,
    earRy: 15,

    eyeDx: 27,
    eyeCy: 98,
    eyeRx: 19.5,
    eyeRyScale: 1.0,
    lashes: true,

    browY: 74,
    browInnerX: 15,
    browOuterX: 44,
    browWeight: 4.2,
    browLift: 1.0,

    noseCy: 118,
    noseRx: 5,
    noseRy: 5.5,

    mouthY: 134,
    mouthHalfW: 18,

    neckW: 27,
    collar: 'blouse',

    hairBack: [
      'M 100 17 C 145 17 177 48 177 101 C 177 133 175 157 171 179 C 160 177 152 156 151 126 C 150 96 132 78 100 78 C 68 78 50 96 49 126 C 48 156 40 177 29 179 C 25 157 23 133 23 101 C 23 48 55 17 100 17 Z',
    ],
    hairFront: [
      // Side-parted sweep. The inner edge stays above the brow line so raised
      // (anxious / distressed) brows are never swallowed by the hair.
      'M 33 95 C 30 46 62 20 100 20 C 141 20 173 47 169 95 C 161 64 138 49 112 51 C 98 52 86 56 76 62 C 62 70 44 82 33 95 Z',
    ],
    earrings: true,
  },

  /* James Morrison — 45, senior manager. Broad square jaw, short crop with
     sideburns, heavy straight brows, stubble, collared shirt and tie. */
  james: {
    described: 'a man in his forties with a short crop and stubble',
    skin: '#d59c6b',
    skinShade: '#b87c4e',
    hair: '#241c17',
    hairShade: '#171210',
    browColor: '#241c17',
    iris: '#4a3527',
    lip: '#b56a62',
    lipDark: '#94514b',
    shirt: '#3b4a5c',
    shirtTrim: '#8d2f3f',

    headRx: 70,
    headRy: 74,
    jawW: 47,

    earCy: 110,
    earRx: 10,
    earRy: 14,

    eyeDx: 28,
    eyeCy: 97,
    eyeRx: 18,
    eyeRyScale: 0.85,
    lashes: false,

    browY: 73,
    browInnerX: 15,
    browOuterX: 46,
    browWeight: 7,
    browLift: 1.15,

    noseCy: 119,
    noseRx: 6.5,
    noseRy: 6,

    mouthY: 137,
    mouthHalfW: 19,

    neckW: 34,
    collar: 'shirt-tie',

    hairBack: [],
    hairFront: [
      // Short crop, hairline sitting fairly high
      'M 30 100 C 28 52 62 24 100 24 C 138 24 172 52 170 100 C 166 82 160 73 152 68 C 139 61 120 59 100 59 C 80 59 61 62 48 68 C 40 73 34 82 30 100 Z',
    ],
    stubble: true,
  },

  /* Emma Sullivan — 28, freelance designer. Narrow heart-shaped face,
     long auburn hair with a straight fringe, large eyes, freckles. */
  emma: {
    described: 'a young woman with long hair and a fringe',
    skin: '#f4cbb0',
    skinShade: '#dfab8c',
    hair: '#8b4a33',
    hairShade: '#6d3826',
    browColor: '#6d3826',
    iris: '#4f6b57',
    lip: '#cc7a7f',
    lipDark: '#ab6065',
    shirt: '#5b4b78',
    shirtTrim: '#4a3c64',

    headRx: 62,
    headRy: 75,
    jawW: 21,

    earCy: 110,
    earRx: 9,
    earRy: 13,

    eyeDx: 26,
    eyeCy: 99,
    eyeRx: 21,
    eyeRyScale: 1.08,
    lashes: true,

    browY: 76,
    browInnerX: 14,
    browOuterX: 42,
    browWeight: 3.6,
    browLift: 1.1,

    noseCy: 118,
    noseRx: 4.4,
    noseRy: 5,

    mouthY: 136,
    mouthHalfW: 16.5,

    neckW: 24,
    collar: 'crew',

    hairBack: [
      'M 100 15 C 149 15 181 48 181 104 C 181 147 179 179 175 208 C 162 204 154 177 152 141 C 150 100 132 76 100 76 C 68 76 50 100 48 141 C 46 177 38 204 25 208 C 21 179 19 147 19 104 C 19 48 51 15 100 15 Z',
    ],
    hairFront: [
      // Straight fringe sitting just above the brows
      'M 32 93 C 30 44 62 18 100 18 C 138 18 170 44 168 93 C 165 72 160 61 154 55 C 138 66 120 70 100 70 C 80 70 62 66 46 55 C 40 61 35 72 32 93 Z',
    ],
    freckles: true,
    earsBehindHair: true,
  },

  /* Robert Tan — 58, retired contractor. Heavy round face, balding with
     grey temples, reading glasses, grey moustache, forehead wrinkles. */
  robert: {
    described: 'a man in his late fifties with glasses and a moustache',
    skin: '#d8a479',
    skinShade: '#bd845a',
    hair: '#8e8b86',
    hairShade: '#736f6a',
    browColor: '#7d7976',
    iris: '#4b3b2f',
    lip: '#b3706a',
    lipDark: '#925a55',
    shirt: '#35594a',
    shirtTrim: '#2a4a3d',

    headRx: 71,
    headRy: 73,
    jawW: 50,

    earCy: 112,
    earRx: 11,
    earRy: 15,

    eyeDx: 28,
    eyeCy: 99,
    eyeRx: 18,
    eyeRyScale: 0.82,
    lashes: false,

    browY: 77,
    browInnerX: 16,
    browOuterX: 45,
    browWeight: 6,
    browLift: 0.85,

    noseCy: 121,
    noseRx: 7,
    noseRy: 6.5,

    mouthY: 142,
    mouthHalfW: 18,

    neckW: 34,
    collar: 'polo',

    hairBack: [],
    hairFront: [
      // Grey hair at the temples only — bare scalp on top
      'M 28 110 C 26 72 40 45 67 31 C 55 46 48 63 46 86 C 45 103 45 120 48 136 C 36 132 29 123 28 110 Z',
      'M 172 110 C 174 72 160 45 133 31 C 145 46 152 63 154 86 C 155 103 155 120 152 136 C 164 132 171 123 172 110 Z',
      // Thin, receded crown strip
      'M 52 51 C 68 39 84 35 100 35 C 116 35 132 39 148 51 C 131 45 116 43 100 43 C 84 43 69 45 52 51 Z',
    ],
    glasses: true,
    moustache: true,
    wrinkles: true,
    underEyeBags: true,
  },
};

/* ─── Geometry builders ──────────────────────────────────────────────────── */

const CX = 100;
const CY = 110;

/** Head silhouette: rounded cranium with a character-specific jaw and chin. */
function headPath(spec: FaceSpec): string {
  const { headRx: rx, headRy: ry, jawW } = spec;
  const top = CY - ry;
  const chin = CY + ry;
  return [
    `M ${CX - rx} ${CY - 4}`,
    `C ${CX - rx} ${top - 10} ${CX + rx} ${top - 10} ${CX + rx} ${CY - 4}`,
    `C ${CX + rx} ${CY + ry * 0.52} ${CX + jawW} ${CY + ry * 0.8} ${CX} ${chin}`,
    `C ${CX - jawW} ${CY + ry * 0.8} ${CX - rx} ${CY + ry * 0.52} ${CX - rx} ${CY - 4}`,
    'Z',
  ].join(' ');
}

function browPath(spec: FaceSpec, emotion: EmotionType, side: 'l' | 'r'): string {
  const s = BROW_SHAPES[emotion];
  const dir = side === 'l' ? -1 : 1;
  const mid = (spec.browOuterX + spec.browInnerX) / 2 + s.ctrlDX;

  const outerX = CX + dir * spec.browOuterX;
  const innerX = CX + dir * spec.browInnerX;
  const ctrlX = CX + dir * mid;

  const outerY = spec.browY + s.outerDY * spec.browLift;
  const innerY = spec.browY + s.innerDY * spec.browLift;
  const ctrlY = spec.browY + s.ctrlDY * spec.browLift;

  return `M ${outerX} ${round(outerY)} Q ${ctrlX} ${round(ctrlY)} ${innerX} ${round(innerY)}`;
}

function mouthGeometry(spec: FaceSpec, emotion: EmotionType) {
  const m = MOUTH_SHAPES[emotion];
  const hw = spec.mouthHalfW * m.w;
  const y = spec.mouthY + m.dy;
  return {
    line: `M ${round(CX - hw)} ${round(y)} Q ${CX} ${round(y + m.curve)} ${round(CX + hw)} ${round(y)}`,
    // Filled lens shape for open-mouth expressions
    open: `M ${round(CX - hw)} ${round(y)} Q ${CX} ${round(y + m.curve)} ${round(CX + hw)} ${round(y)} Q ${CX} ${round(y + m.curve + 12)} ${round(CX - hw)} ${round(y)} Z`,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function Avatar({
  emotion,
  intensity,
  isSpeaking = false,
  isListening = false,
  size = 300,
  variant = 'margaret',
}: AvatarProps) {
  const spec = FACE_SPECS[variant] ?? FACE_SPECS.margaret;

  const glowColor = GLOW_COLORS[emotion];
  const eyeRy = EYE_RY[emotion] * spec.eyeRyScale;
  const pupilDY = PUPIL_OFFSET_Y[emotion];
  const cheekOpacity = CHEEK_OPACITY[emotion];

  const head = headPath(spec);
  const browL = browPath(spec, emotion, 'l');
  const browR = browPath(spec, emotion, 'r');
  const mouth = mouthGeometry(spec, emotion);

  const eyeLX = CX - spec.eyeDx;
  const eyeRX = CX + spec.eyeDx;
  const irisR = spec.eyeRx * 0.6;
  const pupilR = spec.eyeRx * 0.35;
  const earX = spec.headRx - 2;
  const chinY = CY + spec.headRy;

  // Glow size scales with emotional intensity
  const glowSpread = 18 + intensity * 36;
  const glowOuter = glowSpread * 2;

  const eyeGroupRef = useRef<SVGGElement>(null);

  const hairBackPaths = spec.hairBack.map((d, i) => (
    <path key={`hb-${i}`} d={d} fill={spec.hairShade} />
  ));

  const ears = (
    <g>
      <ellipse cx={CX - earX} cy={spec.earCy} rx={spec.earRx} ry={spec.earRy} fill={spec.skin} />
      <ellipse cx={CX + earX} cy={spec.earCy} rx={spec.earRx} ry={spec.earRy} fill={spec.skin} />
      <ellipse
        cx={CX - earX}
        cy={spec.earCy}
        rx={spec.earRx * 0.5}
        ry={spec.earRy * 0.58}
        fill={spec.skinShade}
      />
      <ellipse
        cx={CX + earX}
        cy={spec.earCy}
        rx={spec.earRx * 0.5}
        ry={spec.earRy * 0.58}
        fill={spec.skinShade}
      />
    </g>
  );

  // Blink every ~4-6 seconds
  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;

    function scheduleBlink() {
      const delay = 3500 + Math.random() * 2500;
      blinkTimeout = setTimeout(() => {
        if (eyeGroupRef.current) {
          eyeGroupRef.current.style.animation = 'none';
          void eyeGroupRef.current.getBoundingClientRect(); // force reflow
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

      {/* Speaking indicator rings */}
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
            border: '3px solid #22d3ee80',
            animation: 'orb-listen 0.8s ease-in-out infinite',
          }}
        />
      )}

      <svg
        viewBox="0 0 200 220"
        width={size}
        height={size}
        style={{ filter: 'drop-shadow(0 6px 28px rgba(0,0,0,0.15))' }}
        role="img"
        aria-label={`Patient avatar: ${spec.described}, showing a ${emotion} expression`}
      >
        {/* ── Shoulders / clothing ── */}
        <ellipse cx={CX} cy={218} rx={58} ry={18} fill={spec.shirt} />
        <path
          d="M 44 220 C 46 200 66 191 100 191 C 134 191 154 200 156 220 Z"
          fill={spec.shirt}
        />

        {/* ── Neck ── */}
        <rect
          x={CX - spec.neckW / 2}
          y={chinY - 22}
          width={spec.neckW}
          height={34}
          rx={spec.neckW / 3}
          fill={spec.skin}
        />
        {/* Neck shadow under the jaw */}
        <ellipse
          cx={CX}
          cy={chinY - 16}
          rx={spec.neckW / 2}
          ry={7}
          fill={spec.skinShade}
          opacity={0.45}
        />

        {/* ── Collar detail ── */}
        {spec.collar === 'blouse' && (
          <path
            d={`M ${CX - 24} 193 L ${CX} 209 L ${CX + 24} 193 L ${CX + 30} 197 L ${CX} 216 L ${CX - 30} 197 Z`}
            fill={spec.shirtTrim}
          />
        )}
        {spec.collar === 'crew' && (
          <path
            d={`M ${CX - 26} 194 Q ${CX} 208 ${CX + 26} 194 Q ${CX} 216 ${CX - 26} 194 Z`}
            fill={spec.shirtTrim}
          />
        )}
        {spec.collar === 'polo' && (
          <>
            <path d={`M ${CX - 26} 193 L ${CX - 4} 203 L ${CX - 16} 213 Z`} fill="#f0efe9" />
            <path d={`M ${CX + 26} 193 L ${CX + 4} 203 L ${CX + 16} 213 Z`} fill="#f0efe9" />
            <rect x={CX - 3} y={202} width={6} height={18} fill={spec.shirtTrim} />
          </>
        )}
        {spec.collar === 'shirt-tie' && (
          <>
            <path d={`M ${CX - 28} 192 L ${CX - 2} 204 L ${CX - 18} 216 Z`} fill="#f5f4ef" />
            <path d={`M ${CX + 28} 192 L ${CX + 2} 204 L ${CX + 18} 216 Z`} fill="#f5f4ef" />
            {/* Tie knot + blade */}
            <path
              d={`M ${CX - 7} 200 L ${CX + 7} 200 L ${CX + 5} 209 L ${CX - 5} 209 Z`}
              fill={spec.shirtTrim}
            />
            <path
              d={`M ${CX - 5} 209 L ${CX + 5} 209 L ${CX + 8} 220 L ${CX - 8} 220 Z`}
              fill={spec.shirtTrim}
            />
          </>
        )}

        {/* ── Ears and the hair mass behind the head ──
             Long-haired characters get their ears drawn first so the hair
             falls over them; short hair leaves the ears exposed. */}
        {spec.earsBehindHair ? (
          <>
            {ears}
            {hairBackPaths}
          </>
        ) : (
          <>
            {hairBackPaths}
            {ears}
          </>
        )}

        {/* ── Head ── */}
        <path d={head} fill={spec.skin} />
        {/* Jaw / cheek shading for heavier faces */}
        <path
          d={head}
          fill="none"
          stroke={spec.skinShade}
          strokeWidth={1.2}
          opacity={0.35}
        />

        {/* ── Hair over the head ── */}
        {spec.hairFront.map((d, i) => (
          <path key={`hf-${i}`} d={d} fill={spec.hair} />
        ))}

        {/* ── Forehead wrinkles ── */}
        {spec.wrinkles && (
          <g stroke={spec.skinShade} strokeWidth={1.6} fill="none" opacity={0.5} strokeLinecap="round">
            <path d={`M ${CX - 24} 62 Q ${CX} 56 ${CX + 24} 62`} />
            <path d={`M ${CX - 20} 70 Q ${CX} 65 ${CX + 20} 70`} />
          </g>
        )}

        {/* ── Eyes ── */}
        <g
          ref={eyeGroupRef}
          style={{ transformOrigin: `${CX}px ${spec.eyeCy}px`, transition: 'transform 0.05s' }}
        >
          {[eyeLX, eyeRX].map((ex, i) => (
            <g key={`eye-${i}`}>
              <ellipse
                cx={ex}
                cy={spec.eyeCy}
                rx={spec.eyeRx}
                ry={eyeRy}
                fill="white"
                style={{ transition: 'ry 0.5s ease' }}
              />
              <circle cx={ex} cy={spec.eyeCy + pupilDY} r={irisR} fill={spec.iris} />
              <circle cx={ex} cy={spec.eyeCy + pupilDY} r={pupilR} fill="#160a04" />
              <circle
                cx={ex + irisR * 0.34}
                cy={spec.eyeCy + pupilDY - irisR * 0.3}
                r={irisR * 0.29}
                fill="white"
                opacity={0.95}
              />
              <circle
                cx={ex - irisR * 0.42}
                cy={spec.eyeCy + pupilDY + irisR * 0.38}
                r={irisR * 0.13}
                fill="white"
                opacity={0.4}
              />
              {/* Upper lid shading */}
              <ellipse
                cx={ex}
                cy={spec.eyeCy - eyeRy + 3}
                rx={spec.eyeRx}
                ry={5}
                fill={spec.skin}
                opacity={0.42}
              />
              {/* Lash line */}
              {spec.lashes && (
                <path
                  d={`M ${round(ex - spec.eyeRx)} ${round(spec.eyeCy - eyeRy * 0.55)} Q ${ex} ${round(spec.eyeCy - eyeRy - 2)} ${round(ex + spec.eyeRx)} ${round(spec.eyeCy - eyeRy * 0.55)}`}
                  stroke={spec.hairShade}
                  strokeWidth={2.4}
                  fill="none"
                  strokeLinecap="round"
                />
              )}
              {/* Under-eye bags */}
              {spec.underEyeBags && (
                <path
                  d={`M ${round(ex - spec.eyeRx * 0.8)} ${round(spec.eyeCy + eyeRy + 4)} Q ${ex} ${round(spec.eyeCy + eyeRy + 9)} ${round(ex + spec.eyeRx * 0.8)} ${round(spec.eyeCy + eyeRy + 4)}`}
                  stroke={spec.skinShade}
                  strokeWidth={1.5}
                  fill="none"
                  opacity={0.6}
                  strokeLinecap="round"
                />
              )}
            </g>
          ))}
        </g>

        {/* ── Eyebrows ── */}
        <path
          d={browL}
          stroke={spec.browColor}
          strokeWidth={spec.browWeight}
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'd 0.5s ease' }}
        />
        <path
          d={browR}
          stroke={spec.browColor}
          strokeWidth={spec.browWeight}
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'd 0.5s ease' }}
        />

        {/* ── Nose ── */}
        <ellipse
          cx={CX}
          cy={spec.noseCy}
          rx={spec.noseRx}
          ry={spec.noseRy}
          fill={spec.skinShade}
          opacity={0.6}
        />
        <path
          d={`M ${round(CX - spec.noseRx)} ${spec.noseCy} Q ${CX} ${round(spec.noseCy + 6)} ${round(CX + spec.noseRx)} ${spec.noseCy}`}
          stroke={spec.skinShade}
          strokeWidth={1.5}
          fill="none"
          opacity={0.5}
        />

        {/* ── Nasolabial folds ── */}
        {spec.wrinkles && (
          <g stroke={spec.skinShade} strokeWidth={1.6} fill="none" opacity={0.45} strokeLinecap="round">
            <path
              d={`M ${round(CX - spec.noseRx - 4)} ${round(spec.noseCy + 4)} Q ${round(CX - 24)} ${round(spec.mouthY - 2)} ${round(CX - 19)} ${round(spec.mouthY + 8)}`}
            />
            <path
              d={`M ${round(CX + spec.noseRx + 4)} ${round(spec.noseCy + 4)} Q ${round(CX + 24)} ${round(spec.mouthY - 2)} ${round(CX + 19)} ${round(spec.mouthY + 8)}`}
            />
          </g>
        )}

        {/* ── Stubble / beard shadow ── */}
        {spec.stubble && (
          <>
            <path
              d={`M ${CX - 54} 122 C ${CX - 50} 160 ${CX - 26} ${round(chinY)} ${CX} ${round(chinY)} C ${CX + 26} ${round(chinY)} ${CX + 50} 160 ${CX + 54} 122 C ${CX + 40} 140 ${CX + 22} 148 ${CX} 148 C ${CX - 22} 148 ${CX - 40} 140 ${CX - 54} 122 Z`}
              fill={spec.hairShade}
              opacity={0.32}
            />
            <ellipse cx={CX} cy={spec.mouthY - 12} rx={21} ry={7.5} fill={spec.hairShade} opacity={0.28} />
          </>
        )}

        {/* ── Cheek blush ── */}
        <ellipse
          cx={CX - spec.headRx * 0.7}
          cy={spec.noseCy + 5}
          rx={17}
          ry={10}
          fill="#f87171"
          opacity={cheekOpacity}
          style={{ transition: 'opacity 0.8s ease' }}
        />
        <ellipse
          cx={CX + spec.headRx * 0.7}
          cy={spec.noseCy + 5}
          rx={17}
          ry={10}
          fill="#f87171"
          opacity={cheekOpacity}
          style={{ transition: 'opacity 0.8s ease' }}
        />

        {/* ── Freckles ── */}
        {spec.freckles && (
          <g fill={spec.skinShade} opacity={0.65}>
            {[
              [-36, 112],
              [-30, 118],
              [-40, 120],
              [-26, 111],
              [36, 112],
              [30, 118],
              [40, 120],
              [26, 111],
            ].map(([dx, y], i) => (
              <circle key={`fr-${i}`} cx={CX + dx} cy={y} r={1.5} />
            ))}
          </g>
        )}

        {/* ── Mouth ── */}
        <g
          style={{
            transformOrigin: `${CX}px ${spec.mouthY}px`,
            animation: isSpeaking
              ? 'speaking-wave 0.35s ease-in-out infinite alternate'
              : 'none',
          }}
        >
          {(emotion === 'distressed' || emotion === 'relieved') && (
            <path
              d={mouth.open}
              fill={spec.lipDark}
              opacity={emotion === 'distressed' ? 0.6 : 0.4}
            />
          )}
          <path
            d={mouth.line}
            stroke={spec.lipDark}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
            style={{ transition: 'd 0.5s ease' }}
          />
          <path
            d={mouth.line}
            stroke={spec.lip}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
            opacity={0.4}
            style={{ transition: 'd 0.5s ease', transform: 'translateY(3px)' }}
          />
        </g>

        {/* ── Moustache (drawn over the lip line) ── */}
        {spec.moustache && (
          <path
            d={`M ${CX - 21} ${spec.mouthY - 12} C ${CX - 12} ${spec.mouthY - 19} ${CX - 5} ${spec.mouthY - 15} ${CX} ${spec.mouthY - 15} C ${CX + 5} ${spec.mouthY - 15} ${CX + 12} ${spec.mouthY - 19} ${CX + 21} ${spec.mouthY - 12} C ${CX + 12} ${spec.mouthY - 3} ${CX + 5} ${spec.mouthY - 5} ${CX} ${spec.mouthY - 5} C ${CX - 5} ${spec.mouthY - 5} ${CX - 12} ${spec.mouthY - 3} ${CX - 21} ${spec.mouthY - 12} Z`}
            fill={spec.hair}
          />
        )}

        {/* ── Glasses ── */}
        {spec.glasses && (
          <g fill="none" stroke="#4a4844" strokeWidth={2.6} strokeLinejoin="round">
            <rect
              x={eyeLX - spec.eyeRx - 5}
              y={spec.eyeCy - 17}
              width={(spec.eyeRx + 5) * 2}
              height={34}
              rx={10}
              fill="#dbe6ee"
              fillOpacity={0.22}
            />
            <rect
              x={eyeRX - spec.eyeRx - 5}
              y={spec.eyeCy - 17}
              width={(spec.eyeRx + 5) * 2}
              height={34}
              rx={10}
              fill="#dbe6ee"
              fillOpacity={0.22}
            />
            <path d={`M ${eyeLX + spec.eyeRx + 5} ${spec.eyeCy} L ${eyeRX - spec.eyeRx - 5} ${spec.eyeCy}`} />
            <path
              d={`M ${eyeLX - spec.eyeRx - 5} ${spec.eyeCy - 4} L ${CX - earX + 2} ${spec.earCy - 4}`}
            />
            <path
              d={`M ${eyeRX + spec.eyeRx + 5} ${spec.eyeCy - 4} L ${CX + earX - 2} ${spec.earCy - 4}`}
            />
          </g>
        )}

        {/* ── Earrings ── */}
        {spec.earrings && (
          <g>
            {[CX - earX, CX + earX].map((ex, i) => (
              <g key={`er-${i}`}>
                <circle cx={ex} cy={spec.earCy + spec.earRy - 2} r={3.6} fill="#d9b264" />
                <circle
                  cx={ex - 1}
                  cy={spec.earCy + spec.earRy - 3.2}
                  r={1.2}
                  fill="#fbf0d2"
                  opacity={0.9}
                />
              </g>
            ))}
          </g>
        )}

        {/* ── Tears ── */}
        {emotion === 'distressed' && (
          <>
            <ellipse cx={eyeLX - 4} cy={spec.eyeCy + eyeRy + 2} rx={2.5} ry={4} fill="#90c0e8" opacity={0.7} />
            <ellipse cx={eyeRX + 4} cy={spec.eyeCy + eyeRy + 2} rx={2.5} ry={4} fill="#90c0e8" opacity={0.7} />
          </>
        )}
        {emotion === 'sad' && (
          <ellipse cx={eyeLX - 4} cy={spec.eyeCy + eyeRy + 4} rx={2} ry={3} fill="#90c0e8" opacity={0.45} />
        )}
      </svg>
    </div>
  );
}
