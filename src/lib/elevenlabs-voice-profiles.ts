/**
 * ClinicalMirror — ElevenLabs Voice Profiles
 *
 * Centralized configuration for ElevenLabs TTS integration.
 * Voice IDs are read from environment variables on the SERVER only.
 * The client identifies the patient; the server resolves the voice.
 *
 * This is a CLIENT-SAFE module — it contains no API keys.
 * Voice IDs themselves are also kept server-side (in env vars).
 */

import type { EmotionType } from './types';
import type { PatientVariant } from './voice-profiles';

// ─── ElevenLabs model ────────────────────────────────────────────────────────

/**
 * Use the flash/turbo model for low latency in interactive sessions.
 * "eleven_turbo_v2_5" is ElevenLabs' recommended low-latency model.
 */
export const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';

// ─── Per-patient ElevenLabs baseline settings ────────────────────────────────

export interface ElevenLabsPatientProfile {
  /** Baseline stability (0–1). Higher = more consistent, less expressive. */
  stability: number;
  /** Baseline similarity boost (0–1). Higher = closer to voice clone. */
  similarityBoost: number;
  /** Baseline style (0–1). Higher = more stylistic exaggeration. */
  style: number;
  /** Baseline speed multiplier. */
  speed: number;
}

export const ELEVENLABS_PATIENT_PROFILES: Record<PatientVariant, ElevenLabsPatientProfile> = {
  james: {
    // Male, ~45 — professional, controlled
    stability: 0.55,
    similarityBoost: 0.75,
    style: 0.15,
    speed: 0.98,
  },
  robert: {
    // Male, ~58 — mature, grounded, slightly slower
    stability: 0.58,
    similarityBoost: 0.76,
    style: 0.10,
    speed: 0.90,
  },
  margaret: {
    // Female, ~52 — warm, measured
    stability: 0.56,
    similarityBoost: 0.74,
    style: 0.12,
    speed: 0.94,
  },
  emma: {
    // Female, ~28 — younger, conversational
    stability: 0.52,
    similarityBoost: 0.73,
    style: 0.18,
    speed: 1.02,
  },
};

// ─── Emotion-to-prosody deltas for ElevenLabs ────────────────────────────────
// Applied on top of the patient baseline.
// Kept subtle — this is a clinical simulator, not theatre.

interface EmotionDelta {
  stabilityDelta: number;  // positive = more stable
  styleDelta: number;      // positive = more expressive
  speedDelta: number;      // positive = faster
}

const EMOTION_DELTAS: Record<EmotionType, EmotionDelta> = {
  neutral:    { stabilityDelta:  0.00, styleDelta:  0.00, speedDelta:  0.00 },
  calm:       { stabilityDelta:  0.05, styleDelta: -0.03, speedDelta: -0.02 },
  anxious:    { stabilityDelta: -0.05, styleDelta:  0.05, speedDelta: -0.01 },
  sad:        { stabilityDelta:  0.03, styleDelta: -0.05, speedDelta: -0.04 },
  distressed: { stabilityDelta: -0.05, styleDelta:  0.07, speedDelta:  0.03 },
  angry:      { stabilityDelta: -0.08, styleDelta:  0.08, speedDelta:  0.05 },
  relieved:   { stabilityDelta:  0.06, styleDelta: -0.02, speedDelta: -0.03 },
};

// ─── Settings computation ────────────────────────────────────────────────────

export interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
}

/**
 * Compute the ElevenLabs voice_settings for a patient/emotion/intensity triplet.
 *
 * Intensity (0–1) scales the emotional deltas:
 * - 0   → pure baseline
 * - 0.5 → moderate emotion
 * - 1.0 → full emotion (still clinically believable)
 */
export function computeElevenLabsSettings(
  patientId: PatientVariant,
  emotion: EmotionType,
  intensity: number,
): ElevenLabsVoiceSettings {
  const profile = ELEVENLABS_PATIENT_PROFILES[patientId];
  const delta = EMOTION_DELTAS[emotion] ?? EMOTION_DELTAS.neutral;
  const scale = Math.max(0, Math.min(1, intensity));

  const stability = clamp(profile.stability + delta.stabilityDelta * scale, 0.25, 0.90);
  const style = clamp(profile.style + delta.styleDelta * scale, 0.0, 0.60);
  const speed = clamp(profile.speed + delta.speedDelta * scale, 0.75, 1.20);

  return {
    stability,
    similarity_boost: profile.similarityBoost,
    style,
    speed,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Patient ID → env var name (client-safe, no secrets) ─────────────────────

/**
 * Returns the environment variable name for a patient's ElevenLabs voice ID.
 * Used server-side to look up the actual voice ID.
 */
export function getPatientVoiceEnvKey(patientId: PatientVariant): string {
  return `ELEVENLABS_${patientId.toUpperCase()}_VOICE_ID`;
}
