/**
 * POST /api/patient-reply-video
 *
 * Orchestrates the realistic avatar pipeline:
 *   1. ElevenLabs TTS:  patient reply text → audio (wav/mp3)
 *   2. Wav2Lip service: audio + stock avatar video → lip-synced mp4
 *   3. Returns { videoUrl } or { fallback: true } on any failure
 *
 * The frontend should silently fall back to the Mii avatar when
 * { fallback: true } is returned — never surface a raw error to the student.
 *
 * Required env vars:
 *   ELEVENLABS_API_KEY       – ElevenLabs free-tier key
 *   WAV2LIP_SERVICE_URL      – base URL of the FastAPI Wav2Lip service
 *                              e.g. "http://localhost:8000" or a RunPod endpoint
 *
 * Optional env vars:
 *   ELEVENLABS_VOICE_ID      – override default voice (defaults to "Rachel")
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth.server';
import { EmotionType, StockAvatarId } from '@/lib/types';

// ── ElevenLabs voice settings per emotion ──────────────────────────────────

const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // "Sarah" — calm, clinical

/**
 * ElevenLabs voice_settings per emotion.
 * stability: 0–1 (higher = more monotone)
 * similarity_boost: 0–1 (higher = closer to reference)
 * style: 0–1 (expressiveness)
 */
const ELEVENLABS_EMOTION_SETTINGS: Record<
  EmotionType,
  { stability: number; similarity_boost: number; style: number }
> = {
  neutral:    { stability: 0.65, similarity_boost: 0.75, style: 0.10 },
  calm:       { stability: 0.80, similarity_boost: 0.80, style: 0.05 },
  relieved:   { stability: 0.72, similarity_boost: 0.78, style: 0.15 },
  sad:        { stability: 0.55, similarity_boost: 0.70, style: 0.30 },
  anxious:    { stability: 0.40, similarity_boost: 0.65, style: 0.45 },
  angry:      { stability: 0.35, similarity_boost: 0.65, style: 0.55 },
  distressed: { stability: 0.30, similarity_boost: 0.60, style: 0.60 },
};

// ── Stock avatar → source video mapping ────────────────────────────────────
// These are the filenames stored in /public/assets/avatars/stock/
// The Wav2Lip service must be able to resolve these paths on its host.

const STOCK_AVATAR_VIDEO: Record<StockAvatarId, string> = {
  'patient-a': 'patient-a.mp4',
  'patient-b': 'patient-b.mp4',
  'patient-c': 'patient-c.mp4',
};

// ── Timeouts ───────────────────────────────────────────────────────────────
const TTS_TIMEOUT_MS      = 10_000; // 10 s
const WAV2LIP_TIMEOUT_MS  = 120_000; // 120 s — generation takes ~60s on first GPU cold start

// ── ElevenLabs TTS ─────────────────────────────────────────────────────────

async function generateSpeechBase64(
  text: string,
  emotion: EmotionType,
): Promise<{ audioBase64: string; mimeType: string }> {
  const apiKey   = process.env.ELEVENLABS_API_KEY;
  const voiceId  = process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;

  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');

  const settings = ELEVENLABS_EMOTION_SETTINGS[emotion] ?? ELEVENLABS_EMOTION_SETTINGS.neutral;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method:  'POST',
        signal:  controller.signal,
        headers: {
          'xi-api-key':   apiKey,
          'Content-Type': 'application/json',
          Accept:         'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: settings,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`ElevenLabs error ${res.status}: ${body}`);
    }

    const audioBuffer = await res.arrayBuffer();
    const audioBase64  = Buffer.from(audioBuffer).toString('base64');
    return { audioBase64, mimeType: 'audio/mpeg' };
  } finally {
    clearTimeout(timer);
  }
}

// ── Wav2Lip service ────────────────────────────────────────────────────────

interface Wav2LipResponse {
  video_url: string; // absolute URL or relative path served by the Wav2Lip host
}

async function generateLipSyncVideo(
  audioBase64: string,
  mimeType: string,
  avatarId: StockAvatarId,
): Promise<string> {
  const serviceUrl = process.env.WAV2LIP_SERVICE_URL;
  if (!serviceUrl) throw new Error('WAV2LIP_SERVICE_URL is not set');

  const avatarVideo = STOCK_AVATAR_VIDEO[avatarId];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WAV2LIP_TIMEOUT_MS);

  try {
    const res = await fetch(`${serviceUrl}/generate`, {
      method:  'POST',
      signal:  controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_base64: audioBase64,
        audio_mime:   mimeType,
        avatar_video: avatarVideo,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Wav2Lip service error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as Wav2LipResponse;
    if (!data.video_url) throw new Error('Wav2Lip service returned no video_url');
    return data.video_url;
  } finally {
    clearTimeout(timer);
  }
}

// ── Route handler ──────────────────────────────────────────────────────────

export interface PatientReplyVideoRequest {
  text:     string;
  emotion:  EmotionType;
  avatarId: StockAvatarId;
}

export async function POST(req: NextRequest) {
  if (!await getCurrentUser()) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  let body: PatientReplyVideoRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { text, emotion, avatarId } = body;

  if (!text || !emotion || !avatarId) {
    return NextResponse.json(
      { error: 'text, emotion, and avatarId are required' },
      { status: 400 },
    );
  }

  // ── Step 1: TTS ────────────────────────────────────────────────────────
  let audioBase64: string;
  let mimeType: string;

  try {
    const result = await generateSpeechBase64(text, emotion);
    audioBase64  = result.audioBase64;
    mimeType     = result.mimeType;
  } catch (err) {
    console.error('[patient-reply-video] TTS failed:', err);
    // Fallback: tell frontend to render Mii avatar for this turn
    return NextResponse.json({ fallback: true, reason: 'tts_failed' });
  }

  // ── Step 2: Wav2Lip ────────────────────────────────────────────────────
  let videoUrl: string;

  try {
    videoUrl = await generateLipSyncVideo(audioBase64, mimeType, avatarId);
  } catch (err) {
    console.error('[patient-reply-video] Wav2Lip failed:', err);
    // Fallback: tell frontend to render Mii avatar for this turn
    return NextResponse.json({ fallback: true, reason: 'wav2lip_failed' });
  }

  // ── Success ────────────────────────────────────────────────────────────
  return NextResponse.json({ videoUrl });
}
