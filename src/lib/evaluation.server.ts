import 'server-only';

import type {
  AdminEvaluation,
  DeliveryCapture,
  DeliveryMetrics,
  FeedbackEvidence,
  LearnerFeedback,
  LearnerPriority,
  ReviewFlag,
  RubricAssessment,
  Scenario,
  Turn,
} from '@/lib/types';

export interface RubricDefinition {
  id: string;
  label: string;
  description: string;
  scenarioSpecific?: boolean;
}

const GENERAL_RUBRICS: RubricDefinition[] = [
  { id: 'active-listening', label: 'Active listening', description: 'Responds to what the other person said and follows up meaningfully.' },
  { id: 'respect-acknowledgement', label: 'Respect and acknowledgement', description: 'Recognises concerns without blame, dismissal or personal labels.' },
  { id: 'clarity-structure', label: 'Clarity and structure', description: 'Uses plain language and gives the conversation a clear, logical flow.' },
  { id: 'specificity-evidence', label: 'Specificity and evidence', description: 'Uses observable details instead of vague conclusions or assumptions.' },
  { id: 'questioning-dialogue', label: 'Questioning and dialogue', description: 'Uses open questions and creates space for the other person to contribute.' },
  { id: 'handling-resistance', label: 'Handling resistance', description: 'Responds to disagreement without defensiveness, pressure or escalation.' },
  { id: 'accountability-fairness', label: 'Accountability and fairness', description: 'Balances clear expectations with context, support and procedural fairness.' },
  { id: 'action-planning', label: 'Action planning', description: 'Agrees specific next steps, ownership, support and follow-up.' },
  { id: 'professional-language', label: 'Professional language', description: 'Avoids excessive filler, vague wording, profanity and inappropriate labels.' },
  { id: 'delivery-presence', label: 'Delivery and presence', description: 'Uses an appropriate pace, speaking balance and interruption pattern.' },
];

const PERFORMANCE_RUBRICS: RubricDefinition[] = [
  { id: 'fact-based-feedback', label: 'Fact-based feedback', description: 'Separates documented behaviour and impact from personality judgements.', scenarioSpecific: true },
  { id: 'expectation-setting', label: 'Expectation setting', description: 'Makes the expected standard and review point explicit.', scenarioSpecific: true },
];

const MEDICAL_RUBRICS: RubricDefinition[] = [
  { id: 'emotional-safety', label: 'Emotional safety', description: 'Acknowledges emotional impact and gives the person space to respond.', scenarioSpecific: true },
  { id: 'understanding-check', label: 'Checking understanding', description: 'Checks what the person understood before moving forward.', scenarioSpecific: true },
];

export function rubricDefinitions(scenarioId: string): RubricDefinition[] {
  return [...GENERAL_RUBRICS, ...(scenarioId === 'performance-review' ? PERFORMANCE_RUBRICS : MEDICAL_RUBRICS)];
}

const ACKNOWLEDGEMENT = /\b(understand|hear you|sounds like|that sounds|sorry|worried|difficult|frustrat|concern|thank you for|appreciate)\b/i;
const OPEN_QUESTION = /\b(what|how|could you|would you|can you tell|help me understand)\b[^?]{0,180}\?/i;
const CHECK_UNDERSTANDING = /\b(make sense|understand|questions|how does that sound|what have you heard|can you tell me)\b/i;
const ACTION = /\b(next step|follow[- ]?up|agree|plan|support|review|check in|by (monday|tuesday|wednesday|thursday|friday|next week))\b/i;
const FACTS = /\b(example|specifically|record|handover|document|result|test|three|two|week|date|observed)\b/i;
const FAIRNESS = /\b(your perspective|what happened|context|support|workload|together|fair|help)\b/i;
const THREAT = /\b(fire|fired|termination|terminate|disciplin|warning letter|promotion decision)\b/i;
const UNSAFE_PROMISE = /\b(guarantee|definitely be fine|nothing to worry|cure you|promise you will)\b/i;
const FILLERS = /\b(um+|uh+|erm+|like|you know|basically|actually|sort of|kind of)\b/gi;
const HEDGING = /\b(maybe|perhaps|probably|I guess|I think|somehow|whatever|possibly)\b/gi;
const PROFANITY = /\b(fuck(?:ing)?|shit(?:ty)?|damn|bitch|asshole|bullshit)\b/gi;
const VAGUE = /\b(always|never|bad attitude|careless|unprofessional person|everyone says|obviously)\b/i;

function clamp(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function learnerTurns(turns: Turn[]) {
  return turns.filter((turn) => turn.speaker === 'student').map((turn, index) => ({ ...turn, learnerTurn: index + 1 }));
}

function evidenceFor(turns: ReturnType<typeof learnerTurns>, pattern: RegExp, observation: string): FeedbackEvidence[] {
  const match = turns.find((turn) => pattern.test(turn.text));
  pattern.lastIndex = 0;
  return match ? [{ turn: match.learnerTurn, moment: quote(match.text), observation }] : [];
}

function quote(text: string, length = 150): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= length ? clean : `${clean.slice(0, length - 3)}...`;
}

function matches(text: string, pattern: RegExp): number {
  const result = text.match(pattern)?.length ?? 0;
  pattern.lastIndex = 0;
  return result;
}

function repeatedPhraseCount(text: string): number {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  const seen = new Map<string, number>();
  for (let index = 0; index < words.length - 2; index += 1) {
    const phrase = words.slice(index, index + 3).join(' ');
    seen.set(phrase, (seen.get(phrase) ?? 0) + 1);
  }
  return [...seen.values()].filter((count) => count > 1).length;
}

export function analyseDelivery(turns: Turn[], capture?: Partial<DeliveryCapture>): DeliveryMetrics {
  const learner = learnerTurns(turns);
  const learnerText = learner.map((turn) => turn.text).join(' ');
  const allText = turns.map((turn) => turn.text).join(' ');
  const learnerWordCount = learnerText.match(/[A-Za-z0-9']+/g)?.length ?? 0;
  const allWordCount = allText.match(/[A-Za-z0-9']+/g)?.length ?? 0;
  const responseIntervals: number[] = [];

  turns.forEach((turn, index) => {
    if (turn.speaker !== 'student') return;
    const previous = turns.slice(0, index).toReversed().find((item) => item.speaker === 'patient');
    if (previous && turn.timestamp >= previous.timestamp) {
      responseIntervals.push(Math.min(120, (turn.timestamp - previous.timestamp) / 1000));
    }
  });

  const fillerCount = matches(learnerText, FILLERS);
  const hedgingCount = matches(learnerText, HEDGING);
  const profanityCount = matches(learnerText, PROFANITY);
  const speakingSharePercent = allWordCount ? Math.round((learnerWordCount / allWordCount) * 100) : 0;
  const averageWordsPerTurn = learner.length ? Math.round(learnerWordCount / learner.length) : 0;
  const audioSignalsCaptured = Boolean(capture?.audioSignalsCaptured && Number(capture.audioSampleCount) > 0);
  const speechDurationSeconds = Math.max(0, Number(capture?.speechDurationSeconds ?? 0));
  const speakingSegments = Math.max(0, Number(capture?.speakingSegments ?? 0));
  const interruptions = Math.max(0, Number(capture?.interruptions ?? 0));
  const audioSampleCount = Math.max(0, Number(capture?.audioSampleCount ?? 0));
  const averageAudioLevel = Math.max(0, Number(capture?.averageAudioLevel ?? 0));
  const peakAudioLevel = Math.max(0, Number(capture?.peakAudioLevel ?? 0));

  const observations = [
    `${speakingSharePercent}% of transcript words came from the learner`,
    `${fillerCount} filler and ${hedgingCount} hedging expression${hedgingCount === 1 ? '' : 's'} detected`,
    audioSignalsCaptured
      ? `${speakingSegments} speaking segment${speakingSegments === 1 ? '' : 's'} and ${interruptions} possible overlap${interruptions === 1 ? '' : 's'} observed`
      : 'raw audio was not stored; vocal emotion and intent were not inferred',
  ];

  return {
    audioSignalsCaptured,
    speechDurationSeconds: Math.round(speechDurationSeconds * 10) / 10,
    speakingSegments,
    interruptions,
    audioSampleCount,
    averageAudioLevel: Math.round(averageAudioLevel * 1000) / 1000,
    peakAudioLevel: Math.round(peakAudioLevel * 1000) / 1000,
    learnerWordCount,
    averageWordsPerTurn,
    speakingSharePercent,
    questionCount: (learnerText.match(/\?/g) ?? []).length,
    fillerCount,
    hedgingCount,
    profanityCount,
    repeatedPhraseCount: repeatedPhraseCount(learnerText),
    averageResponseIntervalSeconds: responseIntervals.length
      ? Math.round((responseIntervals.reduce((sum, value) => sum + value, 0) / responseIntervals.length) * 10) / 10
      : null,
    interpretation: observations.join('; '),
  };
}

function makeRubric(
  definition: RubricDefinition,
  score: number,
  rationale: string,
  evidence: FeedbackEvidence[],
  confidence: RubricAssessment['confidence'],
): RubricAssessment {
  return { ...definition, score: clamp(score), rationale, evidence, confidence };
}

export function buildRuleBasedAdminEvaluation(
  scenario: Scenario,
  turns: Turn[],
  capture?: Partial<DeliveryCapture>,
): AdminEvaluation {
  const learner = learnerTurns(turns);
  const text = learner.map((turn) => turn.text).join(' ');
  const delivery = analyseDelivery(turns, capture);
  const hasAcknowledgement = ACKNOWLEDGEMENT.test(text);
  const hasQuestion = OPEN_QUESTION.test(text);
  const hasCheck = CHECK_UNDERSTANDING.test(text);
  const hasAction = ACTION.test(text);
  const hasFacts = FACTS.test(text);
  const hasFairness = FAIRNESS.test(text);
  const hasThreat = THREAT.test(text);
  const hasUnsafePromise = UNSAFE_PROMISE.test(text);
  const hasVagueLabel = VAGUE.test(text);
  const confidence = learner.length >= 6 ? 'high' : learner.length >= 3 ? 'moderate' : 'low';
  const evidence = {
    acknowledgement: evidenceFor(learner, ACKNOWLEDGEMENT, 'The learner explicitly acknowledged the other person\'s concern or experience.'),
    question: evidenceFor(learner, OPEN_QUESTION, 'The learner used an open question to invite the other person\'s perspective.'),
    check: evidenceFor(learner, CHECK_UNDERSTANDING, 'The learner checked understanding or invited questions.'),
    action: evidenceFor(learner, ACTION, 'The learner introduced a concrete next step, support action or follow-up.'),
    facts: evidenceFor(learner, FACTS, 'The learner referred to a specific or observable detail.'),
    fairness: evidenceFor(learner, FAIRNESS, 'The learner invited context or offered collaborative support.'),
  };

  const scoreById: Record<string, { score: number; rationale: string; evidence: FeedbackEvidence[] }> = {
    'active-listening': { score: 3 + (hasAcknowledgement ? 3 : 0) + (hasQuestion ? 2 : 0) + (hasCheck ? 2 : 0), rationale: hasQuestion ? 'The transcript contains a follow-up question and evidence of response to the other person.' : 'The transcript contains limited evidence of follow-up listening.', evidence: [...evidence.acknowledgement, ...evidence.question].slice(0, 2) },
    'respect-acknowledgement': { score: 5 + (hasAcknowledgement ? 3 : 0) - delivery.profanityCount * 2 - (hasVagueLabel ? 2 : 0), rationale: hasAcknowledgement ? 'Concern was acknowledged directly; language penalties are applied separately where detected.' : 'No explicit acknowledgement was detected in the learner transcript.', evidence: evidence.acknowledgement },
    'clarity-structure': { score: 5 + (delivery.averageWordsPerTurn <= 45 ? 2 : -1) + (hasCheck ? 2 : 0) - delivery.repeatedPhraseCount, rationale: `Learner turns averaged ${delivery.averageWordsPerTurn} words${hasCheck ? ' and included an understanding check' : ''}.`, evidence: evidence.check },
    'specificity-evidence': { score: 4 + (hasFacts ? 4 : 0) - (hasVagueLabel ? 2 : 0), rationale: hasFacts ? 'At least one specific or observable detail was used.' : 'The transcript did not clearly anchor feedback in a specific observable detail.', evidence: evidence.facts },
    'questioning-dialogue': { score: 3 + (hasQuestion ? 4 : 0) + Math.min(2, delivery.questionCount), rationale: `${delivery.questionCount} question${delivery.questionCount === 1 ? '' : 's'} appeared in the learner transcript.`, evidence: evidence.question },
    'handling-resistance': { score: 5 + (hasAcknowledgement ? 2 : 0) + (hasFairness ? 1 : 0) - (hasThreat ? 4 : 0) - delivery.profanityCount, rationale: hasThreat ? 'Potentially threatening employment language requires human review.' : 'No explicit threat was detected; acknowledgement and collaborative wording increase this indicator.', evidence: [...evidence.acknowledgement, ...evidence.fairness].slice(0, 2) },
    'accountability-fairness': { score: 4 + (hasFacts ? 2 : 0) + (hasFairness ? 2 : 0) + (hasAction ? 1 : 0), rationale: hasFairness ? 'The learner invited context or support while discussing expectations.' : 'The balance between accountability and the other person\'s context was not clearly established.', evidence: [...evidence.facts, ...evidence.fairness].slice(0, 2) },
    'action-planning': { score: 3 + (hasAction ? 5 : 0) + (hasCheck ? 1 : 0), rationale: hasAction ? 'A next step, support action or follow-up was mentioned.' : 'No clear agreed next step or follow-up was detected.', evidence: evidence.action },
    'professional-language': { score: 8 - delivery.profanityCount * 3 - Math.min(2, delivery.fillerCount) - Math.min(2, delivery.hedgingCount) - (hasVagueLabel ? 2 : 0), rationale: `${delivery.fillerCount} fillers, ${delivery.hedgingCount} hedges and ${delivery.profanityCount} profane term${delivery.profanityCount === 1 ? '' : 's'} were detected.`, evidence: [] },
    'delivery-presence': { score: 7 - Math.min(3, delivery.interruptions) - (delivery.speakingSharePercent > 75 ? 2 : 0) - (delivery.averageWordsPerTurn > 70 ? 2 : 0), rationale: delivery.interpretation, evidence: [] },
    'fact-based-feedback': { score: 3 + (hasFacts ? 5 : 0) - (hasVagueLabel ? 3 : 0), rationale: hasFacts ? 'The conversation included a specific work-related detail.' : 'The performance feedback was not clearly tied to documented examples.', evidence: evidence.facts },
    'expectation-setting': { score: 3 + (hasAction ? 4 : 0) + (hasCheck ? 2 : 0), rationale: hasAction ? 'A future action or review point was mentioned.' : 'The expected standard and review point were not explicit.', evidence: [...evidence.action, ...evidence.check].slice(0, 2) },
    'emotional-safety': { score: 4 + (hasAcknowledgement ? 4 : 0) - delivery.profanityCount * 2 - (hasUnsafePromise ? 2 : 0), rationale: hasAcknowledgement ? 'The learner acknowledged an emotional concern.' : 'The transcript did not contain a clear emotional acknowledgement.', evidence: evidence.acknowledgement },
    'understanding-check': { score: 3 + (hasCheck ? 6 : 0), rationale: hasCheck ? 'The learner invited questions or checked understanding.' : 'No explicit understanding check was detected.', evidence: evidence.check },
  };

  const rubrics = rubricDefinitions(scenario.id).map((definition) => {
    const item = scoreById[definition.id];
    return makeRubric(definition, item.score, item.rationale, item.evidence, confidence);
  });
  const sorted = [...rubrics].sort((left, right) => right.score - left.score);
  const strengths = sorted.filter((item) => item.score >= 6 && item.evidence.length).slice(0, 3).flatMap((item) => item.evidence.slice(0, 1));
  const improvements = [...rubrics].sort((left, right) => left.score - right.score).slice(0, 4).map((item) => ({
    turn: item.evidence[0]?.turn ?? learner[0]?.learnerTurn ?? 1,
    moment: item.evidence[0]?.moment ?? quote(learner[0]?.text ?? 'No learner evidence available'),
    suggestion: improvementFor(item.id),
  }));
  const flags: ReviewFlag[] = [];
  if (delivery.profanityCount) flags.push({ severity: 'review', label: 'Profanity detected', evidence: `${delivery.profanityCount} profane term${delivery.profanityCount === 1 ? '' : 's'} detected in the learner transcript.`, humanReviewRequired: true });
  if (hasThreat) flags.push({ severity: 'review', label: 'Employment-action language', evidence: 'Language relating to discipline or termination was detected and requires contextual human review.', humanReviewRequired: true });
  if (hasUnsafePromise) flags.push({ severity: 'review', label: 'Potentially unsafe reassurance', evidence: 'Absolute reassurance or a guarantee may have been used; verify against the transcript.', humanReviewRequired: true });
  if (delivery.speakingSharePercent > 75) flags.push({ severity: 'information', label: 'High learner speaking share', evidence: `${delivery.speakingSharePercent}% of transcript words came from the learner.`, humanReviewRequired: false });

  const legacyEmpathy = averageRubrics(rubrics, ['active-listening', 'respect-acknowledgement', 'emotional-safety']);
  const legacyClarity = averageRubrics(rubrics, ['clarity-structure', 'specificity-evidence', 'understanding-check']);
  const legacyDeescalation = averageRubrics(rubrics, ['handling-resistance', 'action-planning', 'accountability-fairness']);

  return {
    version: 2,
    scores: { empathy: legacyEmpathy, clarity: legacyClarity, deescalation: legacyDeescalation },
    factualSummary: `The learner contributed ${learner.length} spoken turn${learner.length === 1 ? '' : 's'}. The transcript ${hasAcknowledgement ? 'included' : 'did not include'} an explicit acknowledgement, ${hasQuestion ? 'included' : 'did not include'} an open question, and ${hasAction ? 'included' : 'did not include'} a concrete next step.`,
    summary: strengths.length ? 'The transcript shows usable communication behaviours alongside clear priorities for the next attempt.' : 'The available transcript provides limited positive evidence and several specific behaviours to practise next.',
    strengths,
    improvements,
    limitations: [
      'One simulation cannot establish workplace or clinical competence.',
      'Automated transcript analysis can miss context, sarcasm, accents and transcription errors.',
      delivery.audioSignalsCaptured ? 'Audio-level signals were aggregated without storing raw audio; they do not establish emotion, honesty or intent.' : 'Raw audio was not analysed, so vocal tone, emotion and intent were not scored.',
      'A human reviewer must inspect the transcript before any formal decision.',
    ],
    retryPlan: improvements.slice(0, 3).map((item) => item.suggestion),
    overallConfidence: confidence,
    educationalDisclaimer: 'Automated formative evidence for coaching and human review; not a standalone employment, competency or clinical decision.',
    rubrics,
    goalCompletion: scenario.objectives.map((goal) => ({
      goal,
      status: hasAction || hasQuestion || hasAcknowledgement ? 'partial' : 'not-observed',
      evidence: 'Rule-based screening cannot confirm full goal completion; review the cited transcript evidence.',
    })),
    delivery,
    flags,
    coachingPlan: improvements.slice(0, 4).map((item) => item.suggestion),
    fallbackUsed: true,
  };
}

function averageRubrics(rubrics: RubricAssessment[], ids: string[]): number {
  const selected = rubrics.filter((item) => ids.includes(item.id));
  return selected.length ? clamp(selected.reduce((sum, item) => sum + item.score, 0) / selected.length) : 0;
}

function improvementFor(id: string): string {
  const suggestions: Record<string, string> = {
    'active-listening': 'Reflect one key concern, then ask a relevant follow-up question.',
    'respect-acknowledgement': 'Name the concern directly before moving to facts or solutions.',
    'clarity-structure': 'State the purpose, explain one point at a time, then check understanding.',
    'specificity-evidence': 'Use one observable example and explain its impact without a personal label.',
    'questioning-dialogue': 'Ask one open question and allow the other person to finish before responding.',
    'handling-resistance': 'Acknowledge the disagreement without defending yourself, then clarify the shared goal.',
    'accountability-fairness': 'State the expected standard while inviting relevant context and support needs.',
    'action-planning': 'Agree a specific action, owner and follow-up date before closing.',
    'professional-language': 'Replace fillers, profanity and vague labels with short, neutral descriptions.',
    'delivery-presence': 'Use shorter turns, leave deliberate pauses and avoid speaking over the other person.',
    'fact-based-feedback': 'Describe the documented behaviour and impact before discussing expectations.',
    'expectation-setting': 'Confirm the expected standard and a clear review point.',
    'emotional-safety': 'Acknowledge the emotional impact and pause before providing more information.',
    'understanding-check': 'Ask the person to explain what they understood or what questions remain.',
  };
  return suggestions[id] ?? 'Practise one specific communication behaviour in the next attempt.';
}

export function buildLearnerFeedback(
  admin: AdminEvaluation,
  previous?: AdminEvaluation | null,
  previousAttemptNumber?: number,
): LearnerFeedback {
  const sorted = [...admin.rubrics].sort((left, right) => left.score - right.score);
  const priorities: LearnerPriority[] = sorted.slice(0, 2).map((rubric, index) => {
    const improvement = admin.improvements.find((item) => item.suggestion === improvementFor(rubric.id)) ?? admin.improvements[index];
    return {
      turn: improvement?.turn ?? 1,
      moment: improvement?.moment ?? rubric.evidence[0]?.moment ?? 'No exact example was available.',
      suggestion: improvementFor(rubric.id),
      whyItMatters: rubric.rationale,
      tryInstead: improvementFor(rubric.id),
    };
  });
  const progress = previous && previousAttemptNumber
    ? compareProgress(admin.rubrics, previous.rubrics ?? [], previousAttemptNumber)
    : undefined;

  return {
    version: 2,
    headline: priorities[0] ? `Next focus: ${sorted[0].label}` : 'Review the evidence and choose one next step',
    summary: admin.summary,
    rubricSnapshot: admin.rubrics.slice(0, 8).map((item) => ({
      id: item.id,
      label: item.label,
      score: item.score,
      descriptor: item.score >= 8 ? 'Consistent' : item.score >= 5 ? 'Developing' : 'Needs attention',
    })),
    strengths: admin.strengths.slice(0, 2),
    priorities,
    nextAttemptPlan: admin.coachingPlan.slice(0, 3),
    ...(progress ? { progress } : {}),
    educationalDisclaimer: 'This automated formative review supports practice. A human reviewer should be consulted for formal decisions.',
  };
}

function compareProgress(current: RubricAssessment[], previous: RubricAssessment[], previousAttemptNumber: number) {
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const improved: string[] = [];
  const declined: string[] = [];
  const unchanged: string[] = [];
  for (const item of current) {
    const prior = previousById.get(item.id);
    if (!prior) continue;
    const delta = item.score - prior.score;
    if (delta >= 2) improved.push(item.label);
    else if (delta <= -2) declined.push(item.label);
    else unchanged.push(item.label);
  }
  return {
    previousAttemptNumber,
    improved,
    declined,
    unchanged,
    note: 'Score changes are indicators from two simulations, not proof of competence or decline.',
  };
}

export function mergeModelAdminEvaluation(
  raw: Record<string, unknown>,
  fallback: AdminEvaluation,
): AdminEvaluation {
  const rawRubrics = Array.isArray(raw.rubrics) ? raw.rubrics : [];
  const byId = new Map(rawRubrics.map((item) => {
    const value = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return [String(value.id ?? ''), value] as const;
  }));
  const rubrics = fallback.rubrics.map((item) => {
    const generated = byId.get(item.id);
    if (!generated) return item;
    const evidence = Array.isArray(generated.evidence)
      ? generated.evidence.slice(0, 3).map((entry) => {
          const value = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
          return {
            turn: Math.max(1, Math.round(Number(value.turn) || 1)),
            moment: quote(String(value.moment ?? 'Learner response')),
            observation: String(value.observation ?? item.rationale).slice(0, 500),
          };
        })
      : item.evidence;
    return {
      ...item,
      score: clamp(Number(generated.score) || item.score),
      rationale: String(generated.rationale ?? item.rationale).slice(0, 600),
      evidence,
    };
  });
  const sorted = [...rubrics].sort((left, right) => right.score - left.score);
  const strengths = sorted.filter((item) => item.evidence.length).slice(0, 3).flatMap((item) => item.evidence.slice(0, 1));
  const improvements = [...rubrics].sort((left, right) => left.score - right.score).slice(0, 4).map((item) => ({
    turn: item.evidence[0]?.turn ?? 1,
    moment: item.evidence[0]?.moment ?? 'Transcript evidence requires human review.',
    suggestion: improvementFor(item.id),
  }));
  return {
    ...fallback,
    factualSummary: String(raw.factualSummary ?? fallback.factualSummary).slice(0, 1600),
    summary: String(raw.summary ?? fallback.summary).slice(0, 1000),
    strengths,
    improvements,
    rubrics,
    retryPlan: improvements.slice(0, 3).map((item) => item.suggestion),
    coachingPlan: improvements.map((item) => item.suggestion),
    fallbackUsed: false,
  };
}
