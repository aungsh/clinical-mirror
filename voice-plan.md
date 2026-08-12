# ClinicalMirror — Natural Patient Voice Upgrade Plan

## Objective

Upgrade ClinicalMirror's current patient voice experience from browser-only SpeechSynthesis to a **natural neural TTS layer using ElevenLabs**, while preserving the existing Gemini conversation architecture, static avatar system, emotion system, evaluation system, and browser TTS as an emergency fallback.

The current voice problems to solve are:

1. All patients sound too similar and monotonous.
2. Male scenarios currently use a female-sounding voice.
3. Emotional changes are not reflected naturally in the patient's voice.
4. Some current browser-generated audio contains undesirable robotic/static artifacts.

The desired result is:

- James sounds like a believable male patient in his 40s.
- Robert sounds like a believable mature male patient.
- Margaret sounds like a believable mature female patient.
- Emma sounds like a believable younger female patient.
- Voice delivery changes subtly with the patient's existing emotion and intensity.
- The voice and static avatar respond to the same patient state.
- ElevenLabs provides the primary TTS.
- Existing browser SpeechSynthesis remains the automatic fallback.
- Failure of TTS must never break the conversation itself.

---

# 1. Strict Scope

This task changes ONLY the patient TTS / voice layer.

DO NOT change:

- Gemini conversation generation;
- scenario definitions;
- scenario state logic;
- conversation history;
- evaluation/scoring;
- feedback generation;
- retry flow;
- static avatar architecture;
- emotion generation;
- intensity generation;
- authentication;
- database architecture;
- unrelated UI;
- unrelated components.

Do NOT add:

- HeyGen;
- Tavus;
- D-ID;
- voice cloning;
- real-time video avatars;
- face recognition;
- biometric processing;
- a new LLM;
- a second AI model for emotion classification.

Gemini remains responsible for the patient response text and the existing patient emotion/intensity state.

ElevenLabs is responsible only for turning the existing patient response into natural speech.

---

# 2. Target Architecture

The desired architecture is:

```text
                         Gemini
                           |
                           v
                  Patient response
                           |
                 +---------+---------+
                 |                   |
              emotion             intensity
                 |                   |
                 +---------+---------+
                           |
                     Patient State
                           |
                 +---------+---------+
                 |                   |
                 v                   v
          Static Avatar          TTS Layer
                 |                   |
        expression / glow       ElevenLabs
                                     |
                                     v
                                  audio
                                     |
                                     v
                              HTMLAudioElement
                                     |
                                     v
                               Patient speaks
```

The important rule is:
The avatar and voice must use the same existing patient emotion/intensity state.
Do not create a second emotion inference system.

---

# 3. Required External Setup

The ElevenLabs integration requires:

- an ElevenLabs account;
- an ElevenLabs API key;
- one usable voice ID for each patient.

The API key must remain server-side.

Use:
`ELEVENLABS_API_KEY=`

Do NOT use:
`NEXT_PUBLIC_ELEVENLABS_API_KEY=`

The API key must never be exposed to browser/client JavaScript.
Update `.env.example` with placeholders only.
Never commit the real API key.

---

# 4. Repository Inspection Before Editing

Before making any code changes:

1. Read this entire plan.
2. Run `git status`
3. Inspect the current TTS implementation.
4. Search the repository for:
   - `speechSynthesis`
   - `SpeechSynthesisUtterance`
   - `getVoices`
   - `speak(`
   - `cancel(`
   - `onstart`
   - `onend`
   - `onerror`
   - `isSpeaking`
5. Determine:
   - where patient speech currently happens;
   - where the patient response text is available;
   - how patient identity reaches the speech code;
   - how emotion reaches the speech code;
   - how intensity reaches the speech code;
   - how the static avatar's speaking state is controlled.
6. Inspect existing API route conventions before creating a new route.
7. Inspect existing environment-variable conventions.
8. Do not assume filenames or variable names from this plan. Adapt to the actual repository.

---

# 5. Baseline

Before editing, run:
```bash
npm run lint
npm run build
```
Record any pre-existing failures. Do not incorrectly attribute pre-existing issues to this feature.
Verify that the existing browser TTS path still works sufficiently to act as a fallback.

---

# 6. Create a Server-Side TTS Route

Create a minimal Next.js server-side route using the project's existing API conventions.
Preferred logical endpoint: `/api/tts`

The route should accept the minimum information needed to generate the patient's audio:
- patient identifier;
- response text;
- emotion;
- intensity.

The API route should:
- validate the request;
- resolve the patient voice configuration;
- resolve the emotion/intensity voice settings;
- call ElevenLabs using the server-side API key;
- return audio data in a browser-playable form;
- handle provider errors safely.

Do not put ElevenLabs credentials in client components.
Do not expose the API key in responses.

---

# 7. ElevenLabs Integration

Use the current ElevenLabs Text-to-Speech API compatible with the project's runtime.
Prefer a low-latency model appropriate for an interactive conversation.

Prioritize:
- naturalness;
- voice quality;
- emotional delivery;
- acceptable latency;
- reliability.

Do not integrate streaming video or other avatar products.

---

# 8. Patient Voice Profiles

Create a single centralized patient voice configuration.

Required patients:

**James**
- Target: male; approximately 40s; professional; controlled; becomes firmer and more urgent when angry; baseline rate approximately 0.98; naturally masculine delivery.

**Margaret**
- Target: mature female; approximately 50s; warm; measured; baseline rate approximately 0.94.

**Emma**
- Target: younger female; approximately late 20s; conversational; slightly lighter delivery; baseline rate approximately 1.02.

**Robert**
- Target: mature male; approximately late 50s; grounded; slightly slower; baseline rate approximately 0.90.

These are starting targets. Do not force pitch so aggressively that the result sounds artificial.
The actual ElevenLabs voice IDs must come from the team's available ElevenLabs voices.
Do not invent voice IDs.

---

# 9. Voice Configuration

Prefer configuration such as:
```text
ELEVENLABS_JAMES_VOICE_ID=
ELEVENLABS_MARGARET_VOICE_ID=
ELEVENLABS_EMMA_VOICE_ID=
ELEVENLABS_ROBERT_VOICE_ID=
```
If the project already has a better server-side configuration pattern, use that instead.
Do not scatter voice IDs across UI components.
The client should identify the patient; the server should resolve the voice configuration.

---

# 10. Emotion-to-Prosody Mapping

Reuse the existing patient emotion state.
Do NOT add another model or AI call to determine how the patient feels.

Use these as conservative starting behaviours:

- **neutral**: normal baseline speed; medium stability; neutral delivery.
- **calm**: slightly slower; steady delivery; slightly warm.
- **anxious**: slightly slower; slightly more expressive; subtle uncertainty.
- **sad**: slightly slower; softer delivery; restrained energy.
- **distressed**: moderate urgency; more expressive; still controlled.
- **angry**: slightly faster; firmer delivery; stronger emphasis; slightly lower/stronger vocal character where supported.
- **relieved**: slightly slower; softer; warmer; relaxed delivery.

Do not turn emotional states into caricatures.
The application is a healthcare communication simulator, so the patient should sound believable rather than theatrical.

---

# 11. Intensity

Reuse the existing intensity value. Do not redefine its meaning.
Use intensity to scale the emotional effect.

Recommended conceptual behaviour:
- **0–3**: very subtle
- **4–6**: moderate
- **7–10**: stronger but still realistic

Clamp intensity into the expected range if necessary.
Do not allow high intensity to create shouting, unnatural pitch shifts, or dramatic acting.

---

# 12. ElevenLabs Voice Settings

Start conservatively.
Suggested starting range:
- stability: approximately 0.50–0.60
- similarity_boost: approximately 0.70–0.80
- style: low/moderate
- speed: approximately 0.95–1.05

These values are starting points, not requirements.
The team should listen to actual generated samples and tune them.
Do not make all four patients use identical settings.
Voice identity primarily comes from the selected voice.
Emotion should come primarily from subtle prosody/settings.

---

# 13. Do Not Alter Spoken Text With Fake Emotion Tags

Do NOT transform the actual patient response into unnatural spoken instructions such as:
`[angrily] We've been waiting for hours.`
unless the selected ElevenLabs API/model explicitly supports a non-spoken control syntax.

Prefer provider voice settings and API controls.
The spoken content should remain exactly the patient's natural response unless an existing feature already performs safe formatting.

---

# 14. Audio Playback

When ElevenLabs succeeds:
```text
ElevenLabs -> audio response -> Blob / object URL -> HTMLAudioElement -> play()
```
Do not use `speechSynthesis.speak()` when ElevenLabs audio is available.
However, keep the existing browser TTS implementation as the fallback.

---

# 15. Speaking State

The existing avatar should remain synchronized with actual patient audio playback.

When the generated audio begins: `isSpeaking = true`
When playback ends: `isSpeaking = false`
If playback fails: `isSpeaking = false` -> fallback to browser TTS

Do not estimate speaking time based only on API response arrival.
Use actual audio playback events where possible.

---

# 16. Audio Cancellation

Ensure that only one patient response is speaking at a time.
If new patient audio arrives while previous audio is playing:
- stop previous audio;
- clean up any existing object URL where appropriate;
- reset the speaking state;
- start the new audio;
- maintain correct avatar state.

When the session ends:
- stop patient audio;
- reset speaking state;
- clean up audio resources.

Do not allow overlapping patient voices.

---

# 17. Browser TTS Fallback

This is mandatory.

- **Primary**: ElevenLabs
- **Fallback**: existing browser SpeechSynthesis

Fallback must happen if:
- ElevenLabs API key is missing;
- ElevenLabs request fails;
- request times out;
- ElevenLabs voice ID is invalid;
- ElevenLabs returns an unexpected response;
- browser audio playback fails;
- the user is offline;
- any non-recoverable client-side audio error occurs.

The conversation itself must never fail because TTS failed.
If ElevenLabs is unavailable, ClinicalMirror should continue using the existing browser voice.

---

# 18. Avoid Duplicate TTS Requests

Ensure each actual patient response is synthesized exactly once.
Avoid duplicate requests caused by:
- React re-renders;
- component remounts;
- effect dependency mistakes;
- React Strict Mode;
- unrelated state updates;
- avatar state changes.

Tie audio generation to the actual new patient conversation turn.
Do not put TTS generation in a component effect that can fire merely because the component re-rendered.

---

# 19. Audio Caching

A simple in-memory/session-level cache is acceptable.
A logical key can be: `patientId + responseText + emotion + intensityBucket`

The goal is to avoid regenerating the same audio unnecessarily.
Do NOT add a database.
Do NOT create persistent cloud storage solely for this feature.

Caching should improve:
- latency;
- reliability;
- API usage;
- consistency.

---

# 20. Loading State

While audio is being generated:
- show a subtle patient-state indicator if appropriate;
- do not block the whole application;
- do not show excessive loading UI.

The static avatar may remain on the current expression until the patient actually begins speaking.
Once audio begins, activate the speaking state.

---

# 21. Avatar + Voice Synchronization

The desired architecture is:
```text
                  patient emotion + intensity
                               |
                        +------+------+
                        |             |
                        v             v
                      Avatar         TTS
                        |             |
                   expression      prosody
                   glow            pacing
                   speaking        voice
```

Examples:
- **James + angry + high intensity**: angry portrait, stronger avatar emphasis, male voice, firmer delivery, slightly faster pace.
- **James + relieved + low intensity**: relieved portrait, softer avatar effect, male voice, calmer delivery, slightly slower pace.

This is one of the most important parts of the upgrade.
Do not create separate emotional state logic for the avatar and TTS.

---

# 22. James First

Implement and tune James before the other patients.
The main demo patient should support: `neutral -> concerned -> angry -> relieved`

Listen to actual generated audio for each state.
James must sound:
- clearly male;
- approximately 40s;
- professional;
- emotionally believable;
- not exaggerated;
- not robotic.

Do not proceed to full rollout until James is acceptable.

---

# 23. Robert

After James works, Robert should sound:
- clearly male;
- older/mature;
- grounded;
- slightly slower;
- casual but credible.

Do not simply reuse James's voice unless the available voice pool makes that necessary.
A shared voice is acceptable if voice quality is more important than uniqueness.

---

# 24. Margaret

Margaret should sound:
- mature female;
- calm;
- measured;
- warm;
- appropriate for a primary-school teacher scenario.

Do not make her overly cheerful.

---

# 25. Emma

Emma should sound:
- younger female;
- conversational;
- natural;
- appropriate for a patient in her late 20s.

Avoid exaggeratedly high pitch.

---

# 26. Audio Quality

Because the current system has static/robotic artifacts, verify the entire audio chain.
Check:
- generated ElevenLabs audio itself;
- browser playback;
- audio overlap;
- repeated playback;
- cancellation;
- speaker output.

Do not assume that all static is caused by TTS.
If the ElevenLabs-generated audio file is clean but browser playback still has artifacts, investigate playback/lifecycle issues instead of changing voice generation settings unnecessarily.

---

# 27. Test Matrix

**Patient identity:**
- James sounds male
- Robert sounds male
- Margaret sounds female
- Emma sounds female

**Emotion:**
- For James: neutral, concerned, angry, relieved
- For the remaining patients: neutral, at least one emotional state, relief/calm if used by scenario

**Behaviour:**
- speaking indicator starts with audio
- speaking indicator stops after audio
- audio does not overlap
- end session stops audio
- new patient response cancels previous audio
- retry works
- feedback works

---

# 28. Failure Testing

Explicitly test:
- missing ElevenLabs API key;
- invalid voice ID;
- ElevenLabs API error;
- ElevenLabs timeout;
- invalid response;
- audio playback failure;
- browser SpeechSynthesis fallback;
- repeated patient responses;
- rapid state updates;
- session termination during playback.

Every failure must degrade gracefully.

---

# 29. Environment Variables

Update `.env.example` with:
```text
ELEVENLABS_API_KEY=
ELEVENLABS_JAMES_VOICE_ID=
ELEVENLABS_MARGARET_VOICE_ID=
ELEVENLABS_EMMA_VOICE_ID=
ELEVENLABS_ROBERT_VOICE_ID=
```

If a feature flag is used, also document:
```text
NEXT_PUBLIC_ELEVENLABS_TTS=true
```

Never place actual secrets in `.env.example`.
Never commit `.env.local`, real API keys, or private voice credentials.

---

# 30. Feature Flag

Implement an emergency disable mechanism if consistent with the existing project configuration pattern.
Recommended: `NEXT_PUBLIC_ELEVENLABS_TTS=true`

Behaviour:
- `true` -> ElevenLabs primary -> browser TTS fallback
- `false` -> existing browser TTS directly

Keep the flag until after Hackathon Day. This is the emergency recovery switch.

---

# 31. Security

The ElevenLabs API key must never be sent to the browser.
Do not use `NEXT_PUBLIC_ELEVENLABS_API_KEY`.
Do not log the key.
Do not return it from any API response.
Do not put the key into client-side JavaScript.
Only send ElevenLabs the minimum data necessary for TTS.

---

# 32. Do Not Change Gemini

Gemini remains responsible for:
- patient response text;
- existing emotion;
- existing intensity;
- scenario behaviour.

Do not add a second LLM request.
Do not ask Gemini to generate separate voice scripts.
Do not rewrite patient responses purely to compensate for TTS.

---

# 33. Performance

Priorities:
- natural voice quality;
- correct patient identity;
- emotional consistency;
- reliable fallback;
- reasonable latency.

Avoid:
- duplicate API calls;
- unnecessary audio regeneration;
- blocking page rendering;
- large new client dependencies;
- repeated TTS on React re-renders.

---

# 34. Validation

Run:
```bash
npm run lint
npm run build
```
Fix all errors introduced by this feature.
Review the full git diff.
Confirm unrelated files were not modified.

---

# 35. Deployment

After local validation:
- configure ElevenLabs environment variables in the deployment environment;
- deploy through the existing deployment workflow;
- verify the deployed `/api/tts` route;
- test the actual application;
- test James thoroughly;
- test fallback;
- test voice + avatar synchronization.

Do not assume localhost behaviour matches the deployed environment.

---

# 36. Hackathon Demo

The intended demo sequence is:
```text
James neutral avatar + natural male voice
                   |
                   v
        Learner responds poorly
                   |
                   v
James becomes angry + voice becomes firmer/faster
                   |
                   v
      Learner responds empathetically
                   |
                   v
James becomes calmer + voice softens
                   |
                   v
            Feedback screen
```

The judge should be able to understand:
`Learner communication -> patient emotion -> patient face -> patient voice -> feedback`
without needing an explanation of the underlying API.

---

# 37. Git Commit Strategy

Prefer focused commits such as:
- `feat: add server-side ElevenLabs TTS route`
- `feat: add patient voice configuration`
- `feat: add emotion-aware voice settings`
- `feat: add generated audio playback`
- `feat: add browser TTS fallback`
- `feat: add voice feature flag`

Do not modify unrelated code.

---

# 38. Stop Conditions

Stop expanding the feature if:
- ElevenLabs breaks the existing conversation;
- audio playback becomes unreliable;
- response latency is unacceptable;
- deployment becomes unstable;
- browser fallback stops working;
- the change requires a major refactor;
- the provider/API is unavailable;
- the hackathon demo becomes less reliable than before.

If a stop condition happens:
- disable ElevenLabs using the feature flag;
- restore/verify browser TTS;
- ensure avatars, conversation, feedback and retry remain functional;
- leave the stable version intact.

A reliable demo is more important than a more advanced voice system.

---

# 39. Definition of Done

The implementation is complete only when:
- ElevenLabs is integrated server-side.
- API key remains private.
- Patient-specific voice configuration exists.
- James has an appropriate male voice.
- Robert has an appropriate male voice.
- Margaret has an appropriate mature female voice.
- Emma has an appropriate younger female voice.
- Emotion subtly affects vocal delivery.
- Intensity scales emotional delivery.
- Generated audio is played through HTML audio.
- Avatar speaking state follows actual audio playback.
- Overlapping audio is prevented.
- Existing browser TTS fallback works.
- Invalid/missing ElevenLabs configuration does not break the app.
- `.env.example` is updated.
- No secrets are committed.
- `npm run lint` passes.
- `npm run build` passes.
- Deployed application works.
- James demo is reliable.

---

# 40. Exact Execution Order

Follow this order:
1. Inspect existing TTS implementation
2. Establish baseline
3. Create server-side `/api/tts` route
4. Add ElevenLabs environment/configuration
5. Configure James voice
6. Implement ElevenLabs audio playback
7. Implement browser TTS fallback
8. Connect existing emotion/intensity
9. Synchronize avatar speaking state
10. Test James thoroughly
11. Configure Robert
12. Configure Margaret
13. Configure Emma
14. Test error/fallback cases
15. Run lint/build
16. Deploy
17. Test deployed site
18. Rehearse James demo

Do not integrate other TTS providers during this task.

---

# 41. Final Agent Instruction

Prioritize:
- naturalness;
- correct patient voice identity;
- emotion/prosody synchronization;
- clean audio playback;
- reliable fallback;
- minimal changes to the existing application.

ClinicalMirror is already a working educational prototype.
This task improves the voice layer only.
Do not rebuild ClinicalMirror.
Start by reading this file completely and inspecting the existing speech/TTS implementation before writing code.