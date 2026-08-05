import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { scenarios } from '@/lib/scenarios';
import { apiError, clampScore, parseJsonObject, safeText, validateTurns } from '@/lib/ai-api.server';
import type { FeedbackEvidence, Improvement } from '@/lib/types';

function evidenceList(value: unknown): FeedbackEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).map((item) => {
    const entry = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      turn: Math.max(1, Math.round(typeof entry.turn === 'number' ? entry.turn : 1)),
      moment: safeText(entry.moment, 'Student response'),
      observation: safeText(entry.observation, 'This helped the conversation.'),
    };
  });
}

function improvementList(value: unknown): Improvement[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).map((item) => {
    const entry = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      turn: Math.max(1, Math.round(typeof entry.turn === 'number' ? entry.turn : 1)),
      moment: safeText(entry.moment, 'Student response'),
      suggestion: safeText(entry.suggestion, 'Acknowledge the emotion explicitly and invite the patient to continue.'),
    };
  });
}

function textList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((item) => safeText(item, '')).filter(Boolean).slice(0, 4);
  return items.length ? items : fallback;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Gemini API key is missing.' }, { status: 503 });
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const scenarioId = typeof body?.scenarioId === 'string' ? body.scenarioId : '';
    const history = validateTurns(body?.history);
    if (!scenarioId || !history || history.filter((turn) => turn.speaker === 'student').length < 2) {
      return NextResponse.json({ error: 'At least two valid student turns are required.' }, { status: 400 });
    }
    const scenario = scenarios.find((item) => item.id === scenarioId);
    if (!scenario) return NextResponse.json({ error: 'Scenario not found.' }, { status: 404 });

    let studentIndex = 0;
    const transcript = history.map((turn) => {
      if (turn.speaker === 'student') studentIndex += 1;
      return turn.speaker === 'student'
        ? `STUDENT TURN ${studentIndex}: ${turn.text}`
        : `SIMULATED PATIENT (${turn.emotion ?? 'neutral'}, generated intensity ${turn.intensity?.toFixed(2) ?? '?'}): ${turn.text}`;
    }).join('\n');

    const prompt = `You are a formative clinical communication assessor. Assess only the learner's communication in this fictional AI simulation.

SCENARIO: ${scenario.title} — ${scenario.description}
TRANSCRIPT:\n${transcript}

Return only valid JSON with this exact structure:
{"scores":{"empathy":0,"clarity":0,"deescalation":0},"summary":"","strengths":[{"turn":1,"moment":"","observation":""}],"improvements":[{"turn":1,"moment":"","suggestion":""}],"limitations":[""],"retryPlan":[""],"overallConfidence":"low|moderate|high","educationalDisclaimer":""}

Rubric: empathy = emotional acknowledgement before facts/solutions, validation, curiosity and listening; clarity = plain language, structure, pacing and checking understanding; de-escalation = textual evidence that the learner acknowledged concerns, avoided defensiveness, and offered appropriate next steps. Generated patient emotion/intensity may support—but must never determine—the score because it is not independent ground truth.

Every strength and improvement must cite the exact numbered STUDENT TURN and closely quote or accurately paraphrase it. Do not invent evidence. Use 1–2 strengths, 2–3 improvements, and 2–3 concrete retry steps. State limitations including that one AI-generated interaction cannot establish clinical competence and the simulated emotion signal is model-generated. Confidence must reflect transcript length and evidence quality. The disclaimer must say this is educational formative feedback, not a competency assessment or clinical advice.`;

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const parsed = parseJsonObject(result.response.text());
    const scores = parsed.scores && typeof parsed.scores === 'object' ? parsed.scores as Record<string, unknown> : {};
    const confidence = ['low', 'moderate', 'high'].includes(String(parsed.overallConfidence))
      ? parsed.overallConfidence as 'low' | 'moderate' | 'high' : 'low';

    return NextResponse.json({
      scores: { empathy: clampScore(scores.empathy), clarity: clampScore(scores.clarity), deescalation: clampScore(scores.deescalation) },
      summary: safeText(parsed.summary, 'This short attempt provides an initial opportunity for reflection.'),
      strengths: evidenceList(parsed.strengths),
      improvements: improvementList(parsed.improvements),
      limitations: textList(parsed.limitations, ['This was a short AI-generated simulation and cannot establish clinical competence.', 'The patient emotion signal is generated by the same model and is not independent evidence.']),
      retryPlan: textList(parsed.retryPlan, ['Name the patient’s emotion explicitly.', 'Use one open question before offering information.', 'Check the patient’s understanding before closing.']),
      overallConfidence: confidence,
      educationalDisclaimer: safeText(parsed.educationalDisclaimer, 'Educational formative feedback only; not a competency assessment or clinical advice.'),
    });
  } catch (error) {
    const failure = apiError(error, '/api/feedback');
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
