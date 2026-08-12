# ClinicalMirror — Static Patient Avatar Implementation Plan

## Objective

Implement a **static patient portrait avatar system with emotion/expression changes** in the existing ClinicalMirror project.

The goal is to make the current clinical conversation experience more immersive for the Hackathon Day presentation **without changing the existing Gemini conversation logic, scoring/evaluation flow, voice flow, or scenario architecture**.

The avatar is a presentation-layer enhancement only.

---

# 1. Non-Negotiable Scope

Implement exactly this:

- One static patient portrait per scenario/patient.
- Four expression states:
  - `neutral`
  - `concerned`
  - `angry`
  - `relieved`
- Map the existing AI emotion values to those four visual states.
- Reuse the existing `emotion`, `intensity`, `isSpeaking`, and scenario/avatar data already present in the project.
- Add a smooth visual transition when the expression changes.
- Add a subtle speaking state.
- Keep the existing Mii/avatar implementation as a fallback.
- Make the feature easy to disable with a feature flag.
- Test **Angry Family Member / James** first before expanding to other scenarios.

Do NOT implement:

- Real-time AI video avatars.
- Face recognition.
- Face cloning.
- New AI providers.
- New database/schema.
- New authentication.
- New evaluation/scoring architecture.
- Changes to the Gemini prompt strategy unless strictly required for compatibility.
- Changes to the current feedback/rubric system.
- A redesign of the entire session page.
- Changes to `RealisticAvatar.tsx` or the existing video-avatar pipeline unless absolutely required for compilation compatibility.

---

# 2. Working Rules for the Agent

## Rule 1 — Inspect before editing

Before making changes:

1. Inspect the current repository structure.
2. Read:
   - `src/components/Avatar.tsx`
   - `src/components/RealisticAvatar.tsx`
   - `src/lib/types.ts`
   - `src/app/session/[scenarioId]/page.tsx`
   - Relevant scenario/config files.
3. Confirm how `emotion`, `intensity`, `isSpeaking`, and `avatarVariant` currently flow through the application.
4. Identify the exact current avatar render location in the session page.

Do not assume line numbers or component APIs. Use the actual current code.

## Rule 2 — Preserve existing behaviour

Do not modify working conversation behaviour unless required.

The following must continue working:

- Scenario selection.
- Gemini conversation.
- Conversation history.
- Text input.
- Browser speech/voice flow.
- Patient response generation.
- Emotion/intensity state.
- End-session flow.
- Feedback/evaluation.
- Retry flow.
- Existing avatar fallback.

## Rule 3 — Smallest viable change

Prefer adding a new component and minimal integration rather than rewriting existing components.

Avoid broad refactors.

## Rule 4 — Never leave the app broken between checkpoints

After each major implementation step, run the relevant validation command.

At minimum:

```bash
npm run lint
npm run build
```

If either fails because of the new work, fix it before proceeding.

---

# 3. Baseline Checkpoint

Before editing anything:

```bash
git status
git checkout main
git pull
git checkout -b feature/static-patient-avatars
```

Run:

```bash
npm install
npm run dev
```

Manually verify the current application works.

Then run:

```bash
npm run lint
npm run build
```

Record the baseline status.

If the repository is already failing before changes begin, document the existing failure and do not incorrectly attribute it to this feature.

---

# 4. Avatar Asset Structure

Create the following public asset structure:

```text
public/
└── avatars/
    ├── margaret/
    │   ├── neutral.png
    │   ├── concerned.png
    │   ├── angry.png
    │   └── relieved.png
    │
    ├── james/
    │   ├── neutral.png
    │   ├── concerned.png
    │   ├── angry.png
    │   └── relieved.png
    │
    ├── emma/
    │   ├── neutral.png
    │   ├── concerned.png
    │   ├── angry.png
    │   └── relieved.png
    │
    └── robert/
        ├── neutral.png
        ├── concerned.png
        ├── angry.png
        └── relieved.png
```

## Asset requirements

All portraits for a given patient should:

- depict the same person;
- use the same or nearly identical camera angle;
- use consistent lighting;
- use a consistent background;
- use consistent framing;
- differ primarily in facial expression.

Do not mix wildly different portrait styles.

For the first implementation checkpoint, only **James** is required:

```text
public/avatars/james/
├── neutral.png
├── concerned.png
├── angry.png
└── relieved.png
```

Do not block the software implementation on generating all 16 images.

Use placeholders if necessary while wiring the component.

---

# 5. Build `StaticPatientAvatar`

Create:

```text
src/components/StaticPatientAvatar.tsx
```

Do not replace `Avatar.tsx`.

The new component should be a standalone presentation component.

## Suggested input interface

Use the project's existing types where possible.

Conceptually, the component should accept:

```ts
type StaticPatientAvatarProps = {
  patientId: string;
  emotion?: EmotionType;
  intensity?: number;
  isSpeaking?: boolean;
};
```

Adapt this to the actual project types rather than duplicating existing types.

## Responsibilities

`StaticPatientAvatar` should:

1. Convert the incoming AI emotion to one of four expression states.
2. Build the appropriate asset path.
3. Render the corresponding patient portrait.
4. Apply a smooth transition when expression changes.
5. Apply a subtle intensity effect.
6. Show a subtle speaking state when `isSpeaking === true`.
7. Fall back to the neutral portrait if the requested asset is missing or unsupported.
8. Never throw because of an invalid emotion.

---

# 6. Emotion Mapping

Use the existing project emotion vocabulary.

Map it to the four visual states as follows:

```text
neutral    -> neutral
calm       -> neutral
anxious    -> concerned
sad        -> concerned
distressed -> concerned
angry      -> angry
relieved   -> relieved
```

If the project contains additional emotion values, map them conservatively to one of the four states rather than creating additional assets.

The mapping must be centralized in `StaticPatientAvatar.tsx` or a small nearby utility.

Do not duplicate the same mapping in multiple files.

---

# 7. Intensity Behaviour

Reuse the existing intensity value.

Do not change the meaning or scale of the existing intensity value.

Use intensity only for subtle visual treatment.

Recommended behaviour:

```text
low intensity
  -> little/no glow or pulse

medium intensity
  -> slightly stronger glow

high intensity
  -> stronger but still professional glow/pulse
```

Do not:

- shake the portrait;
- distort the face;
- apply cartoon effects;
- make the avatar visually overwhelming.

The product should still look like a professional healthcare training application.

Clamp intensity safely if necessary.

---

# 8. Speaking Behaviour

Reuse the existing `isSpeaking` state.

When the patient is speaking:

- show a subtle visual indicator around the portrait, OR
- add a small `Speaking...` label, OR
- use a restrained pulsing ring.

When the patient is not speaking, stop the speaking animation.

Do not implement lip-sync.

Do not implement video generation.

Do not add another audio provider.

Use the existing browser speech/TTS flow.

---

# 9. Expression Transitions

Do not abruptly replace the image.

Use a short crossfade.

Target:

```text
250–400ms
```

Use CSS transitions or the project's existing animation library if already appropriate.

Do not add a new animation dependency.

The transition should be:

- subtle;
- smooth;
- reliable;
- performant.

If crossfading two images is unnecessarily complex, use a single image with opacity transition, provided the result does not flicker.

---

# 10. Patient ID / Scenario Integration

Use the scenario's existing avatar variant/patient identifier.

The current scenario system already has scenario-specific avatar variants such as:

```text
margaret
james
emma
robert
```

Do not introduce a second patient-ID system.

The session page should pass the current scenario's patient/avatar identifier into the new component.

Conceptually:

```tsx
<StaticPatientAvatar
  patientId={scenario.avatarVariant}
  emotion={patientEmotion}
  intensity={patientIntensity}
  isSpeaking={isPatientSpeaking}
/>
```

Use the actual variable names from the current project.

Do not blindly copy this snippet if the current code differs.

---

# 11. Session Page Integration

The main session page is currently:

```text
src/app/session/[scenarioId]/page.tsx
```

Find the current avatar render.

Replace only the avatar rendering layer.

Do NOT restructure the entire page.

The desired relationship is:

```text
Existing session state
        |
        +--> Gemini / conversation
        |
        +--> emotion
        +--> intensity
        +--> speaking state
        |
        v
StaticPatientAvatar
```

The session page should continue to own conversation/session state.

The avatar component should not own Gemini calls.

The avatar component should not generate emotions.

The avatar component should not manage conversation state.

---

# 12. Feature Flag / Rollback Mechanism

Add a feature flag so the old avatar can be restored immediately.

Preferred approach:

```text
NEXT_PUBLIC_STATIC_AVATAR=true
```

Use the project's current environment/configuration conventions if they differ.

Fallback behaviour:

```text
static avatar enabled
    -> StaticPatientAvatar

static avatar disabled
    -> existing Avatar
```

The old avatar must remain available.

This is a hard requirement because the presentation is tomorrow.

Do not remove the fallback until after Hackathon Day.

If the static-avatar feature fails, the team must be able to disable it without code surgery.

---

# 13. First Functional Milestone — James Only

Before adding the other patients, make this scenario work end-to-end:

```text
Angry Family Member
        |
        v
James neutral portrait
        |
        v
AI changes emotion
        |
        v
James concerned/angry portrait
        |
        v
AI changes emotion again
        |
        v
James relieved portrait
```

Verify all of the following:

- Correct patient appears.
- Expression changes when emotion changes.
- No flicker.
- Speaking indicator works.
- Text conversation still works.
- Voice still works.
- Session can end.
- Feedback still appears.
- Retry still works.

Do not expand to all patients until this works.

---

# 14. Add Remaining Patients

Once James works, add:

```text
Margaret
Emma
Robert
```

using the same component.

Do not create separate components per patient.

Correct approach:

```text
StaticPatientAvatar
    |
    +-- margaret
    +-- james
    +-- emma
    +-- robert
```

Incorrect approach:

```text
MargaretAvatar
JamesAvatar
EmmaAvatar
RobertAvatar
```

---

# 15. Error Handling

The feature must fail gracefully.

## Missing asset

If:

```text
/avatars/james/angry.png
```

does not exist:

- display James neutral portrait;
- log a useful development warning if appropriate;
- do not crash the page.

## Missing emotion

If emotion is undefined/null/unknown:

```text
neutral
```

## Missing intensity

Default to a safe low/medium value.

## Missing patient ID

Use the existing avatar fallback if possible.

Do not show a broken image icon during the presentation.

---

# 16. Testing Checklist

## Functional

Test each scenario:

- [ ] Margaret
- [ ] James
- [ ] Emma
- [ ] Robert

Test each expression:

- [ ] neutral
- [ ] concerned
- [ ] angry
- [ ] relieved

Test states:

- [ ] patient speaking
- [ ] patient not speaking
- [ ] learner speaking
- [ ] low intensity
- [ ] medium intensity
- [ ] high intensity
- [ ] missing/unknown emotion
- [ ] missing avatar asset

## Existing functionality

Confirm:

- [ ] scenario selection works
- [ ] text input works
- [ ] voice input works where supported
- [ ] patient response generation works
- [ ] conversation history works
- [ ] end session works
- [ ] evaluation/feedback works
- [ ] retry works

## Visual

Check:

- [ ] portrait is correctly sized
- [ ] portrait does not break responsive layout
- [ ] emotion transitions are smooth
- [ ] speaking indicator is subtle
- [ ] no excessive animation
- [ ] no layout shift
- [ ] no visible broken images
- [ ] patient identity remains consistent

---

# 17. Validation Commands

Run:

```bash
npm run lint
npm run build
```

Fix all errors introduced by the change.

Warnings that are pre-existing may remain, but clearly distinguish them from new issues.

If the project has additional test commands, run the relevant ones.

---

# 18. Production/Deployment Test

After local validation:

1. Deploy the branch / merge through the project's normal workflow.
2. Open the actual deployed URL.
3. Test the **Angry Family Member** scenario on the deployed environment.
4. Test the avatar and expression changes.
5. Test the voice flow.
6. Test feedback.
7. Refresh the page.
8. Run the scenario again.

Do not assume localhost behaviour equals deployed behaviour.

---

# 19. Hackathon Demo Requirements

The intended demo scenario is:

## Angry Family Member — James

Demo sequence:

1. James starts neutral.
2. AI begins the difficult conversation.
3. Learner gives a weaker/dismissive response.
4. James becomes more concerned/angry.
5. Learner restarts or continues with a more empathetic response.
6. James becomes calmer/relieved.
7. End the session.
8. Show feedback.
9. Show retry recommendation.

The visual story should be:

```text
Learner words
    ↓
Patient reaction
    ↓
Visual emotional change
    ↓
Learner reflection
    ↓
Retry
```

Do not spend the live demo explaining implementation details.

---

# 20. Presentation Language

When presenting the new feature, describe it as:

> "We added a visual patient representation that reacts to the emotional state of the simulated patient, making the communication practice more immersive."

Do NOT describe it as:

- clinically validated emotion detection;
- real human emotion recognition;
- objective emotional measurement;
- a clinically accurate digital human.

The current emotion signal is AI-generated and is being used as a training/UI signal.

---

# 21. Safety / Scope Constraints

The system remains:

- educational;
- formative;
- based on fictional scenarios;
- not a clinical decision-support tool.

Do not introduce real patient information.

Do not add functionality that processes biometric data.

Do not implement face recognition.

Do not store facial data.

---

# 22. Git Commit Strategy

Use small commits.

Recommended:

```text
feat: add static patient avatar component
feat: integrate patient avatar into session
feat: add emotional expression transitions
feat: add patient avatar assets
feat: add static avatar feature flag
```

Do not squash everything into one giant commit until the feature is stable.

---

# 23. Stop Conditions

STOP expanding the feature if any of these occur:

- `npm run build` fails and cannot be fixed quickly.
- Existing conversation behaviour breaks.
- Voice functionality breaks.
- Feedback/evaluation breaks.
- Deployment becomes unstable.
- Avatar provider/API work becomes necessary.
- The implementation starts requiring changes to the Gemini conversation architecture.

At a stop condition:

1. Restore the last working commit.
2. Disable the static-avatar feature flag.
3. Ensure the original application works.
4. Keep the enhancement only if it is stable.

The primary objective is a reliable hackathon demo, not maximum feature count.

---

# 24. Final Definition of Done

The feature is DONE only when all of the following are true:

- [ ] Static patient portraits exist for the required demo patient.
- [ ] Emotion mapping works.
- [ ] Expression transitions work.
- [ ] Intensity affects visuals subtly.
- [ ] Speaking state works.
- [ ] Existing conversation logic is unchanged.
- [ ] Existing feedback flow is unchanged.
- [ ] Existing voice flow is unchanged.
- [ ] Old avatar is available as fallback.
- [ ] Feature flag can disable the new avatar.
- [ ] Angry Family Member demo works end-to-end.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Deployed site works.
- [ ] No broken image state is visible.
- [ ] No real patient data is used.
- [ ] No face recognition or biometric processing was added.

---

# 25. Recommended Implementation Order

Execute in this exact order:

```text
1. Inspect current avatar/session architecture
        ↓
2. Establish clean baseline
        ↓
3. Create James portrait assets
        ↓
4. Implement StaticPatientAvatar.tsx
        ↓
5. Add emotion mapping
        ↓
6. Add intensity treatment
        ↓
7. Add speaking state
        ↓
8. Integrate into session page
        ↓
9. Add feature flag/fallback
        ↓
10. Test Angry Family Member end-to-end
        ↓
11. Run lint/build
        ↓
12. Add Margaret/Emma/Robert assets
        ↓
13. Test all scenarios
        ↓
14. Deploy
        ↓
15. Test deployed site
        ↓
16. Rehearse demo
```

Do not change this order unless blocked by a concrete repository issue.

---

# 26. Final Agent Instruction

Prioritize **stability, minimal changes, and demo reliability** over ambition.

The existing ClinicalMirror application is already functional.

The task is to make the patient feel more present, not to rebuild ClinicalMirror.

The desired final experience is:

> **The learner talks to the patient, the patient visibly reacts, and the learner sees the consequence of their communication.**

Keep the implementation small, reversible, and compatible with the existing application.
