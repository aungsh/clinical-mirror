export type AvatarMode = 'mii' | 'realistic' | 'tavus';

export type StockAvatarId = 'patient-a' | 'patient-b' | 'patient-c';

export type UserRole = 'user' | 'admin';

/** Response from POST /api/tavus/conversation */
export interface TavusConversation {
  conversationId: string;
  conversationUrl: string;
  /** Only present when the Tavus room was created with require_auth. */
  meetingToken?: string;
  /** Display name of the Tavus face rendering this patient. */
  faceLabel: string;
}

export type TavusStatus =
  | 'idle'        // not started
  | 'creating'    // asking our API for a conversation
  | 'joining'     // joining the WebRTC room
  | 'waiting'     // joined, waiting for the replica to appear
  | 'live'        // replica video is streaming
  | 'ended'       // conversation finished
  | 'error';      // unrecoverable failure

export type EmotionType =
  | 'neutral'
  | 'sad'
  | 'angry'
  | 'anxious'
  | 'distressed'
  | 'relieved'
  | 'calm';

export interface Turn {
  speaker: 'student' | 'patient';
  text: string;
  emotion?: EmotionType;
  intensity?: number;
  timestamp: number;
  /** URL to a Wav2Lip-generated video clip, if realistic avatar mode was used */
  videoUrl?: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  patientName: string;
  patientAge: number;
  icon: string;
  openingLine: string;
  avatarVariant: 'margaret' | 'james' | 'emma' | 'robert';
  availability: 'available' | 'faculty-review';
  safetyNote?: string;

  // Briefing fields
  patientBackground: string;   // who this person is
  clinicalContext: string;     // what the student must know before starting
  sessionGoal: string;         // what success looks like
  objectives: string[];        // 2-3 learning objectives
  doList: string[];            // techniques to try
  avoidList: string[];         // common mistakes

  // Session config
  initialIntensity: number;    // patient starting intensity 0-1
  maxTurns: number;            // suggested session length (patient turns)
}

export interface FeedbackScore {
  empathy: number;
  clarity: number;
  deescalation: number;
}

export type EvaluationConfidence = 'low' | 'moderate' | 'high';

export interface DeliveryCapture {
  audioSignalsCaptured: boolean;
  speechDurationSeconds: number;
  speakingSegments: number;
  interruptions: number;
  audioSampleCount: number;
  averageAudioLevel: number;
  peakAudioLevel: number;
}

export interface DeliveryMetrics extends DeliveryCapture {
  learnerWordCount: number;
  averageWordsPerTurn: number;
  speakingSharePercent: number;
  questionCount: number;
  fillerCount: number;
  hedgingCount: number;
  profanityCount: number;
  repeatedPhraseCount: number;
  averageResponseIntervalSeconds: number | null;
  interpretation: string;
}

export interface RubricAssessment {
  id: string;
  label: string;
  score: number;
  confidence: EvaluationConfidence;
  rationale: string;
  evidence: FeedbackEvidence[];
  scenarioSpecific?: boolean;
}

export interface GoalAssessment {
  goal: string;
  status: 'observed' | 'partial' | 'not-observed';
  evidence: string;
}

export interface ReviewFlag {
  severity: 'information' | 'review';
  label: string;
  evidence: string;
  turn?: number;
  humanReviewRequired: boolean;
}

export interface LearnerPriority extends Improvement {
  whyItMatters: string;
  tryInstead: string;
}

export interface LearnerProgress {
  previousAttemptNumber: number;
  improved: string[];
  declined: string[];
  unchanged: string[];
  note: string;
}

export interface LearnerRubricSnapshot {
  id: string;
  label: string;
  score: number;
  descriptor: 'Needs attention' | 'Developing' | 'Consistent';
}

export interface Improvement {
  turn: number;
  moment: string;
  suggestion: string;
}

export interface FeedbackEvidence {
  turn: number;
  moment: string;
  observation: string;
}

export interface CoachingCheckpoint {
  observedStrength: FeedbackEvidence;
  focus: Improvement;
  tryNext: string;
  reflectionQuestion: string;
}

export interface FeedbackResult {
  scores: FeedbackScore;
  summary: string;
  strengths: FeedbackEvidence[];
  improvements: Improvement[];
  limitations: string[];
  retryPlan: string[];
  overallConfidence: EvaluationConfidence;
  educationalDisclaimer: string;
}

export interface LearnerFeedback {
  version: 2;
  headline: string;
  summary: string;
  rubricSnapshot: LearnerRubricSnapshot[];
  strengths: FeedbackEvidence[];
  priorities: LearnerPriority[];
  nextAttemptPlan: string[];
  progress?: LearnerProgress;
  educationalDisclaimer: string;
  /** Legacy fields are retained so old saved sessions remain readable. */
  whatWorked?: string;
  focus?: string;
  nextStep?: string;
}

export interface AdminEvaluation extends FeedbackResult {
  version: 2;
  factualSummary: string;
  rubrics: RubricAssessment[];
  goalCompletion: GoalAssessment[];
  delivery: DeliveryMetrics;
  flags: ReviewFlag[];
  coachingPlan: string[];
  fallbackUsed: boolean;
}

export interface RubricOverride {
  rubricId: string;
  score: number;
  rationale: string;
}

export interface SessionReview {
  reviewerName: string;
  notes: string;
  overrides: RubricOverride[];
  updatedAt: string;
}

export interface SessionData {
  scenario: Scenario;
  turns: Turn[];
  feedback: LearnerFeedback;
  sessionId?: string;
}
