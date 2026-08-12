/**
 * ClinicalMirror — Patient Voice Profiles
 *
 * Centralized configuration for per-patient browser TTS voice selection and
 * baseline prosody. Uses native Web SpeechSynthesis — no external TTS service.
 *
 * Emotion adjustments are subtle by design. This is a clinical simulator, not
 * a theatrical performance.
 */

import type { Scenario } from './types';

export type PatientVariant = Scenario['avatarVariant'];

// ─── Per-patient profile ─────────────────────────────────────────────────────

export interface PatientVoiceProfile {
  /**
   * Ordered list of candidate voice name substrings. First match wins.
   * Checked case-insensitively against SpeechSynthesisVoice.name.
   */
  preferredVoiceNames: string[];

  /**
   * Preferred locale prefix (e.g. "en"). Used as a fallback filter when no
   * preferred voice name matches.
   */
  preferredLang: string;

  /**
   * Gender hint used as a last-resort fallback via known voice name patterns.
   * We do NOT rely on a non-standard `gender` property.
   */
  fallbackGender: 'male' | 'female';

  /** Baseline speaking rate (browser default = 1.0). */
  rate: number;

  /** Baseline pitch (browser default = 1.0). */
  pitch: number;

  /** Volume (1.0 = full). */
  volume: number;
}

/**
 * Voice profiles keyed by avatarVariant.
 *
 * Voice name candidates include common macOS, Windows, Chrome, and Edge names.
 * The selection algorithm tries names in order and falls back gracefully.
 */
export const PATIENT_VOICE_PROFILES: Record<PatientVariant, PatientVoiceProfile> = {
  james: {
    // Male, 45 — professional, controlled
    preferredVoiceNames: [
      // macOS
      'Alex',
      'Daniel',
      'Fred',
      'Tom',
      // Windows / Edge online
      'Microsoft David',
      'Microsoft Mark',
      'Microsoft Guy',
      'Google UK English Male',
      'Google US English Male',
    ],
    preferredLang: 'en',
    fallbackGender: 'male',
    rate: 0.98,
    pitch: 0.90,
    volume: 1.0,
  },

  robert: {
    // Male, 58 — mature, grounded, slightly slower
    preferredVoiceNames: [
      // macOS
      'Alex',
      'Daniel',
      'Fred',
      'Tom',
      // Windows / Edge online
      'Microsoft David',
      'Microsoft Mark',
      'Microsoft Guy',
      'Google UK English Male',
      'Google US English Male',
    ],
    preferredLang: 'en',
    fallbackGender: 'male',
    rate: 0.90,
    pitch: 0.88,
    volume: 1.0,
  },

  margaret: {
    // Female, 52 — warm, measured
    preferredVoiceNames: [
      // macOS
      'Samantha',
      'Karen',
      'Moira',
      'Victoria',
      'Fiona',
      // Windows / Edge online
      'Microsoft Zira',
      'Microsoft Jenny',
      'Microsoft Aria',
      'Microsoft Hazel',
      'Google UK English Female',
      'Google US English Female',
    ],
    preferredLang: 'en',
    fallbackGender: 'female',
    rate: 0.94,
    pitch: 1.03,
    volume: 1.0,
  },

  emma: {
    // Female, 28 — younger, conversational, slightly quicker
    preferredVoiceNames: [
      // macOS
      'Samantha',
      'Karen',
      'Moira',
      'Victoria',
      'Fiona',
      // Windows / Edge online
      'Microsoft Jenny',
      'Microsoft Aria',
      'Microsoft Zira',
      'Microsoft Hazel',
      'Google UK English Female',
      'Google US English Female',
    ],
    preferredLang: 'en',
    fallbackGender: 'female',
    rate: 1.02,
    pitch: 1.10,
    volume: 1.0,
  },
};

// ─── Voice name substrings that are known to be male / female ────────────────
// Used only as a last-resort tiebreaker — never as the sole selection method.

const KNOWN_MALE_FRAGMENTS = [
  'alex', 'daniel', 'fred', 'tom', 'david', 'mark', 'guy', 'james', 'paul',
  'male', 'man', 'bruce', 'rishi', 'reed', 'liam',
];

const KNOWN_FEMALE_FRAGMENTS = [
  'samantha', 'karen', 'moira', 'victoria', 'fiona', 'zira', 'jenny',
  'aria', 'hazel', 'eva', 'susan', 'kate', 'female', 'woman', 'ava',
  'salli', 'kendra', 'kimberly', 'joanna', 'laura', 'freya',
];

function looksLikeGender(
  voice: SpeechSynthesisVoice,
  gender: 'male' | 'female',
): boolean {
  const nameLower = voice.name.toLowerCase();
  const fragments = gender === 'male' ? KNOWN_MALE_FRAGMENTS : KNOWN_FEMALE_FRAGMENTS;
  return fragments.some((f) => nameLower.includes(f));
}

// ─── Voice selection ─────────────────────────────────────────────────────────

/**
 * Select the best available SpeechSynthesisVoice for a patient.
 *
 * Algorithm:
 * 1. Exact / partial name match from the patient's preferredVoiceNames list.
 * 2. Gender-hinted English voice.
 * 3. Any English voice.
 * 4. undefined (caller uses browser default).
 */
export function selectPatientVoice(
  patientId: PatientVariant,
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;

  const profile = PATIENT_VOICE_PROFILES[patientId];
  const englishVoices = voices.filter((v) => v.lang.startsWith(profile.preferredLang));

  // Step 1 — try each candidate name (case-insensitive partial match)
  for (const candidate of profile.preferredVoiceNames) {
    const lower = candidate.toLowerCase();
    const match =
      englishVoices.find((v) => v.name.toLowerCase().includes(lower)) ??
      voices.find((v) => v.name.toLowerCase().includes(lower));
    if (match) return match;
  }

  // Step 2 — gender-hinted English voice
  const genderMatch = englishVoices.find((v) =>
    looksLikeGender(v, profile.fallbackGender),
  );
  if (genderMatch) return genderMatch;

  // Step 3 — any English voice
  if (englishVoices.length) return englishVoices[0];

  // Step 4 — any available voice
  return voices[0];
}

// ─── Per-patient voice cache ──────────────────────────────────────────────────

/**
 * Cache selected voices per patient for the lifetime of the page.
 * This avoids repeating voice discovery on every utterance.
 */
const voiceCache = new Map<PatientVariant, SpeechSynthesisVoice | null>();

/**
 * Returns the cached (or newly selected) voice for this patient.
 * Returns null when no suitable voice is found (browser will use default).
 */
export function getPatientVoice(
  patientId: PatientVariant,
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voiceCache.has(patientId)) {
    return voiceCache.get(patientId) ?? null;
  }
  const selected = selectPatientVoice(patientId, voices) ?? null;
  voiceCache.set(patientId, selected);
  return selected;
}

/** Clear the cache (call on component unmount if needed). */
export function clearVoiceCache(): void {
  voiceCache.clear();
}
