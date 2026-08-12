import 'server-only';
import { NextResponse } from 'next/server';
import { ELEVENLABS_MODEL, computeElevenLabsSettings, getPatientVoiceEnvKey } from '@/lib/elevenlabs-voice-profiles';
import type { PatientVariant } from '@/lib/voice-profiles';
import type { EmotionType } from '@/lib/types';

// Valid patient IDs
const VALID_PATIENTS: PatientVariant[] = ['james', 'robert', 'margaret', 'emma'];

// Valid emotions
const VALID_EMOTIONS: EmotionType[] = ['neutral', 'calm', 'anxious', 'sad', 'distressed', 'angry', 'relieved'];

// Request timeout — prevents indefinite hang
const ELEVENLABS_TIMEOUT_MS = 12_000;

export async function POST(req: Request) {
  try {
    // ── Read & validate API key ─────────────────────────────────────────────
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_elevenlabs_api_key_here') {
      return NextResponse.json({ error: 'ElevenLabs API key not configured.' }, { status: 503 });
    }

    // ── Parse request ───────────────────────────────────────────────────────
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const patientId = typeof body.patientId === 'string' ? body.patientId.toLowerCase() as PatientVariant : '';
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const emotion = typeof body.emotion === 'string' ? body.emotion as EmotionType : 'neutral';
    const intensity = typeof body.intensity === 'number' && Number.isFinite(body.intensity)
      ? Math.max(0, Math.min(1, body.intensity))
      : 0.5;

    if (!VALID_PATIENTS.includes(patientId as PatientVariant)) {
      return NextResponse.json({ error: 'Invalid patientId.' }, { status: 400 });
    }
    if (!text || text.length > 5000) {
      return NextResponse.json({ error: 'Invalid text.' }, { status: 400 });
    }
    const safeEmotion: EmotionType = VALID_EMOTIONS.includes(emotion) ? emotion : 'neutral';

    // ── Resolve voice ID ────────────────────────────────────────────────────
    const envKey = getPatientVoiceEnvKey(patientId as PatientVariant);
    const voiceId = process.env[envKey];
    if (!voiceId || voiceId.trim() === '') {
      return NextResponse.json(
        { error: `ElevenLabs voice ID not configured for patient: ${patientId}` },
        { status: 503 },
      );
    }

    // ── Compute voice settings ──────────────────────────────────────────────
    const settings = computeElevenLabsSettings(patientId as PatientVariant, safeEmotion, intensity);

    // ── Call ElevenLabs TTS API ─────────────────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ELEVENLABS_TIMEOUT_MS);

    let elevenLabsRes: Response;
    try {
      elevenLabsRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: ELEVENLABS_MODEL,
            voice_settings: {
              stability: settings.stability,
              similarity_boost: settings.similarity_boost,
              style: settings.style,
              speed: settings.speed,
            },
          }),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!elevenLabsRes.ok) {
      const errText = await elevenLabsRes.text().catch(() => '');
      // Log safely — never log the API key
      console.error(`[/api/tts] ElevenLabs error ${elevenLabsRes.status}: ${errText.slice(0, 200)}`);
      return NextResponse.json(
        { error: `ElevenLabs TTS failed (${elevenLabsRes.status}).` },
        { status: 502 },
      );
    }

    // ── Stream audio back to client ─────────────────────────────────────────
    const audioBuffer = await elevenLabsRes.arrayBuffer();
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'ElevenLabs returned empty audio.' }, { status: 502 });
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        // Do not cache — each emotional state is unique
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[/api/tts] ElevenLabs request timed out');
      return NextResponse.json({ error: 'ElevenLabs TTS timed out.' }, { status: 504 });
    }
    console.error('[/api/tts]', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'TTS service error.' }, { status: 500 });
  }
}
