import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth.server';
import { apiError, parseJsonObject, safeText, validateTurns } from '@/lib/ai-api.server';
import { scenarios } from '@/lib/scenarios';

function turnNumber(value: unknown): number {
  return Math.max(1, Math.round(typeof value === 'number' ? value : 1));
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export async function POST(req: Request) {
  if (!await getCurrentUser()) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is missing.' }, { status: 503 });
    }

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const scenarioId = typeof body?.scenarioId === 'string' ? body.scenarioId : '';
    const history = validateTurns(body?.history);
    const studentTurns = history?.filter((turn) => turn.speaker === 'student') ?? [];

    if (!scenarioId || !history || studentTurns.length < 2) {
      return NextResponse.json(
        { error: 'Complete at least two learner turns before requesting coaching.' },
        { status: 400 },
      );
    }

    const scenario = scenarios.find((item) => item.id === scenarioId);
    if (!scenario) return NextResponse.json({ error: 'Scenario not found.' }, { status: 404 });

    let studentIndex = 0;
    const transcript = history.map((turn) => {
      if (turn.speaker === 'student') studentIndex += 1;
      return turn.speaker === 'student'
        ? `LEARNER TURN ${studentIndex}: ${turn.text}`
        : `SIMULATED PERSON: ${turn.text}`;
    }).join('\n');

    const prompt = `You are a supportive communication coach giving a brief checkpoint DURING a fictional practice conversation.

SCENARIO: ${scenario.title} — ${scenario.description}
TRANSCRIPT SO FAR:\n${transcript}

Return only valid JSON with this exact structure:
{"observedStrength":{"turn":1,"moment":"","observation":""},"focus":{"turn":1,"moment":"","suggestion":""},"tryNext":"","reflectionQuestion":""}

This is formative coaching, not an assessment. Do not score, grade, rank, pass, fail, or provide a final judgement. Cite one exact LEARNER TURN that helped the conversation and explain why. Select one current learning focus, grounded in an exact learner turn. Give one short example phrase the learner could naturally try in their NEXT response without revealing hidden scenario facts or scripting the whole answer. End with one concise self-reflection question. Focus on observable communication: acknowledgement, listening, open questions, plain language, checking understanding, de-escalation, and collaborative next steps. Do not diagnose the learner or infer personality, emotion, competence, or intent.`;

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const parsed = parseJsonObject(result.response.text());
    const strength = objectValue(parsed.observedStrength);
    const focus = objectValue(parsed.focus);

    return NextResponse.json({
      observedStrength: {
        turn: turnNumber(strength.turn),
        moment: safeText(strength.moment, 'Your response'),
        observation: safeText(
          strength.observation,
          'This created space for the other person to continue.',
        ),
      },
      focus: {
        turn: turnNumber(focus.turn),
        moment: safeText(focus.moment, 'Your response'),
        suggestion: safeText(
          focus.suggestion,
          'Acknowledge what you heard before moving to your next question.',
        ),
      },
      tryNext: safeText(
        parsed.tryNext,
        'It sounds like this has been difficult. Could you tell me more about what concerns you most?',
      ),
      reflectionQuestion: safeText(
        parsed.reflectionQuestion,
        'What does the other person most need you to understand before you continue?',
      ),
    });
  } catch (error) {
    const failure = apiError(error, '/api/coaching');
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
