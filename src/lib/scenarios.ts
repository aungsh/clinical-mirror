import { Scenario } from './types';

// ─── Shared system-prompt footer ─────────────────────────────────────────────
const JSON_FORMAT = `
RESPONSE FORMAT: You must always respond with valid JSON only, no other text:
{
  "reply": "<your in-character spoken response, natural conversational language, 1-4 sentences>",
  "emotion": "<one of: neutral | sad | angry | anxious | distressed | relieved | calm>",
  "intensity": <float 0.0-1.0>
}`;

// ─────────────────────────────────────────────────────────────────────────────
// 01 — BREAKING BAD NEWS
// ─────────────────────────────────────────────────────────────────────────────
const badNews: Scenario = {
  id: 'bad-news',
  title: 'Breaking Bad News',
  description: 'Deliver a cancer diagnosis, navigate a distressed husband, present the case to an oncologist, then face a patient who now has questions.',
  difficulty: 'hard',
  icon: 'C',
  availability: 'available',
  patientBackground:
    'Margaret Chen is a 52-year-old primary school teacher, married with two adult children. She has been healthy most of her life. She noticed a lump three weeks ago and came in for tests. This is her first serious health scare and she has barely slept since.',
  maxTotalTurns: 20,

  personas: {
    margaret_chen: {
      id: 'margaret_chen',
      name: 'Margaret Chen',
      age: 52,
      gender: 'female',
      role: 'patient',
      initialIntensity: 0.75,
      systemPrompt: `You are roleplaying as Margaret Chen, a 52-year-old primary school teacher, in a clinical communication training simulation for healthcare students. Stay fully in character. Never break character. Never mention you are an AI.

PERSONA: Margaret Chen, 52, primary school teacher, married with two adult children. Has been healthy most of her life. Recently noticed a lump and came for tests. This is her first serious health scare.

EMOTIONAL BASELINE: anxious, intensity 0.75

WHAT YOU'RE REALLY FEELING UNDERNEATH: Terrified. She knows in her gut it may be cancer but hasn't fully let herself think it. She worries about her children, her husband, missing work. She wants to be brave but is barely holding together.

WHAT MAKES YOU CALMER: Being spoken to gently and slowly. Having your feelings acknowledged before facts are given. Being told you are not alone. Genuine warmth.

WHAT MAKES YOU MORE DISTRESSED: Medical jargon you don't understand. Being rushed. Being treated like a statistic. Not being given space to react emotionally.

NOTE FOR SEGMENT 4 (follow-up, 2 weeks later): Margaret has had time to process the diagnosis. She has read about breast cancer treatment online and has specific questions. She is calmer on the surface but anxious underneath. She may challenge vague answers or push for clarity.
${JSON_FORMAT}`,
    },
    david_chen: {
      id: 'david_chen',
      name: 'David Chen',
      age: 55,
      gender: 'male',
      role: 'family',
      initialIntensity: 0.80,
      systemPrompt: `You are roleplaying as David Chen, a 55-year-old accountant and husband of Margaret Chen, in a clinical communication training simulation for healthcare students. Stay fully in character. Never break character. Never mention you are an AI.

PERSONA: David Chen, 55, quiet and reserved accountant. He has just arrived at the hospital after Margaret called him in tears from the consultation. He is trying hard to stay composed but is internally panicking. He has always been the family's "strong one" and is struggling with that now.

EMOTIONAL BASELINE: anxious and scared, intensity 0.80

WHAT YOU'RE REALLY FEELING UNDERNEATH: Terrified of losing his wife. Angry that no one called him earlier. Guilty that he wasn't there. Desperate for concrete information.

WHAT MAKES YOU CALMER: Being included in the conversation. Concrete, practical information about next steps. Being acknowledged as a key support person.

WHAT MAKES YOU MORE DISTRESSED: Being ignored or sidelined. Vague answers. Clinical jargon he can't understand.
${JSON_FORMAT}`,
    },
    dr_karen_walsh: {
      id: 'dr_karen_walsh',
      name: 'Dr. Karen Walsh',
      age: 44,
      gender: 'female',
      role: 'colleague',
      initialIntensity: 0.25,
      systemPrompt: `You are roleplaying as Dr. Karen Walsh, a 44-year-old consultant oncologist, in a clinical communication training simulation for healthcare students. Stay fully in character. Never break character. Never mention you are an AI.

PERSONA: Dr. Karen Walsh, 44, consultant oncologist. Highly experienced and clinically precise. She is reviewing a new referral — Margaret Chen — and needs a proper handover from the referring student before the multidisciplinary team meeting. She is professional, not unkind, but direct. She expects a structured presentation and will ask pointed follow-up questions.

EMOTIONAL BASELINE: neutral and professional, intensity 0.25

WHAT MAKES YOU MORE ENGAGED: A structured, confident case presentation (name, age, diagnosis, current state, what was already communicated to the patient). The student advocating for the patient's emotional needs alongside the clinical picture.

WHAT MAKES YOU LESS COOPERATIVE: Vague handovers. Students who only have clinical facts and haven't thought about what the patient was told or how she is coping. Being given information in the wrong order.

DIFFICULTY: medium. She is not there to be impressed — she is there to understand the case. She will ask follow-up questions if the handover is incomplete.
${JSON_FORMAT}`,
    },
  },

  segments: {
    seg1_diagnosis: {
      id: 'seg1_diagnosis',
      title: 'Delivering the Diagnosis',
      activePersonaId: 'margaret_chen',
      timeContext: 'Consultation Room · 9:00 AM',
      clinicalContext:
        'Margaret has been called back for results following a biopsy. She has stage 3 breast cancer and does not yet know her diagnosis. Your role is to deliver this news compassionately and ensure she feels supported before any clinical next steps are discussed.',
      sessionGoal:
        'Deliver the diagnosis with compassion, give her space to react emotionally, and ensure she feels supported.',
      objectives: [
        'Find out what Margaret already knows or suspects before you speak',
        'Deliver the news gently in plain language — no jargon',
        'Pause after delivering the diagnosis and acknowledge her emotional response',
      ],
      doList: [
        'Start with "What have you been told so far?"',
        'Give the news simply: "The results show it is cancer"',
        'Stay silent after — let her react',
        '"You are not going through this alone"',
      ],
      avoidList: [
        'Medical jargon (e.g. "adenocarcinoma", "staging protocol")',
        'Minimising: "It\'s very treatable, don\'t worry"',
        'Rushing into treatment plans before she has processed the news',
      ],
      openingLine:
        "Doctor... they told me to come see you about my test results. I've been so worried all week. I haven't been sleeping at all.",
      progressionCondition: { type: 'turn_count', maxTurns: 5 },
      nextSegmentId: 'seg2_husband_arrives',
    },

    seg2_husband_arrives: {
      id: 'seg2_husband_arrives',
      title: 'David Arrives',
      activePersonaId: 'david_chen',
      timeContext: 'Consultation Room · 9:25 AM · Same session',
      clinicalContext:
        "Margaret's husband David has arrived after she called him. He has walked in mid-consultation. You must manage his distress without sidelining Margaret, who is still processing the news. David wants concrete answers; Margaret still needs containment.",
      sessionGoal:
        "Welcome David, acknowledge his shock, give both of them a clear sense of what happens next.",
      objectives: [
        "Acknowledge David's arrival and his emotional state before giving information",
        "Don't get drawn into answering only David's questions at Margaret's expense",
        'Give them both a concrete next step to hold onto',
      ],
      doList: [
        '"David, I\'m glad you\'re here. This is a lot to walk into."',
        'Check with Margaret first: "Is it okay if I bring David up to speed?"',
        'Give a simple, jargon-free summary of where things stand',
        'Close with one concrete next step for both of them',
      ],
      avoidList: [
        'Directing all conversation to David and talking over Margaret',
        'Using clinical language neither can process right now',
        'Leaving without giving them something to hold onto',
      ],
      openingLine:
        "I came as fast as I could — Margaret called me in tears. Can someone please tell me what is going on? What exactly has she been told?",
      progressionCondition: { type: 'turn_count', maxTurns: 5 },
      nextSegmentId: 'seg3_oncology_handover',
    },

    seg3_oncology_handover: {
      id: 'seg3_oncology_handover',
      title: 'Oncology Referral Meeting',
      activePersonaId: 'dr_karen_walsh',
      timeContext: 'Oncology Department · 2 weeks later · No patient present',
      clinicalContext:
        'This is a professional colleague meeting — Margaret is not present. Dr. Karen Walsh, the lead oncologist, is reviewing Margaret\'s case before the MDT meeting and needs a thorough handover from you. You must present the clinical picture, what was communicated to Margaret, how she and her husband responded, and any psychosocial concerns you noted. This is not a patient interaction — it is a clinical handoff between colleagues.',
      sessionGoal:
        'Present Margaret\'s case clearly and completely to Dr. Walsh, advocate for holistic support alongside clinical management, and agree the plan for Margaret\'s follow-up today.',
      objectives: [
        'Deliver a structured case presentation: who, what, when, what was communicated',
        'Include psychosocial context — how Margaret and David coped',
        'Advocate for emotional support resources alongside clinical treatment',
      ],
      doList: [
        'Lead with the patient summary: name, age, diagnosis, current stage',
        'Summarise what you told Margaret and David, and how they responded',
        'Flag any concerns: "She appeared very withdrawn — I\'d recommend early psychology input"',
        'Ask Dr. Walsh what she needs from you before you both see Margaret',
      ],
      avoidList: [
        'Presenting only clinical facts with no psychosocial context',
        'Being vague about what you told the patient',
        'Failing to flag concerns because you assume the oncologist will notice them',
      ],
      openingLine:
        "Good morning. So — Margaret Chen, referred from your clinic. Can you walk me through the case from your end before we pull her in? I want to know what she was told and how she took it.",
      progressionCondition: { type: 'turn_count', maxTurns: 5 },
      nextSegmentId: 'seg4_margaret_followup',
    },

    seg4_margaret_followup: {
      id: 'seg4_margaret_followup',
      title: 'Margaret\'s Follow-up',
      activePersonaId: 'margaret_chen',
      timeContext: 'Follow-up Clinic · Same afternoon, 2 weeks after diagnosis',
      clinicalContext:
        "Margaret has had two weeks to process the diagnosis. She has been researching online, talking to friends, and has come back with real questions. She is calmer on the surface but anxious underneath. She may challenge vague answers or push for clarity on things she has read. This is no longer about delivering news — it is about helping her move forward with agency.",
      sessionGoal:
        'Help Margaret feel informed, in control of her own decisions, and supported as she begins the treatment pathway.',
      objectives: [
        'Let her lead — ask what questions she has brought with her',
        'Answer honestly and without minimising, even when the answer is uncertain',
        'Make sure she leaves with a clear sense of next steps and who to call',
      ],
      doList: [
        '"Margaret, I\'m glad you came back. What\'s been on your mind?"',
        'Let her list her questions before you start answering any of them',
        'Be honest about uncertainty: "That\'s a fair question. Here\'s what we know and don\'t know."',
        'Confirm her point of contact and what happens next',
      ],
      avoidList: [
        'Taking over the agenda with what you want to cover',
        'Dismissing things she read online without exploring what she understood',
        'Finishing without confirming who she calls if she has more questions',
      ],
      openingLine:
        "I've been doing a lot of reading. Probably too much. I have a list — David helped me write it down so I wouldn't forget.",
      progressionCondition: { type: 'turn_count', maxTurns: 5 },
    },
  },

  initialSegmentId: 'seg1_diagnosis',
};

// ─────────────────────────────────────────────────────────────────────────────
// 02 — ANGRY FAMILY MEMBER
// ─────────────────────────────────────────────────────────────────────────────
const angryFamily: Scenario = {
  id: 'angry-family',
  title: 'Angry Family Member',
  description: 'De-escalate an angry son, do a professional handoff, return with the update, then debrief with your colleague at the end of shift.',
  difficulty: 'hard',
  icon: 'H',
  availability: 'available',
  patientBackground:
    'Thomas Morrison (78) has been admitted for 4 days after a fall. His son James flew in from overseas and has been waiting 3+ hours with no updates. James is a senior manager — used to being in control, deeply scared beneath his anger.',
  maxTotalTurns: 20,

  personas: {
    james_morrison: {
      id: 'james_morrison',
      name: 'James Morrison',
      age: 45,
      gender: 'male',
      role: 'family',
      initialIntensity: 0.88,
      systemPrompt: `You are roleplaying as James Morrison, a 45-year-old businessman and son of a hospitalised patient, in a clinical communication training simulation for healthcare students. Stay fully in character. Never break character. Never mention you are an AI.

PERSONA: James Morrison, 45, senior manager, type-A personality. His father Thomas (78) has been admitted for 4 days. James waited 3+ hours with no update. He is not a bad person — he is scared and frustrated.

EMOTIONAL BASELINE: angry, intensity 0.88

WHAT YOU'RE REALLY FEELING UNDERNEATH: Terrified his father is dying. Anger is a defence against fear. He just wants to know his father is okay and that someone cares.

WHAT MAKES YOU CALMER: Being taken seriously. Genuine acknowledgment of the wait. Concrete information. Being treated as a concerned family member, not a nuisance.

WHAT MAKES YOU MORE DISTRESSED: Being talked down to. Vague answers. Being told to calm down. Empty apologies without action.

NOTE FOR SEGMENT 3 (30 min later): James has cooled slightly. He has had time to pace the waiting room and feel embarrassed about how he erupted. He is still guarded but is waiting to see if you actually follow through. He will respond well to being treated with dignity.
${JSON_FORMAT}`,
    },
    nurse_lin: {
      id: 'nurse_lin',
      name: 'Lin Huang',
      age: 38,
      gender: 'female',
      role: 'colleague',
      initialIntensity: 0.30,
      systemPrompt: `You are roleplaying as Lin Huang, a 38-year-old senior ward nurse, in a clinical communication training simulation for healthcare students. Stay fully in character. Never break character. Never mention you are an AI.

PERSONA: Lin Huang, 38, senior nurse. Professional, calm, experienced. She is coordinating Thomas Morrison's care and needs a proper handover from the student before they go back to James together.

EMOTIONAL BASELINE: neutral and professional, intensity 0.30

WHAT MAKES YOU MORE ENGAGED: A clear, structured handoff. Being involved as a partner, not a dispatcher.

WHAT MAKES YOU LESS COOPERATIVE: Incomplete information. The student making promises on your behalf without checking.

NOTE FOR SEGMENT 4 (end of shift debrief): Lin is now off duty in the staff room. She is more relaxed, collegial, reflective. She is genuinely interested in what happened today — not to criticise, but to learn from it. She will also want to know what was documented.
${JSON_FORMAT}`,
    },
  },

  segments: {
    seg1_deescalate: {
      id: 'seg1_deescalate',
      title: 'De-escalating James',
      activePersonaId: 'james_morrison',
      timeContext: 'Hospital Corridor · 3:15 PM',
      clinicalContext:
        "Thomas is stable and receiving appropriate care. The problem is a communication failure — James received no updates for 12 hours. His anger is justified. De-escalate by acknowledging him first, before providing any information.",
      sessionGoal:
        "De-escalate James's anger, acknowledge the failure genuinely, and commit to getting him a real update.",
      objectives: [
        'Let him vent fully before responding — do not interrupt',
        'Explicitly acknowledge the wait and that it was not acceptable',
        'Give a concrete next step: "I will get you an update right now"',
      ],
      doList: [
        '"James, three hours is too long and I am sorry."',
        '"You have every right to be frustrated."',
        '"I am going to find out exactly where things are right now."',
        'Ask what he needs most in this moment',
      ],
      avoidList: [
        '"Calm down" or "I understand how you feel" too early',
        'Defending the system or making excuses',
        'Vague promises: "We will look into it" with no follow-through',
      ],
      openingLine:
        "I have been waiting THREE hours. Three hours! I drove two hours to get here and nobody can tell me what is happening with my father. This is completely unacceptable.",
      progressionCondition: { type: 'turn_count', maxTurns: 5 },
      nextSegmentId: 'seg2_lin_handoff',
    },

    seg2_lin_handoff: {
      id: 'seg2_lin_handoff',
      title: 'Briefing Lin',
      activePersonaId: 'nurse_lin',
      timeContext: "Nurses' Station · 3:35 PM · 20 minutes later",
      clinicalContext:
        "You've stepped away from James to find Lin Huang, Thomas's nurse. You need to brief her before you both return to James with the update. This segment tests structured clinical communication between colleagues — the handover must be complete enough for Lin to act on it.",
      sessionGoal:
        'Give Lin a clear handover and agree exactly what you\'ll both tell James before you go back.',
      objectives: [
        'Present a concise SBAR handover: Situation, Background, Assessment, Recommendation',
        'Be honest about what you told James and what you promised him',
        'Agree a joint message before going back to James together',
      ],
      doList: [
        '"Lin, here is what happened and what I told James Morrison."',
        'Flag promises: "I told him someone would be back with an update."',
        '"What can we tell him about Thomas right now?"',
        'Confirm who says what when you both go back',
      ],
      avoidList: [
        'Glossing over what you said to James — Lin will find out',
        'Making Lin responsible for promises she didn\'t know about',
        'Leaving without a clear plan for what you\'ll both say',
      ],
      openingLine:
        "I've just taken over Thomas Morrison's bay. I hear you've been speaking with the son — can you brief me on where things stand before we go back to him?",
      progressionCondition: { type: 'turn_count', maxTurns: 5 },
      nextSegmentId: 'seg3_james_update',
    },

    seg3_james_update: {
      id: 'seg3_james_update',
      title: 'Returning to James',
      activePersonaId: 'james_morrison',
      timeContext: 'Family Waiting Room · 3:50 PM · 30 minutes after initial encounter',
      clinicalContext:
        "You and Lin return to James with the update on Thomas. James is calmer but still guarded — he is waiting to see if you follow through. He may be slightly embarrassed about how he behaved earlier. This is where trust is either rebuilt or lost permanently.",
      sessionGoal:
        "Deliver an honest, clear update on Thomas and leave James feeling that his father is in good hands and that he has a named contact.",
      objectives: [
        "Deliver the update on Thomas plainly — no jargon",
        "Close the loop on everything you said you'd do",
        'Give James a named contact and a timeframe for the next update',
      ],
      doList: [
        '"James, I\'m back — here\'s what we found out about your father."',
        'State condition, what\'s being done, what happens next — plainly',
        '"Lin will be his nurse this evening. You can ask for her by name."',
        '"Is there anything else you need before I go?"',
      ],
      avoidList: [
        'Arriving back without the update you promised',
        'Contradicting what you said earlier',
        'Leaving James without a named contact for follow-up',
      ],
      openingLine:
        "You came back. Okay... so — what did you find out? Is my father alright?",
      progressionCondition: { type: 'turn_count', maxTurns: 5 },
      nextSegmentId: 'seg4_lin_debrief',
    },

    seg4_lin_debrief: {
      id: 'seg4_lin_debrief',
      title: 'End-of-Shift Debrief with Lin',
      activePersonaId: 'nurse_lin',
      timeContext: 'Staff Room · 7:30 PM · End of shift · No patient or family present',
      clinicalContext:
        "The shift is over. You and Lin have a moment to debrief on today's incident with James Morrison. This is a peer reflective conversation — not a blame session — about what happened, what could have been prevented, what needs to be documented, and what systemic lesson could be taken. Lin will ask about documentation and reflection.",
      sessionGoal:
        'Reflect honestly on what happened today, ensure proper documentation, and identify one systemic improvement that could prevent the same communication failure.',
      objectives: [
        'Reflect on the root cause of the communication gap with James',
        'Confirm what was documented in Thomas\'s notes and by whom',
        'Identify one thing that could be done differently at a ward level',
      ],
      doList: [
        'Acknowledge what went wrong without deflecting blame',
        '"What did you document, and should I add anything from my side?"',
        '"What do you think we could do differently at ward level?"',
        'Thank Lin for her help today — close the loop on the relationship',
      ],
      avoidList: [
        'Blaming other staff rather than reflecting on systems',
        'Treating documentation as an afterthought',
        'Leaving without a shared lesson or agreed next step',
      ],
      openingLine:
        "What a shift. That family situation with Thomas Morrison — I wanted to check in. How are you feeling after all that? And — did you document your part of it?",
      progressionCondition: { type: 'turn_count', maxTurns: 5 },
    },
  },

  initialSegmentId: 'seg1_deescalate',
};

// ─────────────────────────────────────────────────────────────────────────────
// 03 — MENTAL HEALTH CRISIS
// ─────────────────────────────────────────────────────────────────────────────
const mentalHealth: Scenario = {
  id: 'mental-health',
  title: 'Mental Health Crisis',
  description: 'Open up a withdrawn patient, navigate confidentiality, complete a clinical supervision, and then see her again two weeks later.',
  difficulty: 'medium',
  icon: 'M',
  availability: 'faculty-review',
  safetyNote: 'Held for faculty review because crisis escalation and safeguarding paths must be validated before learner use.',
  patientBackground:
    'Emma Sullivan is a 28-year-old freelance graphic designer who lives alone. She has been struggling since a relationship breakdown six months ago. Her GP referred her after she missed two previous appointments. A close friend Chloe drove her today — the only reason she came.',
  maxTotalTurns: 20,

  personas: {
    emma_sullivan: {
      id: 'emma_sullivan',
      name: 'Emma Sullivan',
      age: 28,
      gender: 'female',
      role: 'patient',
      initialIntensity: 0.70,
      systemPrompt: `You are roleplaying as Emma Sullivan, a 28-year-old graphic designer, in a clinical communication training simulation for healthcare students. Stay fully in character. Never break character. Never mention you are an AI.

PERSONA: Emma Sullivan, 28, freelance graphic designer, lives alone. Struggling with severe anxiety and depression following a relationship breakdown six months ago. Never spoken openly about mental health.

EMOTIONAL BASELINE: distressed, intensity 0.70

WHAT YOU'RE REALLY FEELING UNDERNEATH: Exhausted. Functioning on the surface but barely surviving. Deeply ashamed. Afraid that if she opens up she'll fall apart completely.

WHAT MAKES YOU CALMER: Not being rushed. Genuine curiosity rather than clinical checklists. Feeling seen as a person. Acknowledgment that she was brave for coming.

WHAT MAKES YOU MORE DISTRESSED: Interrogation-style questions. Being told how to feel. Clinical language. Feeling like a case number.

NOTE FOR SEGMENT 3 (safety check, same day): Emma has been sitting alone in the room. She said more than she planned to. She is slightly raw and vulnerable — but also slightly more trusting.

NOTE FOR SEGMENT 5 (second session, 2 weeks later): Emma came back. That is significant. She is still cautious but opens up a little faster. She may reference something from the first session. She is still fragile but less guarded.
${JSON_FORMAT}`,
    },
    chloe_park: {
      id: 'chloe_park',
      name: 'Chloe Park',
      age: 29,
      gender: 'female',
      role: 'friend',
      initialIntensity: 0.50,
      systemPrompt: `You are roleplaying as Chloe Park, a 29-year-old close friend of Emma Sullivan, in a clinical communication training simulation for healthcare students. Stay fully in character. Never break character. Never mention you are an AI.

PERSONA: Chloe Park, 29, Emma's best friend since university. She drove Emma to the appointment because she was worried Emma wouldn't come otherwise. Caring but pushy — she doesn't fully understand confidentiality and will push for information.

EMOTIONAL BASELINE: concerned but persistent, intensity 0.50

WHAT YOU'RE REALLY FEELING UNDERNEATH: Scared for Emma. Guilty she didn't act sooner. Frustrated she can't do more. Wants reassurance that Emma will be okay.

WHAT MAKES YOU CALMER: Being acknowledged as important to Emma. Getting practical guidance on how to help at home. Understanding confidentiality without feeling shut out.

WHAT MAKES YOU MORE DIFFICULT: Being dismissed. Being told nothing. Feeling like your concern doesn't matter.
${JSON_FORMAT}`,
    },
    dr_kwame_osei: {
      id: 'dr_kwame_osei',
      name: 'Dr. Kwame Osei',
      age: 52,
      gender: 'male',
      role: 'colleague',
      initialIntensity: 0.20,
      systemPrompt: `You are roleplaying as Dr. Kwame Osei, a 52-year-old clinical supervisor and consultant psychiatrist, in a clinical communication training simulation for healthcare students. Stay fully in character. Never break character. Never mention you are an AI.

PERSONA: Dr. Kwame Osei, 52, warm but rigorous clinical supervisor. He holds regular supervision sessions with students and trainees. He is not there to criticise — he is there to help the student think. He asks open questions, reflects back, and gently pushes for deeper reflection when the student gives surface answers.

EMOTIONAL BASELINE: warm and curious, intensity 0.20

WHAT MAKES YOU MORE ENGAGED: A student who can reflect genuinely — acknowledging uncertainty and their own emotional responses. Specific clinical observations. A student who noticed safeguarding concerns.

WHAT MAKES YOU PROBE DEEPER: Vague answers ("it went okay"). A student who presents the session as a success without noticing any challenges. Failure to address safeguarding questions.

DIFFICULTY: medium. He will gently challenge surface-level answers and push for more specific reflection. Not hostile — just thorough.
${JSON_FORMAT}`,
    },
  },

  segments: {
    seg1_emma: {
      id: 'seg1_emma',
      title: 'First Session with Emma',
      activePersonaId: 'emma_sullivan',
      timeContext: 'Clinic Room · 2:00 PM · First appointment',
      clinicalContext:
        'Emma is here — that took courage. Your priority is not to diagnose or prescribe, but to keep her engaged and help her feel safe enough to open up. She will retreat quickly if she feels processed or judged.',
      sessionGoal:
        'Help Emma feel genuinely heard and safe enough to begin sharing what she is experiencing.',
      objectives: [
        'Use open, curiosity-led questions rather than a symptom checklist',
        'Reflect and validate her experience without rushing to solutions',
        'Create enough safety that she opens up more than she intended to',
      ],
      doList: [
        '"It sounds like things have been really hard. What\'s been the hardest part?"',
        'Reflect back: "So it sounds like you feel like a burden..."',
        'Acknowledge the courage it took to come today',
        'Tolerate silence — let her find her words',
      ],
      avoidList: [
        'Running through a depression/anxiety questionnaire immediately',
        'Using clinical labels early (e.g. "anxiety disorder", "depression")',
        'Pressing hard when she deflects or changes the subject',
      ],
      openingLine:
        "I... I don't really know why I'm here. My GP kept insisting I come but I don't think there's much anyone can do. I'm probably just wasting your time.",
      progressionCondition: { type: 'turn_count', maxTurns: 4 },
      nextSegmentId: 'seg2_chloe',
    },

    seg2_chloe: {
      id: 'seg2_chloe',
      title: 'Talking to Chloe',
      activePersonaId: 'chloe_park',
      timeContext: 'Waiting Area · Same afternoon · Emma is still inside',
      clinicalContext:
        "Emma's session is pausing while you step out to speak with Chloe, who has been waiting. She wants to know what was said. This tests your ability to honour patient confidentiality while giving Chloe a meaningful role as a support person.",
      sessionGoal:
        "Maintain Emma's confidentiality while giving Chloe practical guidance on how to support her — and a reason to stay involved.",
      objectives: [
        'Explain confidentiality clearly without making Chloe feel dismissed',
        'Acknowledge her role in Emma\'s life and how important it is',
        'Give her 1–2 concrete things she can do to support Emma at home',
      ],
      doList: [
        '"Chloe, I can hear how much you care about Emma — that matters enormously."',
        'Explain you can\'t share what was discussed, but you\'re not dismissing her',
        'Give practical guidance: how to support Emma, warning signs to watch for',
        '"The fact that she came today — a big part of that is you."',
      ],
      avoidList: [
        'Disclosing anything from Emma\'s session',
        'Sending Chloe away with nothing — she will feel dismissed and Emma loses support',
        'Being so clinical about confidentiality that Chloe feels punished for caring',
      ],
      openingLine:
        "Hi — I'm Chloe, Emma's friend. I've been waiting out here for an hour. Can you just tell me — is she okay? What did she say? I'm really worried about her.",
      progressionCondition: { type: 'turn_count', maxTurns: 4 },
      nextSegmentId: 'seg3_emma_close',
    },

    seg3_emma_close: {
      id: 'seg3_emma_close',
      title: 'Closing Check-in with Emma',
      activePersonaId: 'emma_sullivan',
      timeContext: 'Clinic Room · 30 minutes later · Same session',
      clinicalContext:
        "You return to Emma to close the session. She has been sitting alone and has had time to reflect on what she shared. She is slightly more vulnerable — she said more than she planned to. You need to complete a brief safety check, affirm what she shared, and help her leave feeling okay rather than exposed.",
      sessionGoal:
        "Close safely — check in on her state, affirm her courage, and ensure she leaves with at least one clear next step.",
      objectives: [
        "Check how she's feeling after what she shared — don't assume she's fine",
        'Acknowledge specifically what she was brave enough to say',
        'Give her one clear, simple next step — not a to-do list',
      ],
      doList: [
        '"Before you go — how are you doing after everything you shared today?"',
        '"You said something really important. I want you to know I heard it."',
        'Offer a concrete next step: a follow-up appointment, a number to call',
        '"Chloe is out there. You don\'t have to face today alone."',
      ],
      avoidList: [
        'Skipping the check-in and rushing her out',
        'Overwhelming her with resources or action items',
        'Letting the session end without acknowledging the courage it took',
      ],
      openingLine:
        "Oh — you're back. I wasn't sure if you were done with me. I've just been sitting here thinking about everything I said.",
      progressionCondition: { type: 'turn_count', maxTurns: 4 },
      nextSegmentId: 'seg4_supervision',
    },

    seg4_supervision: {
      id: 'seg4_supervision',
      title: 'Clinical Supervision',
      activePersonaId: 'dr_kwame_osei',
      timeContext: "Supervisor's Office · 1 week later · No patient present",
      clinicalContext:
        "This is your weekly clinical supervision session with Dr. Kwame Osei. You are reflecting on the session with Emma from last week. Dr. Osei will ask you to walk through what happened, how you felt, what you noticed, and whether any safeguarding considerations arose. This is a reflective professional dialogue — not a patient interaction.",
      sessionGoal:
        'Reflect honestly and specifically on the Emma session: what you did well, what you found difficult, and any safeguarding considerations.',
      objectives: [
        'Describe the session concretely — what Emma said, what you noticed, how you responded',
        'Reflect on your own emotional responses during the session',
        'Address any safeguarding concerns that arose, or explain why you assessed there were none',
      ],
      doList: [
        'Be specific, not general: describe moments, not summaries',
        'Acknowledge what felt hard or uncertain — supervisors respect honesty',
        '"I noticed I felt... when she said..." — own your emotional responses',
        'Address safeguarding explicitly, even if the answer is "I didn\'t identify risk"',
      ],
      avoidList: [
        'Vague answers: "It went fine" or "I think I did okay"',
        'Presenting the session as a success with no challenges',
        'Avoiding the safeguarding question because it feels awkward',
      ],
      openingLine:
        "Good to see you. So — the Emma Sullivan case from last week. Talk me through it. How did it go, in your view?",
      progressionCondition: { type: 'turn_count', maxTurns: 4 },
      nextSegmentId: 'seg5_emma_return',
    },

    seg5_emma_return: {
      id: 'seg5_emma_return',
      title: 'Emma Returns',
      activePersonaId: 'emma_sullivan',
      timeContext: 'Clinic Room · 2 weeks after first session · Second appointment',
      clinicalContext:
        "Emma came back. That is not nothing — many people in her situation don't. She is still cautious but is marginally more trusting than the first session. She may reference something from the first session. She is still fragile but has had two weeks to think. Your role is to continue the therapeutic work you started — deepen the trust you built, not restart from scratch.",
      sessionGoal:
        'Build on the first session — go deeper, notice what has changed, and help Emma take one concrete step toward getting more consistent support.',
      objectives: [
        'Acknowledge that she came back — that matters',
        'Pick up where you left off rather than repeating the same first-session questions',
        'Help her identify one concrete change, however small, she wants to try',
      ],
      doList: [
        '"I\'m really glad you came back. How have the last two weeks been?"',
        'Reference something specific from last session — show you remember her',
        '"Last time you mentioned [X]. Have you thought more about that?"',
        'Help her identify one small step: "What\'s one thing that might help, even slightly?"',
      ],
      avoidList: [
        'Starting from scratch as if the first session didn\'t happen',
        'Rushing toward solutions before you\'ve checked how the two weeks went',
        'Setting unrealistic goals — one small step is enough',
      ],
      openingLine:
        "I... came back. I wasn't sure I would. I thought about cancelling about four times this morning. But I'm here.",
      progressionCondition: { type: 'turn_count', maxTurns: 4 },
    },
  },

  initialSegmentId: 'seg1_emma',
};

// ─────────────────────────────────────────────────────────────────────────────
// 04 — BEHAVIOUR CHANGE
// ─────────────────────────────────────────────────────────────────────────────
const behaviorChange: Scenario = {
  id: 'behavior-change',
  title: 'Behaviour Change',
  description: 'Use motivational interviewing, mediate a family disruption, seal the commitment, then follow up six weeks later to see if anything changed.',
  difficulty: 'medium',
  icon: 'B',
  availability: 'available',
  patientBackground:
    'Robert Tan is a 58-year-old retired contractor and widower. He has had type 2 diabetes for 8 years and has been non-adherent with medication and diet. Multiple doctors have lectured him, making him increasingly defensive. His daughter Sarah lives nearby and drove him today.',
  maxTotalTurns: 20,

  personas: {
    robert_tan: {
      id: 'robert_tan',
      name: 'Robert Tan',
      age: 58,
      gender: 'male',
      role: 'patient',
      initialIntensity: 0.35,
      systemPrompt: `You are roleplaying as Robert Tan, a 58-year-old retired contractor, in a clinical communication training simulation for healthcare students. Stay fully in character. Never break character. Never mention you are an AI.

PERSONA: Robert Tan, 58, retired contractor, widower, two grown children. Type 2 diabetes for 8 years. Non-adherent. Defensive after being lectured by multiple doctors.

EMOTIONAL BASELINE: neutral/defensive, intensity 0.35

WHAT YOU'RE REALLY FEELING UNDERNEATH: Scared of becoming dependent — of losing independence as his father did. He knows he should change but feels it is too hard and too late.

WHAT MAKES YOU CALMER: Being treated as an intelligent adult. Motivational conversation. Being asked what he thinks. Small achievable suggestions.

WHAT MAKES YOU MORE DISTRESSED: Lectures. Being spoken to like a child. Scary statistics. Feeling like a bad patient.

NOTE FOR SEGMENT 3 (alone again after Sarah): Robert is slightly more relaxed now that it is just the two of you. He may be a little embarrassed about how Sarah spoke for him. He is close to committing to something — but needs to feel it is his idea.

NOTE FOR SEGMENT 4 (6 weeks later): Robert did try something. Not perfectly — maybe he skipped some days — but he tried. He is cautiously positive. He doesn't want to be lectured about what he didn't do. He wants to be met where he is.
${JSON_FORMAT}`,
    },
    sarah_tan: {
      id: 'sarah_tan',
      name: 'Sarah Tan',
      age: 32,
      gender: 'female',
      role: 'family',
      initialIntensity: 0.65,
      systemPrompt: `You are roleplaying as Sarah Tan, a 32-year-old accountant and daughter of Robert Tan, in a clinical communication training simulation for healthcare students. Stay fully in character. Never break character. Never mention you are an AI.

PERSONA: Sarah Tan, 32, accountant. Watching her father ignore his diabetes for years. Terrified he will end up like her grandfather who lost a foot and died young. Loving but frustrated.

EMOTIONAL BASELINE: anxious and frustrated, intensity 0.65

WHAT YOU'RE REALLY FEELING UNDERNEATH: Grief at the idea of losing her father. A deep longing for him to want to be around for her and her children.

WHAT MAKES YOU CALMER: Being acknowledged as a key support person. Getting practical advice on how to help without nagging. Feeling that the doctor sees the urgency — but also respects her father.

WHAT MAKES YOU MORE DIFFICULT: Feeling dismissed. Watching the doctor go soft on her father after years of non-adherence.
${JSON_FORMAT}`,
    },
  },

  segments: {
    seg1_robert: {
      id: 'seg1_robert',
      title: 'Motivational Interviewing',
      activePersonaId: 'robert_tan',
      timeContext: 'GP Clinic · 10:00 AM · Quarterly review',
      clinicalContext:
        "This is Robert's quarterly review — his HbA1c is significantly elevated. Direct confrontation has failed before. Use Motivational Interviewing: explore his own readiness and reasons for change, rather than prescribing solutions.",
      sessionGoal:
        'Help Robert start to articulate his own reasons to change — not yours. Leave him on the cusp of committing to one small step.',
      objectives: [
        'Ask what he already knows and what concerns him — don\'t lecture',
        'Explore ambivalence: "What would change for you if things stayed the same?"',
        'Affirm something he is already doing well',
      ],
      doList: [
        '"What do you already know about how your diabetes is tracking?"',
        '"What worries you most about where things are heading?"',
        'Affirm: "It sounds like you\'ve been managing a lot on your own."',
        '"What\'s one small thing that feels realistic to you?"',
      ],
      avoidList: [
        'Lecturing or presenting statistics without being asked',
        'Telling him what he should do before exploring what he wants',
        'Making him feel like a "bad patient"',
      ],
      openingLine:
        "I know, I know, you're going to tell me my blood sugar is too high again. I've heard the speech before. I'm not a child, I understand the risks.",
      progressionCondition: { type: 'turn_count', maxTurns: 5 },
      nextSegmentId: 'seg2_sarah_joins',
    },

    seg2_sarah_joins: {
      id: 'seg2_sarah_joins',
      title: 'Sarah Joins',
      activePersonaId: 'sarah_tan',
      timeContext: 'GP Clinic · Same appointment · 10:25 AM',
      clinicalContext:
        "Sarah has knocked and entered. Robert looks uncomfortable. She is loving but has been watching this for years and is struggling to hold back. Welcome her without letting this become a two-on-one against Robert. Give Sarah a productive role that supports Robert's autonomy rather than undermining it.",
      sessionGoal:
        "Bring Sarah in as a supportive partner without triggering Robert's defensiveness — align both of them toward the small step Robert was considering.",
      objectives: [
        'Welcome Sarah without sidelining Robert or making him feel ganged up on',
        "Redirect Sarah's anxiety into a practical support role",
        'Leave all three of you pointing toward the same next step',
      ],
      doList: [
        '"Sarah, I\'m glad you\'re here — Robert has been sharing some important thoughts."',
        'Ask Robert first: "Is it okay if Sarah hears where we\'ve got to?"',
        '"The most helpful thing right now isn\'t pressure — it\'s company."',
        'Summarise the step Robert was considering and invite both to agree',
      ],
      avoidList: [
        'Letting Sarah lecture Robert — redirect her before it escalates',
        'Ignoring Robert and talking only to Sarah',
        'Introducing new goals or pressure at this stage',
      ],
      openingLine:
        "Sorry, Doctor, I just — I've been sitting outside and I couldn't wait anymore. Dad, your last results were really scary. You need to actually do something this time.",
      progressionCondition: { type: 'turn_count', maxTurns: 5 },
      nextSegmentId: 'seg3_robert_commit',
    },

    seg3_robert_commit: {
      id: 'seg3_robert_commit',
      title: "Sealing Robert's Commitment",
      activePersonaId: 'robert_tan',
      timeContext: 'GP Clinic · Same appointment · Sarah has stepped out',
      clinicalContext:
        "Sarah has stepped out. You are alone with Robert again. The pressure is off. He may be a little embarrassed by how Sarah spoke. This is the moment to bring him back to the small step he was considering and get a genuine, self-chosen commitment — before he leaves.",
      sessionGoal:
        'Help Robert name one small, specific, self-chosen step he will take — and leave feeling like it was his decision, not a prescription.',
      objectives: [
        'Acknowledge what just happened without making Robert feel judged',
        'Bring the conversation back to what he said he might be willing to try',
        'Get a specific, time-bound commitment: what, when, how',
      ],
      doList: [
        '"It\'s just us now. How are you feeling after all that?"',
        '"Earlier you mentioned something about [what he said]. Is that still on the table?"',
        '"What would it look like in practice — just this week?"',
        '"I\'ll check in with you on this at your next visit."',
      ],
      avoidList: [
        'Adding more goals or information in this moment',
        'Implying he only matters because Sarah is watching',
        'Letting him leave without a specific agreed commitment',
      ],
      openingLine:
        "Phew. She means well. She worries too much — always has, since she was little. Anyway. Where were we?",
      progressionCondition: { type: 'turn_count', maxTurns: 5 },
      nextSegmentId: 'seg4_robert_followup',
    },

    seg4_robert_followup: {
      id: 'seg4_robert_followup',
      title: 'Six-Week Follow-up',
      activePersonaId: 'robert_tan',
      timeContext: 'GP Clinic · 6 weeks later · Follow-up appointment',
      clinicalContext:
        'Robert returns for his follow-up. He actually tried the thing he committed to — not perfectly, but he tried. He is cautiously positive but doesn\'t want to be lectured about the days he didn\'t manage it. This session is about maintenance and momentum: affirm what he did, explore what got in the way, and agree the next small step. Do not renegotiate everything from scratch.',
      sessionGoal:
        "Meet Robert where he is — affirm the effort he made, explore what helped and what didn't, and agree one small next step to maintain momentum.",
      objectives: [
        'Ask what he tried before you look at any numbers',
        'Affirm the effort regardless of the outcome — process over results',
        'Identify one thing that helped and one barrier; build on both',
      ],
      doList: [
        '"Before we look at results — how did the last six weeks go for you?"',
        '"Tell me about the days you did manage it. What made that possible?"',
        'Affirm: "That\'s not nothing. That\'s a real change."',
        '"What\'s one thing you want to keep going with — just for the next six weeks?"',
      ],
      avoidList: [
        'Leading with the HbA1c result before hearing his story',
        'Focusing on what he didn\'t do rather than what he did',
        'Renegotiating everything — build on what already worked',
      ],
      openingLine:
        "I did try, you know. Not every day. Some weeks were better than others. But I did try. That's more than I've done in years, if I'm honest.",
      progressionCondition: { type: 'turn_count', maxTurns: 5 },
    },
  },

  initialSegmentId: 'seg1_robert',
};

export const scenarios: Scenario[] = [badNews, angryFamily, mentalHealth, behaviorChange];
