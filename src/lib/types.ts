export type AvatarMode = 'mii' | 'realistic' | 'tavus';

export type StockAvatarId = 'patient-a' | 'patient-b' | 'patient-c';

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
