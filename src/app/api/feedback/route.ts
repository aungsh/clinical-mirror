import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth.server';
import { apiError, parseJsonObject, validateTurns } from '@/lib/ai-api.server';
import {
  getLatestUserScenarioEvaluation,
  saveCompletedPracticeSession,
} from '@/lib/database.server';
import {
  buildLearnerFeedback,
  buildRuleBasedAdminEvaluation,
  mergeModelAdminEvaluation,
  rubricDefinitions,
} from '@/lib/evaluation.server';
import { scenarios } from '@/lib/scenarios';
import type { AvatarMode, DeliveryCapture } from '@/lib/types';

export const runtime = 'nodejs';
const EVALUATOR_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'observable-rules-v2';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const scenarioId = typeof body?.scenarioId === 'string' ? body.scenarioId : '';
    const history = validateTurns(body?.history);
    const avatarMode: AvatarMode = body?.avatarMode === 'tavus' || body?.avatarMode === 'realistic'
      ? body.avatarMode
      : 'mii';
    const deliveryCapture = body?.deliveryCapture && typeof body.deliveryCapture === 'object'
      ? body.deliveryCapture as Partial<DeliveryCapture>
      : undefined;

    if (!scenarioId || !history || history.filter((turn) => turn.speaker === 'student').length < 2) {
      return NextResponse.json({ error: 'At least two valid learner turns are required.' }, { status: 400 });
    }

    const scenario = scenarios.find((item) => item.id === scenarioId);
    if (!scenario) return NextResponse.json({ error: 'Scenario not found.' }, { status: 404 });

    const previous = getLatestUserScenarioEvaluation(user.id, scenarioId);
    const fallback = buildRuleBasedAdminEvaluation(scenario, history, deliveryCapture);
    let adminEvaluation = fallback;
    let evaluatorModel = FALLBACK_MODEL;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (apiKey) {
      let learnerIndex = 0;
      const transcript = history.map((turn) => {
        if (turn.speaker === 'student') learnerIndex += 1;
        return turn.speaker === 'student'
          ? `LEARNER TURN ${learnerIndex}: ${turn.text}`
          : `SIMULATED PERSON: ${turn.text}`;
      }).join('\n');
      const rubricContract = rubricDefinitions(scenario.id)
        .map((item) => `- ${item.id}: ${item.label} - ${item.description}`)
        .join('\n');

      const prompt = `You are assisting an authorised human reviewer with a formative communication-training report.

This is a fictional simulation. Assess only observable communication in the learner's words. Do not diagnose, infer personality, honesty, motivation, protected traits, emotion, vocal tone, competence or employment suitability. Do not recommend hiring, firing, promotion, discipline or clinical action.

SCENARIO: ${scenario.title}
GOAL: ${scenario.sessionGoal}
RUBRICS:\n${rubricContract}

TRANSCRIPT:\n${transcript}

Return valid JSON only:
{"factualSummary":"","summary":"","rubrics":[{"id":"","score":0,"rationale":"","evidence":[{"turn":1,"moment":"","observation":""}]}]}

Requirements:
- Return every rubric id exactly once with an integer score from 0 to 10.
- Base each judgement on exact numbered LEARNER TURN evidence. Never invent a quote or event.
- Explain missing evidence directly instead of guessing.
- Profanity, threats, vague personal labels and unsupported guarantees may lower relevant behavioural indicators, but context must be left for human review.
- factualSummary describes only what was observed. summary identifies the most useful coaching pattern.
- Keep rationale factual and concise.`;

      try {
        const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
          model: EVALUATOR_MODEL,
          generationConfig: { responseMimeType: 'application/json' },
        });
        const result = await model.generateContent(prompt);
        adminEvaluation = mergeModelAdminEvaluation(
          parseJsonObject(result.response.text()),
          fallback,
        );
        evaluatorModel = `${EVALUATOR_MODEL}+observable-rules-v2`;
      } catch (modelError) {
        const reason = modelError instanceof Error ? modelError.message : 'Unknown model failure';
        console.warn('[/api/feedback] Gemini unavailable; using observable fallback:', reason);
      }
    }

    const learnerFeedback = buildLearnerFeedback(
      adminEvaluation,
      previous?.adminEvaluation,
      previous?.attemptNumber,
    );
    const sessionId = saveCompletedPracticeSession({
      user,
      scenarioId,
      scenarioTitle: scenario.title,
      avatarMode,
      turns: history,
      learnerFeedback,
      adminEvaluation,
      evaluatorModel,
    });

    return NextResponse.json({
      feedback: learnerFeedback,
      sessionId,
      evaluationSource: adminEvaluation.fallbackUsed ? 'observable-fallback' : 'gemini-plus-observable-rules',
    });
  } catch (error) {
    const failure = apiError(error, '/api/feedback');
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
