/**
 * ClinicalMirror — TTS (Browser SpeechSynthesis)
 *
 * Uses the existing Web SpeechSynthesis API.
 * No external TTS service — no new API keys.
 *
 * Changes from original:
 * - speakEmotional now accepts optional patientId and intensity.
 * - Voice is now selected per-patient via voice-profiles.ts.
 * - Emotion adjustments are blended with patient baseline and scaled by intensity.
 * - Backwards compatible: patientId and intensity are optional.
 */

import { EmotionType } from './types';
import {
  type PatientVariant,
  PATIENT_VOICE_PROFILES,
  getPatientVoice,
} from './voice-profiles';

// ─── Emotion-to-prosody deltas ────────────────────────────────────────────────
// Applied on top of the patient's baseline rate/pitch.
// Kept subtle — this is a clinical simulator, not theatre.

const EMOTION_DELTAS: Record<
  EmotionType,
  { rateMultiplier: number; pitchOffset: number; pitchVar: number; rateVar: number }
> = {
  neutral:    { rateMultiplier: 1.00, pitchOffset:  0.00, pitchVar: 0.03, rateVar: 0.03 },
  calm:       { rateMultiplier: 0.98, pitchOffset:  0.02, pitchVar: 0.03, rateVar: 0.02 },
  anxious:    { rateMultiplier: 1.04, pitchOffset:  0.05, pitchVar: 0.04, rateVar: 0.04 },
  sad:        { rateMultiplier: 0.93, pitchOffset: -0.04, pitchVar: 0.03, rateVar: 0.03 },
  distressed: { rateMultiplier: 1.02, pitchOffset:  0.03, pitchVar: 0.05, rateVar: 0.04 },
  angry:      { rateMultiplier: 1.06, pitchOffset: -0.06, pitchVar: 0.04, rateVar: 0.04 },
  relieved:   { rateMultiplier: 0.97, pitchOffset:  0.03, pitchVar: 0.03, rateVar: 0.03 },
};

// Clamping ranges — keep within believable clinical speech territory
const RATE_MIN  = 0.82;
const RATE_MAX  = 1.18;
const PITCH_MIN = 0.75;
const PITCH_MAX = 1.20;

// ─── Voice initialisation ─────────────────────────────────────────────────────

/** Initialise voices (they load async in most browsers) */
export function initVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) return resolve();
    window.speechSynthesis.onvoiceschanged = () => resolve();
    // Timeout fallback
    setTimeout(resolve, 2000);
  });
}

// ─── Legacy voice helper (kept for backwards compatibility) ───────────────────

/**
 * @deprecated Prefer per-patient voice selection via voice-profiles.ts.
 * Returns a single English voice for callers that have not been updated yet.
 */
export function getBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return voices.find((v) => v.lang.startsWith('en')) ?? null;
}

// ─── Text chunking ────────────────────────────────────────────────────────────

/** Split text into natural sentence chunks */
function splitSentences(text: string): string[] {
  const chunks = text.match(/[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g);
  return chunks ? chunks.map((s) => s.trim()).filter(Boolean) : [text];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  /** Patient variant — used to select voice and baseline prosody. */
  patientId?: PatientVariant;
  /** Emotion intensity 0–1 — scales emotional prosody adjustments. */
  intensity?: number;
}

/**
 * Speak text with patient-specific voice and emotion-modulated prosody.
 *
 * - Uses the patient's configured voice (if available) or falls back to any
 *   English voice or the browser default.
 * - Applies the patient's baseline rate/pitch from PATIENT_VOICE_PROFILES.
 * - Applies emotion deltas scaled by intensity on top of the baseline.
 * - Each sentence gets slight random variation for naturalness.
 *
 * patientId and intensity are optional — if omitted the function behaves
 * similarly to the previous implementation.
 */
export function speakEmotional(
  text: string,
  emotion: EmotionType,
  options: SpeakOptions = {},
): void {
  if (typeof window === 'undefined') return;

  window.speechSynthesis.cancel();

  const { patientId, intensity = 0.5, onStart, onEnd } = options;

  // ── Resolve voice ──────────────────────────────────────────────────────────
  let voice: SpeechSynthesisVoice | null = null;
  const voices = window.speechSynthesis.getVoices();

  if (patientId) {
    voice = getPatientVoice(patientId, voices);
  } else {
    // Backwards-compatible fallback
    voice = voices.find((v) => v.lang.startsWith('en')) ?? null;
  }

  // ── Resolve prosody baseline ───────────────────────────────────────────────
  const profile = patientId ? PATIENT_VOICE_PROFILES[patientId] : null;
  const baseRate  = profile?.rate  ?? 1.0;
  const basePitch = profile?.pitch ?? 1.0;
  const baseVolume = profile?.volume ?? 1.0;

  // ── Emotion deltas scaled by intensity ────────────────────────────────────
  // Intensity 0 → no emotional modulation (pure baseline).
  // Intensity 1 → full emotional modulation.
  const delta = EMOTION_DELTAS[emotion] ?? EMOTION_DELTAS.neutral;
  const scale = Math.max(0, Math.min(1, intensity));

  // rateMultiplier blended towards 1.0 at low intensity
  const blendedRateMultiplier = 1.0 + (delta.rateMultiplier - 1.0) * scale;
  const blendedPitchOffset    = delta.pitchOffset * scale;

  const targetRate  = baseRate  * blendedRateMultiplier;
  const targetPitch = basePitch + blendedPitchOffset;

  // ── Speak ──────────────────────────────────────────────────────────────────
  const sentences = splitSentences(text);
  let started = false;

  const rand = () => (Math.random() - 0.5) * 2; // -1 to 1

  sentences.forEach((sentence, i) => {
    const u = new SpeechSynthesisUtterance(sentence);

    if (voice) u.voice = voice;

    // Add per-sentence variation for naturalness
    u.rate   = Math.max(RATE_MIN,  Math.min(RATE_MAX,  targetRate  + rand() * delta.rateVar));
    u.pitch  = Math.max(PITCH_MIN, Math.min(PITCH_MAX, targetPitch + rand() * delta.pitchVar));
    u.volume = baseVolume;

    u.onstart = () => {
      if (!started) {
        started = true;
        onStart?.();
      }
    };

    if (i === sentences.length - 1) {
      u.onend   = () => onEnd?.();
      u.onerror = () => onEnd?.();
    }

    window.speechSynthesis.speak(u);
  });
}

export function cancelSpeech(): void {
  if (typeof window !== 'undefined') window.speechSynthesis.cancel();
}
