import { EmotionType } from './types';

// ─── Emotion prosody params ───────────────────────────────────────────────────
// Male voices sit naturally lower, so pitch multipliers are tuned separately.

const EMOTION_PARAMS_FEMALE: Record<
  EmotionType,
  { pitch: number; rate: number; pitchVar: number; rateVar: number }
> = {
  neutral:    { pitch: 1.05, rate: 1.00, pitchVar: 0.04, rateVar: 0.04 },
  sad:        { pitch: 0.78, rate: 0.76, pitchVar: 0.05, rateVar: 0.04 },
  angry:      { pitch: 0.68, rate: 1.28, pitchVar: 0.10, rateVar: 0.10 },
  anxious:    { pitch: 1.28, rate: 1.22, pitchVar: 0.10, rateVar: 0.08 },
  distressed: { pitch: 1.22, rate: 1.16, pitchVar: 0.12, rateVar: 0.08 },
  relieved:   { pitch: 1.10, rate: 0.91, pitchVar: 0.06, rateVar: 0.05 },
  calm:       { pitch: 1.00, rate: 0.86, pitchVar: 0.04, rateVar: 0.03 },
};

// Male: slightly lower base pitch, wider range feels more natural
const EMOTION_PARAMS_MALE: Record<
  EmotionType,
  { pitch: number; rate: number; pitchVar: number; rateVar: number }
> = {
  neutral:    { pitch: 0.92, rate: 0.97, pitchVar: 0.04, rateVar: 0.04 },
  sad:        { pitch: 0.65, rate: 0.74, pitchVar: 0.06, rateVar: 0.04 },
  angry:      { pitch: 0.55, rate: 1.25, pitchVar: 0.12, rateVar: 0.10 },
  anxious:    { pitch: 1.10, rate: 1.18, pitchVar: 0.10, rateVar: 0.08 },
  distressed: { pitch: 1.05, rate: 1.12, pitchVar: 0.12, rateVar: 0.08 },
  relieved:   { pitch: 0.95, rate: 0.88, pitchVar: 0.06, rateVar: 0.05 },
  calm:       { pitch: 0.88, rate: 0.84, pitchVar: 0.04, rateVar: 0.03 },
};

// ─── Voice selection ─────────────────────────────────────────────────────────

const PREFERRED_FEMALE_PATTERNS = [
  'Google UK English Female',
  'Microsoft Aria Online (Natural)',
  'Microsoft Jenny Online (Natural)',
  'Microsoft Aria',
  'Microsoft Jenny',
  'Microsoft Zira Online',
  'Microsoft Eva Online',
  'Microsoft Hazel',
  'Samantha',   // macOS
  'Karen',      // macOS
  'Victoria',   // macOS
  'Google US English',
  'Microsoft Zira',
];

const PREFERRED_MALE_PATTERNS = [
  'Google UK English Male',
  'Microsoft Ryan Online (Natural)',
  'Microsoft Guy Online (Natural)',
  'Microsoft Christopher Online (Natural)',
  'Microsoft Ryan',
  'Microsoft Guy',
  'Microsoft Christopher',
  'Daniel',     // macOS
  'Alex',       // macOS
  'Fred',       // macOS fallback
  'Microsoft David',
];

let cachedFemaleVoice: SpeechSynthesisVoice | null | undefined = undefined;
let cachedMaleVoice: SpeechSynthesisVoice | null | undefined = undefined;

function pickVoice(
  patterns: string[],
  voices: SpeechSynthesisVoice[],
  fallbackFilter: (v: SpeechSynthesisVoice) => boolean,
): SpeechSynthesisVoice | null {
  for (const pat of patterns) {
    const m = voices.find(v => v.name.includes(pat));
    if (m) return m;
  }
  return voices.find(fallbackFilter) ?? null;
}

export function getVoiceForGender(
  gender: 'male' | 'female',
): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  if (gender === 'female') {
    if (cachedFemaleVoice !== undefined) return cachedFemaleVoice;
    cachedFemaleVoice = pickVoice(
      PREFERRED_FEMALE_PATTERNS,
      voices,
      v => v.lang.startsWith('en'),
    );
    return cachedFemaleVoice;
  } else {
    if (cachedMaleVoice !== undefined) return cachedMaleVoice;
    cachedMaleVoice = pickVoice(
      PREFERRED_MALE_PATTERNS,
      voices,
      // Fallback: try to find any male-named or differently-named English voice
      // that wasn't already claimed by the female cache
      v => v.lang.startsWith('en') && v !== cachedFemaleVoice,
    );
    return cachedMaleVoice;
  }
}

/** Keep for backward compatibility — returns female voice */
export function getBestVoice(): SpeechSynthesisVoice | null {
  return getVoiceForGender('female');
}

/** Initialise voices (they load async in most browsers) */
export function initVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) return resolve();
    window.speechSynthesis.onvoiceschanged = () => {
      // Bust caches so we pick fresh voices after the list loads
      cachedFemaleVoice = undefined;
      cachedMaleVoice = undefined;
      resolve();
    };
    setTimeout(resolve, 2000);
  });
}

/** Split text into natural sentence chunks */
function splitSentences(text: string): string[] {
  const chunks = text.match(/[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g);
  return chunks ? chunks.map(s => s.trim()).filter(Boolean) : [text];
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Speak text with emotion-modulated prosody and gender-appropriate voice.
 * Each sentence gets slightly randomised pitch/rate for naturalness.
 */
export function speakEmotional(
  text: string,
  emotion: EmotionType,
  gender: 'male' | 'female' = 'female',
  options: SpeakOptions = {},
): void {
  if (typeof window === 'undefined') return;

  window.speechSynthesis.cancel();

  const params =
    gender === 'male' ? EMOTION_PARAMS_MALE[emotion] : EMOTION_PARAMS_FEMALE[emotion];
  const voice = getVoiceForGender(gender);
  const sentences = splitSentences(text);
  let started = false;

  const rand = () => (Math.random() - 0.5) * 2; // -1 to 1

  sentences.forEach((sentence, i) => {
    const u = new SpeechSynthesisUtterance(sentence);
    if (voice) u.voice = voice;

    u.pitch  = Math.max(0.5, Math.min(2, params.pitch  + rand() * params.pitchVar));
    u.rate   = Math.max(0.5, Math.min(2, params.rate   + rand() * params.rateVar));
    u.volume = 1;

    u.onstart = () => {
      if (!started) {
        started = true;
        options.onStart?.();
      }
    };

    if (i === sentences.length - 1) {
      u.onend  = () => options.onEnd?.();
      u.onerror = () => options.onEnd?.();
    }

    window.speechSynthesis.speak(u);
  });
}

export function cancelSpeech(): void {
  if (typeof window !== 'undefined') window.speechSynthesis.cancel();
}
