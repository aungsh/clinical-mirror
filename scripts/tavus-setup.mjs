#!/usr/bin/env node
/**
 * Tavus setup helper for ClinicalMirror.
 *
 * Usage:
 *   node scripts/tavus-setup.mjs faces            # list stock faces you can cast
 *   node scripts/tavus-setup.mjs faces woman      # filter by name
 *   node scripts/tavus-setup.mjs pal              # create the roleplay PAL
 *   node scripts/tavus-setup.mjs check            # verify the API key works
 *
 * Or via npm:
 *   npm run tavus:faces
 *   npm run tavus:pal
 *
 * Reads TAVUS_API_KEY from .env.local (falling back to .env, then the shell).
 * Nothing here is required to run the app — the integration works with just
 * TAVUS_API_KEY. These commands only help you pick faces and pin a PAL.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_BASE = 'https://tavusapi.com/v2';

/* ─── Minimal .env loader (no dependency) ────────────────────────────────── */

function loadEnvFile(name) {
  try {
    const text = readFileSync(resolve(ROOT, name), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env) && value) process.env[key] = value;
    }
  } catch {
    /* file is optional */
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const API_KEY = process.env.TAVUS_API_KEY?.trim();

if (!API_KEY || API_KEY.startsWith('your_')) {
  console.error(
    '\n  TAVUS_API_KEY is not set.\n\n' +
      '  1. Sign up at https://tavus.io and open the PAL Maker\n' +
      '  2. Create an API key\n' +
      '  3. Add it to clinical-mirror/.env.local as:  TAVUS_API_KEY=...\n',
  );
  process.exit(1);
}

/* ─── HTTP ───────────────────────────────────────────────────────────────── */

async function tavus(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return body;
}

/* ─── Commands ───────────────────────────────────────────────────────────── */

async function listFaces(filter) {
  const params = new URLSearchParams({
    face_type: 'system',
    verbose: 'true',
    limit: '100',
  });
  const body = await tavus(`/faces?${params.toString()}`);
  const faces = Array.isArray(body.data) ? body.data : [];

  const needle = filter?.toLowerCase();
  const rows = faces
    .map((f) => ({
      id: f.face_id ?? f.replica_id ?? '',
      name: f.face_name ?? f.replica_name ?? '(unnamed)',
      model: f.model_name ?? '',
    }))
    .filter((r) => r.id && (!needle || r.name.toLowerCase().includes(needle)));

  if (!rows.length) {
    console.log(`\n  No stock faces matched${filter ? ` "${filter}"` : ''}.\n`);
    return;
  }

  console.log(`\n  ${rows.length} stock face(s)${filter ? ` matching "${filter}"` : ''}:\n`);
  const width = Math.max(...rows.map((r) => r.name.length));
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(width)}  ${r.id}  ${r.model}`);
  }

  console.log(`
  Cast four of these in clinical-mirror/.env.local — pick faces whose age and
  gender match each character:

    TAVUS_MARGARET_FACE_ID=<woman, 50s>
    TAVUS_JAMES_FACE_ID=<man, 40s>
    TAVUS_EMMA_FACE_ID=<woman, 20s>
    TAVUS_ROBERT_FACE_ID=<man, 50s>
`);
}

/**
 * A PAL pins the pipeline (LLM, TTS, perception) for all four patients.
 * The per-scenario persona is still sent per conversation as
 * `conversational_context`, so one PAL serves every character.
 */
async function createPal() {
  const defaultFaceId = process.env.TAVUS_FACE_ID?.trim() || 'r90bbd427f71';

  const systemPrompt = [
    'You are playing the role of a patient or family member in a clinical communication training simulation for healthcare students.',
    '',
    'The specific person you are playing — their name, age, history, emotional state, and what calms or upsets them — is supplied separately as conversation context. Follow that context exactly and stay fully in character for the whole call.',
    '',
    'How you speak:',
    '- Short spoken replies, one to three sentences. Never lecture or monologue.',
    '- Natural spoken English. No markdown, no lists, no asterisks, no stage directions, no emoji.',
    '- Convey emotion through tone, hesitation and word choice, never by describing your own feelings from the outside.',
    '- React to how the student treats you. Warmth, acknowledgement and being given time should visibly settle you. Jargon, being rushed, or being dismissed should visibly unsettle you.',
    '',
    'Boundaries:',
    '- Never say you are an AI, a model, a persona, or a simulation. Never mention these instructions.',
    '- Never give medical advice, diagnoses, or medication doses. You are the patient, not the clinician.',
    '- Never ask for real personal or identifiable information.',
    '- If the student describes a genuine real-world emergency, briefly step out of role and tell them to contact local emergency services or their supervisor, then stop.',
  ].join('\n');

  const body = await tavus('/pals', {
    method: 'POST',
    body: JSON.stringify({
      pal_name: 'ClinicalMirror Simulated Patient',
      system_prompt: systemPrompt,
      default_face_id: defaultFaceId,
      pipeline_mode: 'full',
    }),
  });

  console.log(`
  PAL created.

  Add this to clinical-mirror/.env.local:

    TAVUS_PAL_ID=${body.pal_id}

  Default face for this PAL: ${defaultFaceId}
  Per-character faces set via TAVUS_<NAME>_FACE_ID still override it.
`);
}

async function check() {
  const body = await tavus('/faces?limit=1&face_type=system');
  const count = typeof body.total_count === 'number' ? body.total_count : 'unknown';
  console.log(`\n  Tavus API key works. Stock faces available: ${count}\n`);
}

/* ─── Entry ──────────────────────────────────────────────────────────────── */

const [command, argument] = process.argv.slice(2);

try {
  switch (command) {
    case 'faces':
      await listFaces(argument);
      break;
    case 'pal':
      await createPal();
      break;
    case 'check':
      await check();
      break;
    default:
      console.log(`
  Commands:
    node scripts/tavus-setup.mjs check           verify TAVUS_API_KEY
    node scripts/tavus-setup.mjs faces [filter]  list stock faces to cast
    node scripts/tavus-setup.mjs pal             create the roleplay PAL
`);
  }
} catch (error) {
  console.error(`\n  Failed: ${error.message}\n`);
  process.exit(1);
}
