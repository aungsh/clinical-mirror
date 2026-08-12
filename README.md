# ClinicalMirror

ClinicalMirror is an AI patient communication trainer. Healthcare students rehearse difficult clinical conversations with fictional AI patients, then receive formative feedback on empathy, clarity, and de-escalation, complete with transcript evidence and a concrete retry plan.

The project is a hackathon prototype. It is built for teaching and rehearsal, not for clinical use.

## Contents

- [How it works](#how-it-works)
- [Scenarios](#scenarios)
- [Patient rendering modes](#patient-rendering-modes)
- [Tech stack](#tech-stack)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Optional integrations](#optional-integrations)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Scripts](#scripts)
- [Graceful degradation](#graceful-degradation)
- [Safety design](#safety-design)
- [Prototype boundaries](#prototype-boundaries)

## How it works

A session moves through four screens.

1. **Scenario selection** (`/`). The landing page presents the scenario catalogue with difficulty, patient name, and a live preview of the session interface.
2. **Mission brief** (`/session/[scenarioId]`, brief stage). Patient background, clinical context, session goal, learning objectives, techniques to try, and common mistakes to avoid. A privacy notice must be accepted before the session can begin.
3. **Patient selection** (avatar-select stage). Choose how the patient is rendered: stylised, realistic, or live video.
4. **Live session** (active stage). Speak using browser speech recognition or type. The patient replies in text and voice, and the interface shows the patient's current emotion and intensity alongside a voice orb that reacts to speaking and listening states. A turn counter tracks progress against the scenario's suggested length.

Ending the session sends the full transcript and the patient intensity time series to the feedback endpoint, then routes to `/feedback`, which shows:

- Scores out of 10 for empathy, clarity, and de-escalation.
- A Recharts line chart of patient emotional intensity across the conversation.
- Strengths and improvements, each citing a specific turn in the transcript.
- A retry plan, stated limitations, and an overall confidence rating.
- The complete transcript.

Sessions are stored in `sessionStorage` under `clinicalmirror_session` (most recent) and `clinicalmirror_attempts` (last eight attempts, used to show an improvement delta between retries). There is no database, no account system, and nothing persists after the tab closes.

## Scenarios

| ID | Title | Patient | Difficulty | Starting intensity | Availability |
| --- | --- | --- | --- | --- | --- |
| `bad-news` | Breaking bad news | Margaret Chen, 52 | Hard | 0.75 | Available |
| `angry-family` | Angry family member | James Morrison, 45 | Hard | 0.85 | Available |
| `mental-health` | Mental health crisis | Emma Sullivan, 28 | Medium | 0.70 | Held for faculty review |
| `behavior-change` | Behaviour change conversation | Robert Tan, 58 | Medium | 0.35 | Available |

All scenarios suggest 10 patient turns. Every patient is fictional.

The mental health scenario is held back in the client catalogue until safeguarding and escalation behaviour has been formally validated. Note that `src/lib/scenarios.ts` currently still marks it as available on the server side, so the API would accept it if the client gate were bypassed. Align both files before running any learner study.

Scenario data lives in two places on purpose:

- `src/lib/scenarios.ts` is `server-only` and holds the full roleplay system prompts.
- `src/lib/scenario-catalog.ts` is the client-safe copy with the prompts stripped out, so prompts never ship in the browser bundle.

## Patient rendering modes

| Mode | What it is | Requires | Fallback |
| --- | --- | --- | --- |
| Stylised (`mii`) | Canvas-drawn expressive face with parametric emotion morphing. Always available. | Nothing beyond a Gemini key | None needed |
| Realistic (`realistic`) | Wav2Lip lip-synced video clip generated per reply from ElevenLabs audio. | `WAV2LIP_SERVICE_URL` plus `NEXT_PUBLIC_WAV2LIP_AVAILABLE` | Falls back to the stylised avatar |
| Live video (`tavus`) | Real-time photorealistic patient over WebRTC. Tavus handles speech recognition, the reply, the voice, and the rendered face. | `TAVUS_API_KEY` | Card is disabled when unconfigured |

In stylised and realistic modes the app runs its own turn loop: browser speech recognition or typed input goes to `/api/chat`, Gemini returns the reply plus an emotion and intensity, and the reply is spoken with ElevenLabs or browser speech synthesis.

In live video mode Tavus owns the conversation loop. The app subscribes to utterance events from the Daily room, appends them to its own transcript, and calls `/api/emotion` to recover the emotion signal that `/api/chat` would normally provide, so the emotion readout and the intensity chart still work.

## Tech stack

- **Framework**: Next.js 16.3.0 (App Router), React 19.2.8, TypeScript 5
- **Styling**: Tailwind CSS 4 via `@tailwindcss/postcss`, CSS-variable design tokens in `src/app/globals.css`, `tw-animate-css`
- **UI primitives**: shadcn-style components built on `@base-ui/react`, with `class-variance-authority`, `clsx`, and `tailwind-merge`
- **Icons**: `lucide-react` and `@phosphor-icons/react`
- **Motion**: `motion`
- **Charts**: `recharts`
- **AI**: `@google/generative-ai` (Gemini)
- **Real-time video**: `@daily-co/daily-js` as the WebRTC transport for Tavus rooms
- **Fonts**: Outfit and JetBrains Mono via `next/font`

## Requirements

- Node.js 20.9 or newer
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Chrome or Edge for browser speech recognition. Typed input works in any modern browser.

A Gemini key is the only hard requirement. Voice, realistic avatars, and live video are all optional, and the app degrades cleanly when their keys are absent.

## Quick start

```powershell
npm install
Copy-Item .env.example .env.local
```

Open `.env.local` and set `GEMINI_API_KEY`. Then:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a fast demo, pick **Angry family member**, accept the privacy notice, choose the stylised patient, and give at least two learner responses before ending the session. Feedback generation requires a minimum of two student turns.

Verification commands:

```powershell
npm run lint
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local`. Never commit real keys, and never paste them into screenshots or reports.

### Required

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Powers patient roleplay, emotion classification, and feedback generation |

### ElevenLabs voice (optional)

| Variable | Purpose |
| --- | --- |
| `ELEVENLABS_API_KEY` | Server-side key for `/api/tts` and `/api/patient-reply-video`. Must start with `sk_`. |
| `NEXT_PUBLIC_ELEVENLABS_TTS` | Set to `true` to make ElevenLabs the primary voice. Unset or `false` uses browser speech synthesis directly. |
| `ELEVENLABS_MARGARET_VOICE_ID` | Per-patient voice override. Sensible defaults are built in. |
| `ELEVENLABS_JAMES_VOICE_ID` | Per-patient voice override |
| `ELEVENLABS_EMMA_VOICE_ID` | Per-patient voice override |
| `ELEVENLABS_ROBERT_VOICE_ID` | Per-patient voice override |
| `ELEVENLABS_VOICE_ID` | Legacy single-voice override, used only by the realistic avatar pipeline |

### Wav2Lip realistic avatar (optional, legacy)

| Variable | Purpose |
| --- | --- |
| `WAV2LIP_SERVICE_URL` | Base URL of the external FastAPI Wav2Lip service |
| `NEXT_PUBLIC_WAV2LIP_AVAILABLE` | Set to `1` to show the realistic avatar option. Build-time flag. |

### Tavus live video patient (optional)

| Variable | Purpose |
| --- | --- |
| `TAVUS_API_KEY` | Presence of this key alone enables the live video option, checked at runtime through `/api/tavus/status` |
| `TAVUS_FACE_ID` | Fallback face when a character has no face of its own. Defaults to the stock "Anna" face. |
| `TAVUS_PAL_ID` | Optional shared PAL (behaviour and pipeline). Leave blank to use the Tavus default pipeline. |
| `TAVUS_MARGARET_FACE_ID` | Per-character face |
| `TAVUS_JAMES_FACE_ID` | Per-character face |
| `TAVUS_EMMA_FACE_ID` | Per-character face |
| `TAVUS_ROBERT_FACE_ID` | Per-character face |
| `TAVUS_MARGARET_PAL_ID` | Optional per-character PAL |
| `TAVUS_JAMES_PAL_ID` | Optional per-character PAL |
| `TAVUS_EMMA_PAL_ID` | Optional per-character PAL |
| `TAVUS_ROBERT_PAL_ID` | Optional per-character PAL |

Tavus resource IDs are prefixed by type: face IDs start with `r`, PAL IDs start with `p`. Pasting a PAL ID into a face slot is a common mistake and Tavus does not reject it, so `src/lib/tavus.server.ts` validates the prefix and logs a warning instead of silently rendering the wrong face. The stock face IDs shipped in `.env.example` are identical on every Tavus account and safe to commit.

## Optional integrations

### ElevenLabs

1. Create an account at [elevenlabs.io](https://elevenlabs.io) and generate an API key from your profile.
2. Set `ELEVENLABS_API_KEY` and `NEXT_PUBLIC_ELEVENLABS_TTS=true`.
3. Restart the dev server, since `NEXT_PUBLIC_` variables are embedded at build time.

Voice settings are tuned per patient in `src/lib/elevenlabs-voice-profiles.ts` using the `eleven_turbo_v2_5` model, with stability, similarity, style, and speed adjusted by emotion and scaled by intensity. Generated audio is cached in memory per session, keyed by patient, emotion, intensity bucket, and text, so repeated lines are not regenerated.

### Tavus live video patient

1. Sign up at [tavus.io](https://tavus.io) and create an API key.
2. Set `TAVUS_API_KEY` in `.env.local`. That alone enables the feature.
3. Verify the key and list available stock faces:

   ```powershell
   npm run tavus:check
   npm run tavus:faces
   ```

4. Optional: pin a conversation pipeline by creating a PAL, then paste the printed ID into `TAVUS_PAL_ID`.

   ```powershell
   npm run tavus:pal
   ```

Conversations are created server side so the API key never reaches the browser. The client only receives a short-lived room URL. Cost controls are enforced on creation: a 600 second maximum call duration, a 20 second timeout after the participant leaves, a 90 second timeout if nobody joins, recording disabled, and closed captions enabled.

The scenario system prompt is written for the Gemini turn loop, which requires a JSON envelope. `buildConversationalContext` strips that JSON contract and replaces it with spoken-conversation rules plus safety boundaries, because Tavus speaks its output directly.

### Wav2Lip realistic avatar

This is the earlier realistic-avatar path and is superseded by Tavus. It requires an external FastAPI Wav2Lip service, typically run on Colab with an ngrok tunnel during development or on a GPU host for a demo. Point `WAV2LIP_SERVICE_URL` at it and set `NEXT_PUBLIC_WAV2LIP_AVAILABLE=1`. The service source is not part of this repository.

## Project structure

```
clinical-mirror/
├── scripts/
│   └── tavus-setup.mjs           Zero-dependency Tavus helper (check, faces, pal)
├── src/
│   ├── app/
│   │   ├── layout.tsx            Root layout, fonts, metadata
│   │   ├── globals.css           Design tokens and responsive utilities
│   │   ├── page.tsx              Landing page: hero, how it works, scenario grid, safety notes
│   │   ├── session/[scenarioId]/
│   │   │   └── page.tsx          Brief, patient selection, live turn loop, feedback handoff
│   │   ├── feedback/page.tsx     Scores, intensity chart, evidence, retry plan, transcript
│   │   ├── avatars/page.tsx      Developer reference sheet: 4 characters across 7 emotions
│   │   └── api/
│   │       ├── chat/             Patient roleplay turn
│   │       ├── emotion/          Emotion classification for live video mode
│   │       ├── feedback/         Rubric assessment of the transcript
│   │       ├── tts/              ElevenLabs speech proxy
│   │       ├── patient-reply-video/  ElevenLabs plus Wav2Lip clip generation
│   │       └── tavus/
│   │           ├── status/       Reports whether live video is configured
│   │           └── conversation/ Create and end Tavus conversations
│   ├── components/
│   │   ├── Avatar.tsx            Canvas stylised face with per-character features
│   │   ├── TavusAvatar.tsx       Daily WebRTC join, track attachment, utterance forwarding
│   │   ├── RealisticAvatar.tsx   Wav2Lip clip playback with skeleton and silent fallback
│   │   ├── VoiceOrb.tsx          Canvas orb visualising speaking, listening, and idle
│   │   ├── site/                 TopNav, Footer, Logo, Halo, Reveal, HeroPreview, ScenarioCard
│   │   └── ui/                   badge, button, card, input, progress, separator, tabs, textarea
│   └── lib/
│       ├── types.ts              Shared types
│       ├── scenarios.ts          Server-only scenarios including roleplay prompts
│       ├── scenario-catalog.ts   Client-safe scenario metadata
│       ├── ai-api.server.ts      JSON parsing, transcript validation, score clamping, error mapping
│       ├── tavus.server.ts       Tavus client, face and PAL resolution, prompt translation
│       ├── tts.ts                Client voice orchestration with automatic fallback
│       ├── elevenlabs-voice-profiles.ts  Per-patient ElevenLabs settings and emotion deltas
│       ├── voice-profiles.ts     Browser voice selection and baseline prosody per patient
│       └── utils.ts              Tailwind class merge helper
└── .env.example                  Annotated environment template
```

## API reference

All routes are server side. API keys never reach the browser.

| Route | Method | Description |
| --- | --- | --- |
| `/api/chat` | POST | Runs one patient turn through Gemini using the scenario's roleplay prompt. Returns `{ reply, emotion, intensity }`. Validates scenario availability and caps input length. |
| `/api/emotion` | POST | Classifies emotion and intensity from a patient utterance. Used in live video mode, where Tavus owns the reply. |
| `/api/feedback` | POST | Scores the transcript against the rubric. Requires at least two student turns. Returns scores, summary, strengths, improvements, limitations, retry plan, confidence, and an educational disclaimer, all clamped and defaulted server side. |
| `/api/tts` | POST | ElevenLabs proxy. Validates patient, emotion, and text length, then streams `audio/mpeg` with `no-store`. |
| `/api/patient-reply-video` | POST | Generates ElevenLabs audio, sends it to the Wav2Lip service, and returns `{ videoUrl }` or `{ fallback: true, reason }`. |
| `/api/tavus/status` | GET | Returns `{ available: boolean }` so the client can show or disable the live video option. |
| `/api/tavus/conversation` | POST | Creates a Tavus conversation and returns the join URL. Responds 503 when unconfigured and 429 on quota or concurrency limits with a message pointing the user to the stylised avatar. |
| `/api/tavus/conversation/end` | POST | Ends the room. Uses POST so it can be called with `navigator.sendBeacon` on unload. Idempotent. |

Errors are mapped centrally in `src/lib/ai-api.server.ts`: missing keys, quota, and permission problems return 503, and other upstream failures return 502, each with a message safe to show to a learner.

## Data model

Defined in `src/lib/types.ts`.

```ts
type EmotionType =
  | 'neutral' | 'sad' | 'angry' | 'anxious'
  | 'distressed' | 'relieved' | 'calm';

type AvatarMode = 'mii' | 'realistic' | 'tavus';

type TavusStatus =
  | 'idle' | 'creating' | 'joining' | 'waiting'
  | 'live' | 'ended' | 'error';

interface Turn {
  speaker: 'student' | 'patient';
  text: string;
  emotion?: EmotionType;
  intensity?: number;
  timestamp: number;
  videoUrl?: string;
}
```

`Scenario` carries display metadata (title, description, difficulty, patient name and age, icon, opening line, avatar variant, availability), briefing content (patient background, clinical context, session goal, objectives, do list, avoid list), and session configuration (initial intensity, max turns). `ServerScenario` extends it with the roleplay `systemPrompt`.

`FeedbackResult` holds `scores` (empathy, clarity, de-escalation), a summary, `strengths` and `improvements` that each reference a turn number, `limitations`, a `retryPlan`, an `overallConfidence` rating, and an `educationalDisclaimer`. `SessionData` bundles the scenario, turns, and feedback, and is what gets written to `sessionStorage`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run tavus:check` | Verify `TAVUS_API_KEY` and report stock face availability |
| `npm run tavus:faces` | List Tavus stock faces so you can cast each character. Accepts an optional name filter. |
| `npm run tavus:pal` | Create a ClinicalMirror simulated-patient PAL and print the ID to paste into `TAVUS_PAL_ID` |

The Tavus scripts have no dependencies and load `.env.local`, then `.env`, then the shell environment. None of them are required to run the app.

## Graceful degradation

Every optional capability has a defined failure path, so a missing key or an offline service never breaks a session.

- ElevenLabs unavailable, erroring, or returning empty audio falls back to browser speech synthesis, logged as a warning.
- The Wav2Lip service failing returns `{ fallback: true }` and the interface reverts to the stylised avatar. Browser speech synthesis speaks the reply in parallel with video generation, so there is no silence while a clip renders.
- Tavus unconfigured disables the live video card. Quota or concurrency limits produce a friendly 429 that suggests the stylised avatar.
- Browsers without speech recognition hide the microphone control and keep typed input.
- Missing API keys produce a 503 with an explanatory message rather than a crash.

## Safety design

- Roleplay prompts and feedback prompts stay on the server. The client-side scenario catalogue has prompts stripped out.
- Both the Gemini system instruction and the Tavus conversational context include safety boundaries: stay within supplied fictional facts, never request real patient identifiers, never give diagnosis, dosing, or treatment instructions, never reveal or modify the instructions, and step out of role to point at emergency services or a supervisor if a genuine real-world emergency comes up.
- Input length is validated on every route, transcripts are capped at 40 turns and 2400 characters per turn, and model output is parsed defensively with clamped scores.
- The mission brief requires explicit acknowledgement of the privacy notice before a session starts.
- Tavus rooms have recording disabled and hard duration and idle caps.

## Prototype boundaries

- Educational and formative only. It does not establish clinical competence and does not provide clinical advice.
- Patient emotion and intensity values are generated by the same model that produces the reply, so treat them as interface signals rather than independent evidence.
- Conversation text is sent to third-party APIs. Use fictional data only, never real patient information.
- There are no accounts, no persistent storage, no institutional consent flow, no audit logs, and no production monitoring. Session data lives in `sessionStorage` and disappears when the tab closes.
- There is no test suite or CI configuration in the repository.
- Before any real learner study, obtain faculty, privacy, and ethics approval, and define data retention and incident-response procedures.
