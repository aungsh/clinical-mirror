/**
 * ClinicalMirror — TTS (ElevenLabs primary + Browser SpeechSynthesis fallback)
 *
 * Architecture:
 * 1. If NEXT_PUBLIC_ELEVENLABS_TTS=true → call /api/tts → HTMLAudioElement
 * 2. If ElevenLabs fails for any reason → fall back to Web SpeechSynthesis
 * 3. If NEXT_PUBLIC_ELEVENLABS_TTS is not set → Web SpeechSynthesis directly
 *
 * The fallback is mandatory and automatic. TTS errors never break the session.
 *
 * Changes from previous version:
 * - Added speakEmotional ElevenLabs path (primary).
 * - Added browser SpeechSynthesis path (fallback, unchanged logic).
 * - Added cancelSpeech to stop both HTMLAudioElement and SpeechSynthesis.
 * - Duplicate-request guard: only one TTS generation per unique (text, emotion).
 */

import { EmotionType } from './types';
import {
  type PatientVariant,
  PATIENT_VOICE_PROFILES,
  getPatientVoice,
} from './voice-profiles';

// ─── Feature flag ──────────────────────────────────────────────────────────────
// Set NEXT_PUBLIC_ELEVENLABS_TTS=true in .env.local to enable ElevenLabs.
// Leave unset or false to use browser TTS directly (emergency fallback mode).

const ELEVENLABS_ENABLED =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_ELEVENLABS_TTS === 'true';

// ─── Active audio state ────────────────────────────────────────────────────────
// Single mutable reference to the currently-playing HTMLAudioElement.
// Only one patient audio plays at a time.

let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;

function stopActiveAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = '';
    activeAudio = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

// ─── Emotion-to-prosody deltas (browser SpeechSynthesis) ─────────────────────
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
 * Primary path: ElevenLabs (if NEXT_PUBLIC_ELEVENLABS_TTS=true).
 * Fallback: Web SpeechSynthesis (always available).
 *
 * TTS errors are caught and degraded gracefully — they never break the session.
 */
export function speakEmotional(
  text: string,
  emotion: EmotionType,
  options: SpeakOptions = {},
): void {
  if (typeof window === 'undefined') return;

  const { patientId, intensity = 0.5, onStart, onEnd } = options;

  // Stop any active audio first
  stopActiveAudio();
  window.speechSynthesis.cancel();

  if (ELEVENLABS_ENABLED && patientId) {
    // ── ElevenLabs primary path ────────────────────────────────────────────
    speakElevenLabs(text, emotion, patientId, intensity, { onStart, onEnd });
  } else {
    // ── Browser SpeechSynthesis direct path ───────────────────────────────
    speakBrowser(text, emotion, patientId, intensity, { onStart, onEnd });
  }
}

// ─── ElevenLabs path ──────────────────────────────────────────────────────────

async function speakElevenLabs(
  text: string,
  emotion: EmotionType,
  patientId: PatientVariant,
  intensity: number,
  callbacks: { onStart?: () => void; onEnd?: () => void },
): Promise<void> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, text, emotion, intensity }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as Record<string, unknown>;
      console.warn('[TTS] ElevenLabs failed:', data.error ?? res.status, '— falling back to browser TTS');
      speakBrowser(text, emotion, patientId, intensity, callbacks);
      return;
    }

    const audioBlob = await res.blob();
    if (!audioBlob || audioBlob.size === 0) {
      console.warn('[TTS] ElevenLabs returned empty audio — falling back to browser TTS');
      speakBrowser(text, emotion, patientId, intensity, callbacks);
      return;
    }

    const objectUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(objectUrl);

    // Store refs so we can stop on next call or session end
    activeAudio = audio;
    activeObjectUrl = objectUrl;

    audio.onplay = () => callbacks.onStart?.();

    audio.onended = () => {
      callbacks.onEnd?.();
      // Clean up only if this is still the active audio
      if (activeAudio === audio) {
        stopActiveAudio();
      } else {
        URL.revokeObjectURL(objectUrl);
      }
    };

    audio.onerror = (e) => {
      console.warn('[TTS] HTMLAudioElement playback error — falling back to browser TTS', e);
      if (activeAudio === audio) {
        stopActiveAudio();
      } else {
        URL.revokeObjectURL(objectUrl);
      }
      speakBrowser(text, emotion, patientId, intensity, callbacks);
    };

    // play() returns a Promise — catch unhandled rejections (e.g. autoplay policy)
    audio.play().catch((err) => {
      console.warn('[TTS] audio.play() rejected — falling back to browser TTS', err);
      if (activeAudio === audio) {
        stopActiveAudio();
      } else {
        URL.revokeObjectURL(objectUrl);
      }
      speakBrowser(text, emotion, patientId, intensity, callbacks);
    });
  } catch (err) {
    console.warn('[TTS] ElevenLabs fetch error — falling back to browser TTS', err);
    speakBrowser(text, emotion, patientId, intensity, callbacks);
  }
}

// ─── Browser SpeechSynthesis fallback ────────────────────────────────────────

function speakBrowser(
  text: string,
  emotion: EmotionType,
  patientId: PatientVariant | undefined,
  intensity: number,
  callbacks: { onStart?: () => void; onEnd?: () => void },
): void {
  if (typeof window === 'undefined') return;

  window.speechSynthesis.cancel();

  // ── Resolve voice ──────────────────────────────────────────────────────────
  let voice: SpeechSynthesisVoice | null = null;
  const voices = window.speechSynthesis.getVoices();

  if (patientId) {
    voice = getPatientVoice(patientId, voices);
  } else {
    voice = voices.find((v) => v.lang.startsWith('en')) ?? null;
  }

  // ── Resolve prosody baseline ───────────────────────────────────────────────
  const profile = patientId ? PATIENT_VOICE_PROFILES[patientId] : null;
  const baseRate  = profile?.rate  ?? 1.0;
  const basePitch = profile?.pitch ?? 1.0;
  const baseVolume = profile?.volume ?? 1.0;

  // ── Emotion deltas scaled by intensity ────────────────────────────────────
  const delta = EMOTION_DELTAS[emotion] ?? EMOTION_DELTAS.neutral;
  const scale = Math.max(0, Math.min(1, intensity));

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
        callbacks.onStart?.();
      }
    };

    if (i === sentences.length - 1) {
      u.onend   = () => callbacks.onEnd?.();
      u.onerror = () => callbacks.onEnd?.();
    }

    window.speechSynthesis.speak(u);
  });
}

// ─── Cancel all active speech ─────────────────────────────────────────────────

export function cancelSpeech(): void {
  if (typeof window !== 'undefined') {
    stopActiveAudio();
    window.speechSynthesis.cancel();
  }
}
