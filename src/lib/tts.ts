import { EmotionType } from './types';

const EMOTION_PARAMS: Record<
  EmotionType,
  { pitch: number; rate: number; pitchVar: number; rateVar: number }
> = {
  neutral:    { pitch: 1.05, rate: 1.00, pitchVar: 0.04, rateVar: 0.04 },
  sad:        { pitch: 0.72, rate: 0.76, pitchVar: 0.05, rateVar: 0.04 },
  angry:      { pitch: 0.62, rate: 1.28, pitchVar: 0.10, rateVar: 0.10 },
  anxious:    { pitch: 1.28, rate: 1.22, pitchVar: 0.10, rateVar: 0.08 },
  distressed: { pitch: 1.22, rate: 1.16, pitchVar: 0.12, rateVar: 0.08 },
  relieved:   { pitch: 1.10, rate: 0.91, pitchVar: 0.06, rateVar: 0.05 },
  calm:       { pitch: 1.00, rate: 0.86, pitchVar: 0.04, rateVar: 0.03 },
};

// Priority list — first match wins
const PREFERRED_VOICE_PATTERNS = [
  // High-quality online voices (Chrome/Edge)
  'Google UK English Female',
  'Microsoft Aria Online',
  'Microsoft Jenny Online',
  'Microsoft Zira Online',
  'Microsoft Eva Online',
  // Decent offline voices
  'Samantha',        // macOS
  'Karen',           // macOS
  'Victoria',        // macOS
  'Google US English',
  'Microsoft Zira',
  'Microsoft Hazel',
];

let cachedVoice: SpeechSynthesisVoice | null = null;

export function getBestVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  if (typeof window === 'undefined') return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  for (const pattern of PREFERRED_VOICE_PATTERNS) {
    const match = voices.find((v) => v.name.includes(pattern));
    if (match) {
      cachedVoice = match;
      return match;
    }
  }

  // Fallback: any English voice
  const fallback = voices.find((v) => v.lang.startsWith('en')) ?? null;
  cachedVoice = fallback;
  return fallback;
}

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

/** Split text into natural sentence chunks */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation, keeping the punctuation
  const chunks = text.match(/[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g);
  return chunks ? chunks.map((s) => s.trim()).filter(Boolean) : [text];
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Speak text with emotion-modulated prosody.
 * Each sentence gets slightly randomised pitch/rate within the emotion's range
 * so the output sounds more natural than a single flat utterance.
 */
export function speakEmotional(
  text: string,
  emotion: EmotionType,
  options: SpeakOptions = {}
): void {
  if (typeof window === 'undefined') return;

  window.speechSynthesis.cancel();

  const params = EMOTION_PARAMS[emotion];
  const voice = getBestVoice();
  const sentences = splitSentences(text);
  let started = false;

  const rand = () => (Math.random() - 0.5) * 2; // -1 to 1

  sentences.forEach((sentence, i) => {
    const u = new SpeechSynthesisUtterance(sentence);
    if (voice) u.voice = voice;

    // Add slight random variation per sentence for naturalness
    u.pitch = Math.max(0.5, Math.min(2, params.pitch + rand() * params.pitchVar));
    u.rate  = Math.max(0.5, Math.min(2, params.rate  + rand() * params.rateVar));
    u.volume = 1;

    u.onstart = () => {
      if (!started) {
        started = true;
        options.onStart?.();
      }
    };

    if (i === sentences.length - 1) {
      u.onend = () => options.onEnd?.();
      u.onerror = () => options.onEnd?.();
    }

    window.speechSynthesis.speak(u);
  });
}

export function cancelSpeech(): void {
  if (typeof window !== 'undefined') window.speechSynthesis.cancel();
}
