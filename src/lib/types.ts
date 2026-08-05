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
  icon: string; // emoji icon for the card
  systemPrompt: string;
  openingLine: string;
}

export interface FeedbackScore {
  empathy: number;
  clarity: number;
  deescalation: number;
}

export interface Improvement {
  moment: string;
  suggestion: string;
}

export interface FeedbackResult {
  scores: FeedbackScore;
  summary: string;
  strengths: string[];
  improvements: Improvement[];
}

export interface SessionData {
  scenario: Scenario;
  turns: Turn[];
  feedback: FeedbackResult;
}
