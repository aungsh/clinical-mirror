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

export interface FeedbackResult {
  scores: FeedbackScore;
  summary: string;
  strengths: FeedbackEvidence[];
  improvements: Improvement[];
  limitations: string[];
  retryPlan: string[];
  overallConfidence: 'low' | 'moderate' | 'high';
  educationalDisclaimer: string;
}

export interface SessionData {
  scenario: Scenario;
  turns: Turn[];
  feedback: FeedbackResult;
}
