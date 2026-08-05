import 'server-only';
import type { EmotionType, Turn } from './types';

const EMOTIONS: EmotionType[] = ['neutral', 'sad', 'angry', 'anxious', 'distressed', 'relieved', 'calm'];

export function parseJsonObject(text: string): Record<string, unknown> {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(clean) as Record<string, unknown>;
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned invalid JSON');
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

export function validateTurns(value: unknown, max = 80): Turn[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const turns: Turn[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const turn = item as Partial<Turn>;
    // Accept both the new speakerId field and any string speaker
    const speakerId = typeof turn.speakerId === 'string' ? turn.speakerId : '';
    const segmentId = typeof turn.segmentId === 'string' ? turn.segmentId : '';
    if (!speakerId || typeof turn.text !== 'string') return null;
    const text = turn.text.trim();
    if (!text || text.length > 2400) return null;
    turns.push({
      speakerId,
      segmentId,
      text,
      timestamp: typeof turn.timestamp === 'number' ? turn.timestamp : Date.now(),
      ...(EMOTIONS.includes(turn.emotion as EmotionType) ? { emotion: turn.emotion as EmotionType } : {}),
      ...(typeof turn.intensity === 'number' && Number.isFinite(turn.intensity)
        ? { intensity: Math.max(0, Math.min(1, turn.intensity)) }
        : {}),
    });
  }
  return turns;
}

export function clampScore(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(10, Math.round(value)))
    : 5;
}

export function safeText(value: unknown, fallback: string, max = 1200): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

export function apiError(error: unknown, route: string) {
  console.error(`[${route}]`, error instanceof Error ? error.message : 'Unknown error');
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('api key') || message.includes('permission') || message.includes('quota')) {
    return { status: 503, body: { error: 'AI service is not configured or available. Check the Gemini key and quota.' } };
  }
  return { status: 502, body: { error: 'The AI service could not complete this request. Please try again.' } };
}
