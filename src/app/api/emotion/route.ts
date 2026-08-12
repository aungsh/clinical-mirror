/**
 * POST /api/emotion
 *
 * Classifies the emotional state of a patient utterance.
 *
 * In Tavus (live video) mode, Tavus owns the conversation loop, so we no
 * longer get the {reply, emotion, intensity} envelope that /api/chat returns.
 * This route recovers just the emotion signal from the spoken line so the
 * emotion readout, the voice orb colour, and the intensity trend in the
 * feedback report keep working.
 *
 * Request:  { scenarioId: string, patientText: string, studentText?: string }
 * Response: { emotion: EmotionType, intensity: number }
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { scenarios } from '@/lib/scenarios';
import { apiError, parseJsonObject } from '@/lib/ai-api.server';
import type { EmotionType } from '@/lib/types';

const VALID_EMOTIONS: EmotionType[] = [
  'neutral',
  'sad',
  'angry',
  'anxious',
  'distressed',
  'relieved',
  'calm',
];

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is missing.' }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const scenarioId = typeof body?.scenarioId === 'string' ? body.scenarioId : '';
    const patientText =
      typeof body?.patientText === 'string' ? body.patientText.trim().slice(0, 1200) : '';
    const studentText =
      typeof body?.studentText === 'string' ? body.studentText.trim().slice(0, 1200) : '';

    if (!scenarioId || !patientText) {
      return NextResponse.json(
        { error: 'scenarioId and patientText are required.' },
        { status: 400 },
      );
    }

    const scenario = scenarios.find((item) => item.id === scenarioId);
    if (!scenario) return NextResponse.json({ error: 'Scenario not found.' }, { status: 404 });

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `Classify the emotional state expressed in a simulated patient's spoken line.

SCENARIO: ${scenario.title} — ${scenario.patientName}, ${scenario.patientAge}.
EMOTIONAL BASELINE FOR THIS CHARACTER: intensity ${scenario.initialIntensity} at the start of the conversation.
${studentText ? `WHAT THE STUDENT JUST SAID: ${studentText}\n` : ''}THE PATIENT SAID: ${patientText}

Return only valid JSON: {"emotion":"neutral|sad|angry|anxious|distressed|relieved|calm","intensity":0.0}
intensity is how strongly the emotion is expressed, 0.0 (barely present) to 1.0 (overwhelming).
Judge only from the words, punctuation and phrasing of the patient's line. Do not invent context.`;

    const result = await model.generateContent(prompt);
    const parsed = parseJsonObject(result.response.text());

    const emotion = VALID_EMOTIONS.includes(parsed.emotion as EmotionType)
      ? (parsed.emotion as EmotionType)
      : 'neutral';
    const intensity =
      typeof parsed.intensity === 'number' && Number.isFinite(parsed.intensity)
        ? Math.max(0, Math.min(1, parsed.intensity))
        : 0.5;

    return NextResponse.json({ emotion, intensity });
  } catch (error) {
    const failure = apiError(error, '/api/emotion');
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
