export type EmotionType =
  | 'neutral'
  | 'sad'
  | 'angry'
  | 'anxious'
  | 'distressed'
  | 'relieved'
  | 'calm';

export type PersonaRole = 'patient' | 'family' | 'colleague' | 'friend';

/**
 * An individual AI character that can participate in a scenario.
 */
export interface Persona {
  id: string;               // e.g. "robert_tan", "sarah_tan"
  name: string;
  age: number;
  role: PersonaRole;
  gender: 'male' | 'female';
  systemPrompt: string;     // Full AI instructions for this persona
  initialIntensity: number; // Starting emotional intensity 0.0–1.0
}

/**
 * What causes the session to advance from this segment to the next.
 * - turn_count:      advance after N AI responses in this segment
 * - intensity_below: advance once the active persona's intensity drops below threshold
 */
export type ProgressionCondition =
  | { type: 'turn_count'; maxTurns: number }
  | { type: 'intensity_below'; threshold: number };

/**
 * A single chapter / phase of a scenario.
 * Each segment has exactly one active persona and its own guidance.
 * Segments can represent different points in time — a follow-up weeks later,
 * a colleague debrief the same evening, or a phone call the next day.
 */
export interface Segment {
  id: string;
  title: string;                   // e.g. "Initial Consultation", "Follow-up · 2 weeks later"
  activePersonaId: string;         // Maps to Persona.id

  /**
   * When/where this segment takes place.
   * Shown in the transition overlay to set the scene before the segment begins.
   * e.g. "Consultation Room · Same session" or "Oncology Dept · 2 weeks later"
   */
  timeContext: string;

  // Per-segment guidance shown in the briefing panel during this segment
  clinicalContext: string;
  sessionGoal: string;
  objectives: string[];
  doList: string[];
  avoidList: string[];

  openingLine: string;             // The AI's first spoken line when segment starts

  progressionCondition: ProgressionCondition;
  nextSegmentId?: string;          // undefined = end of scenario
}

/**
 * The full scenario definition.
 */
export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  icon: string;

  // Shown on scenario card and in briefing
  patientBackground: string;

  /** Controls whether this scenario is playable or locked pending faculty review */
  availability?: 'available' | 'faculty-review';
  safetyNote?: string;

  // Global turn limit across ALL segments
  maxTotalTurns: number;

  // All personas that might appear
  personas: Record<string, Persona>;

  // All segments (may be 3, 4, 5 — whatever the clinical arc requires)
  segments: Record<string, Segment>;
  initialSegmentId: string;
}

// ─── Turn ───────────────────────────────────────────────────────────────────

export interface Turn {
  /** 'student' or a Persona id (e.g. 'robert_tan') */
  speakerId: string;
  text: string;
  emotion?: EmotionType;
  intensity?: number;
  timestamp: number;
  /** Which segment this turn belongs to */
  segmentId: string;
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export interface FeedbackScore {
  empathy: number;
  clarity: number;
  deescalation: number;
}

export interface FeedbackEvidence {
  turn: number;
  moment: string;
  observation: string;
}

export interface Improvement {
  turn: number;
  moment: string;
  suggestion: string;
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
