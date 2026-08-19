import 'server-only';

import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type {
  AdminEvaluation,
  AvatarMode,
  LearnerFeedback,
  RubricOverride,
  SessionReview,
  Turn,
  UserRole,
} from '@/lib/types';

interface DatabaseGlobal {
  __clinicalMirrorDatabase?: DatabaseSync;
}

const databaseGlobal = globalThis as typeof globalThis & DatabaseGlobal;

function databasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  if (configured === ':memory:') return configured;
  if (configured && isAbsolute(configured)) return configured;
  const filename = configured?.replace(/^data[\\/]/, '') || 'clinical-mirror.db';
  return join(process.cwd(), 'data', filename);
}

function migrate(db: DatabaseSync) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      monthly_attempt_limit INTEGER NOT NULL DEFAULT 2,
      session_duration_minutes INTEGER NOT NULL DEFAULT 25,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS practice_sessions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scenario_id TEXT NOT NULL,
      scenario_title TEXT NOT NULL,
      avatar_mode TEXT NOT NULL,
      attempt_number INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_turns (
      id TEXT PRIMARY KEY,
      practice_session_id TEXT NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
      turn_index INTEGER NOT NULL,
      speaker TEXT NOT NULL CHECK (speaker IN ('student', 'patient')),
      text TEXT NOT NULL,
      emotion TEXT,
      intensity REAL,
      spoken_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      practice_session_id TEXT NOT NULL UNIQUE REFERENCES practice_sessions(id) ON DELETE CASCADE,
      learner_summary_json TEXT NOT NULL,
      admin_report_json TEXT NOT NULL,
      empathy_score INTEGER NOT NULL,
      clarity_score INTEGER NOT NULL,
      deescalation_score INTEGER NOT NULL,
      overall_confidence TEXT NOT NULL,
      evaluator_model TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_reviews (
      practice_session_id TEXT PRIMARY KEY REFERENCES practice_sessions(id) ON DELETE CASCADE,
      reviewer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      notes TEXT NOT NULL DEFAULT '',
      rubric_overrides_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      practice_session_id TEXT REFERENCES practice_sessions(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON practice_sessions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_practice_sessions_org ON practice_sessions(organization_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_turns_session ON conversation_turns(practice_session_id, turn_index);
    CREATE INDEX IF NOT EXISTS idx_audit_events_org ON audit_events(organization_id, created_at DESC);
  `);
}

export function getDatabase(): DatabaseSync {
  if (databaseGlobal.__clinicalMirrorDatabase) return databaseGlobal.__clinicalMirrorDatabase;

  const path = databasePath();
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  migrate(db);
  databaseGlobal.__clinicalMirrorDatabase = db;
  return db;
}

export interface StoredUser {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
}

interface UserRow {
  id: string;
  organization_id: string;
  organization_name: string;
  email: string;
  display_name: string;
  password_hash: string;
  role: UserRole;
  active: number;
}

function mapUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    role: row.role,
    active: row.active === 1,
  };
}

export function userCount(): number {
  const row = getDatabase().prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
  return Number(row.count);
}

export function findUserByEmail(email: string): StoredUser | null {
  const row = getDatabase().prepare(`
    SELECT u.id, u.organization_id, o.name AS organization_name, u.email,
           u.display_name, u.password_hash, u.role, u.active
    FROM users u
    JOIN organizations o ON o.id = u.organization_id
    WHERE u.email = ? COLLATE NOCASE
  `).get(email) as UserRow | undefined;
  return row ? mapUser(row) : null;
}

export function findUserBySessionTokenHash(tokenHash: string): StoredUser | null {
  const now = new Date().toISOString();
  const row = getDatabase().prepare(`
    SELECT u.id, u.organization_id, o.name AS organization_name, u.email,
           u.display_name, u.password_hash, u.role, u.active
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    JOIN organizations o ON o.id = u.organization_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
  `).get(tokenHash, now) as UserRow | undefined;
  return row ? mapUser(row) : null;
}

export function insertAuthSession(input: {
  userId: string;
  tokenHash: string;
  expiresAt: string;
}) {
  const now = new Date().toISOString();
  const db = getDatabase();
  db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(now);
  db.prepare(`
    INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), input.userId, input.tokenHash, input.expiresAt, now, now);
}

export function deleteAuthSession(tokenHash: string) {
  getDatabase().prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(tokenHash);
}

export function createOrganizationWithAdmin(input: {
  organizationName: string;
  adminName: string;
  email: string;
  passwordHash: string;
}): StoredUser {
  const db = getDatabase();
  const now = new Date().toISOString();
  const organizationId = randomUUID();
  const userId = randomUUID();

  db.exec('BEGIN IMMEDIATE');
  try {
    const existing = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
    if (Number(existing.count) > 0) throw new Error('Initial setup has already been completed.');

    db.prepare(`
      INSERT INTO organizations (id, name, monthly_attempt_limit, session_duration_minutes, created_at)
      VALUES (?, ?, 2, 25, ?)
    `).run(organizationId, input.organizationName, now);
    db.prepare(`
      INSERT INTO users (id, organization_id, email, display_name, password_hash, role, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'admin', 1, ?, ?)
    `).run(userId, organizationId, input.email, input.adminName, input.passwordHash, now, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return findUserByEmail(input.email)!;
}

export function createOrganizationUser(input: {
  organizationId: string;
  displayName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}): string {
  const now = new Date().toISOString();
  const id = randomUUID();
  getDatabase().prepare(`
    INSERT INTO users (id, organization_id, email, display_name, password_hash, role, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id,
    input.organizationId,
    input.email,
    input.displayName,
    input.passwordHash,
    input.role,
    now,
    now,
  );
  return id;
}

export interface AdminUserSummary {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  active: boolean;
  attempts: number;
  lastAttemptAt: string | null;
}

export function listOrganizationUsers(organizationId: string): AdminUserSummary[] {
  const rows = getDatabase().prepare(`
    SELECT u.id, u.display_name, u.email, u.role, u.active,
           COUNT(p.id) AS attempts, MAX(p.ended_at) AS last_attempt_at
    FROM users u
    LEFT JOIN practice_sessions p ON p.user_id = u.id
    WHERE u.organization_id = ?
    GROUP BY u.id
    ORDER BY u.role DESC, u.display_name ASC
  `).all(organizationId) as Array<{
    id: string;
    display_name: string;
    email: string;
    role: UserRole;
    active: number;
    attempts: number;
    last_attempt_at: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    active: row.active === 1,
    attempts: Number(row.attempts),
    lastAttemptAt: row.last_attempt_at,
  }));
}

export function getLatestUserScenarioEvaluation(
  userId: string,
  scenarioId: string,
): { attemptNumber: number; adminEvaluation: AdminEvaluation } | null {
  const row = getDatabase().prepare(`
    SELECT p.attempt_number, e.admin_report_json
    FROM practice_sessions p
    JOIN evaluations e ON e.practice_session_id = p.id
    WHERE p.user_id = ? AND p.scenario_id = ?
    ORDER BY p.ended_at DESC
    LIMIT 1
  `).get(userId, scenarioId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    attemptNumber: Number(row.attempt_number),
    adminEvaluation: normaliseAdminEvaluation(JSON.parse(String(row.admin_report_json)) as Record<string, unknown>),
  };
}

export function saveCompletedPracticeSession(input: {
  user: StoredUser;
  scenarioId: string;
  scenarioTitle: string;
  avatarMode: AvatarMode;
  turns: Turn[];
  learnerFeedback: LearnerFeedback;
  adminEvaluation: AdminEvaluation;
  evaluatorModel: string;
}): string {
  const db = getDatabase();
  const now = new Date();
  const sessionId = randomUUID();
  const firstTimestamp = input.turns[0]?.timestamp ?? now.getTime();
  const lastTimestamp = input.turns.at(-1)?.timestamp ?? now.getTime();
  const durationSeconds = Math.max(0, Math.round((lastTimestamp - firstTimestamp) / 1000));
  const attemptRow = db.prepare(`
    SELECT COUNT(*) AS count FROM practice_sessions WHERE user_id = ? AND scenario_id = ?
  `).get(input.user.id, input.scenarioId) as { count: number };
  const attemptNumber = Number(attemptRow.count) + 1;
  const createdAt = now.toISOString();

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`
      INSERT INTO practice_sessions (
        id, organization_id, user_id, scenario_id, scenario_title, avatar_mode,
        attempt_number, started_at, ended_at, duration_seconds, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      input.user.organizationId,
      input.user.id,
      input.scenarioId,
      input.scenarioTitle,
      input.avatarMode,
      attemptNumber,
      new Date(firstTimestamp).toISOString(),
      new Date(lastTimestamp).toISOString(),
      durationSeconds,
      createdAt,
    );

    const insertTurn = db.prepare(`
      INSERT INTO conversation_turns (
        id, practice_session_id, turn_index, speaker, text, emotion, intensity, spoken_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    input.turns.forEach((turn, index) => {
      insertTurn.run(
        randomUUID(),
        sessionId,
        index,
        turn.speaker,
        turn.text,
        turn.emotion ?? null,
        turn.intensity ?? null,
        new Date(turn.timestamp).toISOString(),
      );
    });

    db.prepare(`
      INSERT INTO evaluations (
        id, practice_session_id, learner_summary_json, admin_report_json,
        empathy_score, clarity_score, deescalation_score, overall_confidence,
        evaluator_model, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      sessionId,
      JSON.stringify(input.learnerFeedback),
      JSON.stringify(input.adminEvaluation),
      input.adminEvaluation.scores.empathy,
      input.adminEvaluation.scores.clarity,
      input.adminEvaluation.scores.deescalation,
      input.adminEvaluation.overallConfidence,
      input.evaluatorModel,
      createdAt,
    );
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return sessionId;
}

export interface AdminSessionSummary {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  scenarioId: string;
  scenarioTitle: string;
  avatarMode: AvatarMode;
  attemptNumber: number;
  endedAt: string;
  durationSeconds: number;
  scores: { empathy: number; clarity: number; deescalation: number };
}

export function listOrganizationSessions(organizationId: string): AdminSessionSummary[] {
  const rows = getDatabase().prepare(`
    SELECT p.id, p.user_id, u.display_name, u.email, p.scenario_id, p.scenario_title, p.avatar_mode,
           p.attempt_number, p.ended_at, p.duration_seconds,
           e.empathy_score, e.clarity_score, e.deescalation_score
    FROM practice_sessions p
    JOIN users u ON u.id = p.user_id
    JOIN evaluations e ON e.practice_session_id = p.id
    WHERE p.organization_id = ?
    ORDER BY p.ended_at DESC
    LIMIT 100
  `).all(organizationId) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.display_name),
    userEmail: String(row.email),
    scenarioId: String(row.scenario_id),
    scenarioTitle: String(row.scenario_title),
    avatarMode: String(row.avatar_mode) as AvatarMode,
    attemptNumber: Number(row.attempt_number),
    endedAt: String(row.ended_at),
    durationSeconds: Number(row.duration_seconds),
    scores: {
      empathy: Number(row.empathy_score),
      clarity: Number(row.clarity_score),
      deescalation: Number(row.deescalation_score),
    },
  }));
}

export function listUserSessions(userId: string): AdminSessionSummary[] {
  const rows = getDatabase().prepare(`
    SELECT p.id, p.user_id, u.display_name, u.email, p.scenario_id, p.scenario_title, p.avatar_mode,
           p.attempt_number, p.ended_at, p.duration_seconds,
           e.empathy_score, e.clarity_score, e.deescalation_score
    FROM practice_sessions p
    JOIN users u ON u.id = p.user_id
    JOIN evaluations e ON e.practice_session_id = p.id
    WHERE p.user_id = ?
    ORDER BY p.ended_at DESC
    LIMIT 20
  `).all(userId) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.display_name),
    userEmail: String(row.email),
    scenarioId: String(row.scenario_id),
    scenarioTitle: String(row.scenario_title),
    avatarMode: String(row.avatar_mode) as AvatarMode,
    attemptNumber: Number(row.attempt_number),
    endedAt: String(row.ended_at),
    durationSeconds: Number(row.duration_seconds),
    scores: {
      empathy: Number(row.empathy_score),
      clarity: Number(row.clarity_score),
      deescalation: Number(row.deescalation_score),
    },
  }));
}

export interface UserUsage {
  used: number;
  limit: number;
  remaining: number;
  windowDays: number;
}

export function getUserUsage(user: StoredUser): UserUsage {
  const limitRow = getDatabase().prepare(`
    SELECT monthly_attempt_limit AS attempt_limit
    FROM organizations
    WHERE id = ?
  `).get(user.organizationId) as { attempt_limit: number };
  const limit = Number(limitRow.attempt_limit);

  if (user.role === 'admin') {
    return { used: 0, limit, remaining: limit, windowDays: 30 };
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const usageRow = getDatabase().prepare(`
    SELECT COUNT(*) AS count
    FROM practice_sessions
    WHERE user_id = ? AND ended_at >= ?
  `).get(user.id, since) as { count: number };
  const used = Number(usageRow.count);
  return { used, limit, remaining: Math.max(0, limit - used), windowDays: 30 };
}

export interface AdminSessionDetail extends AdminSessionSummary {
  adminEvaluation: AdminEvaluation;
  learnerFeedback: LearnerFeedback;
  turns: Turn[];
  review: SessionReview | null;
}

export function getOrganizationSessionDetail(
  organizationId: string,
  sessionId: string,
): AdminSessionDetail | null {
  const row = getDatabase().prepare(`
    SELECT p.id, p.user_id, u.display_name, u.email, p.scenario_id, p.scenario_title, p.avatar_mode,
           p.attempt_number, p.ended_at, p.duration_seconds,
           e.empathy_score, e.clarity_score, e.deescalation_score,
           e.admin_report_json, e.learner_summary_json
    FROM practice_sessions p
    JOIN users u ON u.id = p.user_id
    JOIN evaluations e ON e.practice_session_id = p.id
    WHERE p.organization_id = ? AND p.id = ?
  `).get(organizationId, sessionId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const turnRows = getDatabase().prepare(`
    SELECT speaker, text, emotion, intensity, spoken_at
    FROM conversation_turns
    WHERE practice_session_id = ?
    ORDER BY turn_index ASC
  `).all(sessionId) as Array<Record<string, unknown>>;

  const reviewRow = getDatabase().prepare(`
    SELECT r.notes, r.rubric_overrides_json, r.updated_at, u.display_name AS reviewer_name
    FROM session_reviews r
    JOIN users u ON u.id = r.reviewer_user_id
    WHERE r.practice_session_id = ?
  `).get(sessionId) as Record<string, unknown> | undefined;

  const parsedAdmin = normaliseAdminEvaluation(JSON.parse(String(row.admin_report_json)) as Record<string, unknown>);
  const parsedLearner = normaliseLearnerFeedback(
    JSON.parse(String(row.learner_summary_json)) as Record<string, unknown>,
    parsedAdmin,
  );

  return {
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.display_name),
    userEmail: String(row.email),
    scenarioId: String(row.scenario_id),
    scenarioTitle: String(row.scenario_title),
    avatarMode: String(row.avatar_mode) as AvatarMode,
    attemptNumber: Number(row.attempt_number),
    endedAt: String(row.ended_at),
    durationSeconds: Number(row.duration_seconds),
    scores: {
      empathy: Number(row.empathy_score),
      clarity: Number(row.clarity_score),
      deescalation: Number(row.deescalation_score),
    },
    adminEvaluation: parsedAdmin,
    learnerFeedback: parsedLearner,
    turns: turnRows.map((turn) => ({
      speaker: String(turn.speaker) as Turn['speaker'],
      text: String(turn.text),
      timestamp: new Date(String(turn.spoken_at)).getTime(),
      ...(turn.emotion ? { emotion: String(turn.emotion) as Turn['emotion'] } : {}),
      ...(typeof turn.intensity === 'number' ? { intensity: turn.intensity } : {}),
    })),
    review: reviewRow ? {
      reviewerName: String(reviewRow.reviewer_name),
      notes: String(reviewRow.notes),
      overrides: JSON.parse(String(reviewRow.rubric_overrides_json)) as RubricOverride[],
      updatedAt: String(reviewRow.updated_at),
    } : null,
  };
}

export function getUserSessionDetail(userId: string, sessionId: string): AdminSessionDetail | null {
  const ownership = getDatabase().prepare(`
    SELECT organization_id FROM practice_sessions WHERE id = ? AND user_id = ?
  `).get(sessionId, userId) as { organization_id: string } | undefined;
  return ownership ? getOrganizationSessionDetail(ownership.organization_id, sessionId) : null;
}

export function saveSessionReview(input: {
  organizationId: string;
  sessionId: string;
  reviewerUserId: string;
  notes: string;
  overrides: RubricOverride[];
}) {
  const session = getDatabase().prepare(`
    SELECT id FROM practice_sessions WHERE id = ? AND organization_id = ?
  `).get(input.sessionId, input.organizationId);
  if (!session) throw new Error('Session not found.');
  const now = new Date().toISOString();
  getDatabase().prepare(`
    INSERT INTO session_reviews (
      practice_session_id, reviewer_user_id, notes, rubric_overrides_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(practice_session_id) DO UPDATE SET
      reviewer_user_id = excluded.reviewer_user_id,
      notes = excluded.notes,
      rubric_overrides_json = excluded.rubric_overrides_json,
      updated_at = excluded.updated_at
  `).run(
    input.sessionId,
    input.reviewerUserId,
    input.notes,
    JSON.stringify(input.overrides),
    now,
    now,
  );
  recordAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.reviewerUserId,
    sessionId: input.sessionId,
    action: 'session_review_saved',
    details: { overrideCount: input.overrides.length },
  });
}

export function recordAuditEvent(input: {
  organizationId: string;
  actorUserId: string;
  sessionId?: string;
  action: string;
  details?: Record<string, unknown>;
}) {
  getDatabase().prepare(`
    INSERT INTO audit_events (
      id, organization_id, actor_user_id, practice_session_id, action, details_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    input.organizationId,
    input.actorUserId,
    input.sessionId ?? null,
    input.action,
    JSON.stringify(input.details ?? {}),
    new Date().toISOString(),
  );
}

function normaliseAdminEvaluation(raw: Record<string, unknown>): AdminEvaluation {
  if (raw.version === 2 && Array.isArray(raw.rubrics)) return raw as unknown as AdminEvaluation;
  const legacyScores = raw.scores && typeof raw.scores === 'object'
    ? raw.scores as Record<string, unknown>
    : {};
  const empathy = Number(legacyScores.empathy) || 0;
  const clarity = Number(legacyScores.clarity) || 0;
  const deescalation = Number(legacyScores.deescalation) || 0;
  const emptyDelivery = {
    audioSignalsCaptured: false,
    speechDurationSeconds: 0,
    speakingSegments: 0,
    interruptions: 0,
    audioSampleCount: 0,
    averageAudioLevel: 0,
    peakAudioLevel: 0,
    learnerWordCount: 0,
    averageWordsPerTurn: 0,
    speakingSharePercent: 0,
    questionCount: 0,
    fillerCount: 0,
    hedgingCount: 0,
    profanityCount: 0,
    repeatedPhraseCount: 0,
    averageResponseIntervalSeconds: null,
    interpretation: 'Delivery metrics were not captured for this earlier report.',
  };
  return {
    version: 2,
    scores: { empathy, clarity, deescalation },
    factualSummary: String(raw.factualSummary ?? raw.summary ?? 'Earlier report; detailed factual summary unavailable.'),
    summary: String(raw.summary ?? 'Earlier report imported into the expanded report format.'),
    strengths: Array.isArray(raw.strengths) ? raw.strengths as AdminEvaluation['strengths'] : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements as AdminEvaluation['improvements'] : [],
    limitations: Array.isArray(raw.limitations) ? raw.limitations.map(String) : ['This earlier report used the legacy three-score format.'],
    retryPlan: Array.isArray(raw.retryPlan) ? raw.retryPlan.map(String) : [],
    overallConfidence: raw.overallConfidence === 'high' || raw.overallConfidence === 'moderate' ? raw.overallConfidence : 'low',
    educationalDisclaimer: String(raw.educationalDisclaimer ?? 'Automated formative feedback for human review.'),
    rubrics: [
      { id: 'respect-acknowledgement', label: 'Respect and acknowledgement', score: empathy, confidence: 'low', rationale: 'Imported from the legacy empathy score.', evidence: [] },
      { id: 'clarity-structure', label: 'Clarity and structure', score: clarity, confidence: 'low', rationale: 'Imported from the legacy clarity score.', evidence: [] },
      { id: 'handling-resistance', label: 'Handling resistance', score: deescalation, confidence: 'low', rationale: 'Imported from the legacy de-escalation score.', evidence: [] },
    ],
    goalCompletion: [],
    delivery: emptyDelivery,
    flags: [],
    coachingPlan: Array.isArray(raw.retryPlan) ? raw.retryPlan.map(String) : [],
    fallbackUsed: false,
  };
}

function normaliseLearnerFeedback(raw: Record<string, unknown>, admin: AdminEvaluation): LearnerFeedback {
  if (raw.version === 2 && Array.isArray(raw.rubricSnapshot)) return raw as unknown as LearnerFeedback;
  const focus = String(raw.focus ?? admin.improvements[0]?.suggestion ?? 'Choose one observable behaviour to practise next.');
  return {
    version: 2,
    headline: String(raw.headline ?? 'Review one priority for the next attempt'),
    summary: String(raw.whatWorked ?? admin.summary),
    rubricSnapshot: admin.rubrics.slice(0, 6).map((item) => ({
      id: item.id,
      label: item.label,
      score: item.score,
      descriptor: item.score >= 8 ? 'Consistent' : item.score >= 5 ? 'Developing' : 'Needs attention',
    })),
    strengths: admin.strengths.slice(0, 2),
    priorities: [{
      turn: admin.improvements[0]?.turn ?? 1,
      moment: admin.improvements[0]?.moment ?? 'Earlier report did not store a precise example.',
      suggestion: focus,
      whyItMatters: focus,
      tryInstead: String(raw.nextStep ?? focus),
    }],
    nextAttemptPlan: admin.retryPlan.slice(0, 3),
    educationalDisclaimer: String(raw.educationalDisclaimer ?? 'Automated formative feedback for practice and human review.'),
  };
}
