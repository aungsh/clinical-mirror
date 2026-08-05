'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { scenarios } from '@/lib/scenarios';
import { Turn, EmotionType } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { VoiceOrb } from '@/components/VoiceOrb';
import { speakEmotional, cancelSpeech, initVoices } from '@/lib/tts';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const EMOTION_COLORS: Record<EmotionType, string> = {
  neutral:    '#22d3ee',
  sad:        '#60a5fa',
  angry:      '#f87171',
  anxious:    '#fbbf24',
  distressed: '#f97316',
  relieved:   '#34d399',
  calm:       '#818cf8',
};

const EMOTION_LABELS: Record<EmotionType, string> = {
  neutral: 'Neutral', sad: 'Sad', angry: 'Angry',
  anxious: 'Anxious', distressed: 'Distressed', relieved: 'Relieved', calm: 'Calm',
};

const DIFF_STYLES = {
  easy:   { label: 'Easy',   color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  medium: { label: 'Medium', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  hard:   { label: 'Hard',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Stage = 'brief' | 'active';

/* ─── Briefing Screen ────────────────────────────────────────────────────── */

function BriefingScreen({
  scenario,
  onBegin,
}: {
  scenario: (typeof scenarios)[0];
  onBegin: () => void;
}) {
  const diff = DIFF_STYLES[scenario.difficulty];

  return (
    <div
      className="min-h-[100dvh] flex flex-col animate-fade-in"
      style={{ background: 'oklch(0.075 0.018 255)' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-8 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'oklch(0.14 0.014 255)', background: 'oklch(0.085 0.018 255)' }}
      >
        <Link
          href="/"
          className="text-sm transition-colors flex items-center gap-2"
          style={{ color: 'oklch(0.48 0.02 255)' }}
        >
          ← Back to scenarios
        </Link>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: diff.bg, color: diff.color }}
        >
          {diff.label} difficulty
        </span>
      </header>

      <main className="flex-1 px-8 py-10 max-w-5xl mx-auto w-full">
        {/* Title */}
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3"
            style={{ color: 'oklch(0.72 0.14 200)' }}>
            Mission Briefing
          </p>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'oklch(0.96 0.01 255)' }}>
            {scenario.title}
          </h1>
          <p className="text-base" style={{ color: 'oklch(0.52 0.02 255)' }}>
            {scenario.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

          {/* Patient Card */}
          <div
            className="rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: 'oklch(0.1 0.016 255)', border: '1px solid oklch(0.17 0.016 255)' }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'oklch(0.13 0.014 255)' }}
              >
                {scenario.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'oklch(0.92 0.012 255)' }}>
                  {scenario.patientName}
                </h2>
                <p className="text-sm" style={{ color: 'oklch(0.5 0.02 255)' }}>
                  Age {scenario.patientAge}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'oklch(0.45 0.018 255)' }}>
                Background
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.68 0.016 255)' }}>
                {scenario.patientBackground}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'oklch(0.45 0.018 255)' }}>
                Clinical Context
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.68 0.016 255)' }}>
                {scenario.clinicalContext}
              </p>
            </div>

            {/* Starting emotional state */}
            <div
              className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl"
              style={{ background: 'oklch(0.13 0.014 255)' }}
            >
              <div className="text-xs" style={{ color: 'oklch(0.45 0.018 255)' }}>
                Starting emotional state:
              </div>
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: scenario.initialIntensity > 0.6 ? '#f87171' : scenario.initialIntensity > 0.4 ? '#fbbf24' : '#34d399' }}
              />
              <div className="text-xs font-medium" style={{ color: 'oklch(0.7 0.016 255)' }}>
                {Math.round(scenario.initialIntensity * 100)}% intensity
              </div>
            </div>
          </div>

          {/* Mission Card */}
          <div className="flex flex-col gap-4">
            {/* Goal */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'oklch(0.72 0.14 200 / 0.08)', border: '1px solid oklch(0.72 0.14 200 / 0.2)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'oklch(0.72 0.14 200)' }}>
                Your Goal
              </p>
              <p className="text-sm leading-relaxed font-medium" style={{ color: 'oklch(0.88 0.012 255)' }}>
                {scenario.sessionGoal}
              </p>
            </div>

            {/* Objectives */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'oklch(0.1 0.016 255)', border: '1px solid oklch(0.17 0.016 255)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: 'oklch(0.45 0.018 255)' }}>
                Learning Objectives
              </p>
              <ul className="space-y-2">
                {scenario.objectives.map((obj, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                      style={{ background: 'oklch(0.72 0.14 200 / 0.15)', color: 'oklch(0.72 0.14 200)' }}>
                      {i + 1}
                    </span>
                    <span style={{ color: 'oklch(0.7 0.016 255)' }}>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Do / Avoid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="rounded-2xl p-5"
            style={{ background: 'oklch(0.1 0.016 255)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: '#34d399' }}>
              ✓ Try this
            </p>
            <ul className="space-y-2">
              {scenario.doList.map((item, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: 'oklch(0.68 0.016 255)' }}>
                  <span style={{ color: '#34d39966' }}>→</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl p-5"
            style={{ background: 'oklch(0.1 0.016 255)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: '#f87171' }}>
              ✗ Avoid this
            </p>
            <ul className="space-y-2">
              {scenario.avoidList.map((item, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: 'oklch(0.68 0.016 255)' }}>
                  <span style={{ color: '#f8717166' }}>×</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Begin button */}
        <div className="flex justify-center">
          <button
            id="btn-begin-session"
            onClick={onBegin}
            className="px-10 py-4 rounded-2xl text-lg font-semibold transition-all duration-200 active:scale-95 flex items-center gap-3"
            style={{
              background: 'oklch(0.72 0.14 200)',
              color: 'oklch(0.08 0.018 255)',
              boxShadow: '0 0 32px oklch(0.72 0.14 200 / 0.35)',
            }}
          >
            <span>Begin Session</span>
            <span className="text-xl">→</span>
          </button>
        </div>
      </main>
    </div>
  );
}

/* ─── Active Session Screen ──────────────────────────────────────────────── */

function ActiveSession({
  scenario,
  onEnd,
}: {
  scenario: (typeof scenarios)[0];
  onEnd: (turns: Turn[]) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [emotion, setEmotion] = useState<EmotionType>('neutral');
  const [intensity, setIntensity] = useState(scenario.initialIntensity);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [patientTurnCount, setPatientTurnCount] = useState(0);
  const [lastPatientText, setLastPatientText] = useState(scenario.openingLine);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check mic support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const W = window as unknown as Record<string, unknown>;
      if (!W.SpeechRecognition && !W.webkitSpeechRecognition) setMicSupported(false);
    }
  }, []);

  // Scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, showTranscript]);

  const speak = useCallback(
    (text: string, emo: EmotionType) => {
      if (isMuted) return;
      speakEmotional(text, emo, {
        onStart: () => setIsSpeaking(true),
        onEnd:   () => setIsSpeaking(false),
      });
    },
    [isMuted]
  );

  // Opening line on mount
  useEffect(() => {
    const opening: Turn = {
      speaker: 'patient',
      text: scenario.openingLine,
      emotion: 'neutral',
      intensity: scenario.initialIntensity,
      timestamp: Date.now(),
    };
    setTurns([opening]);
    setLastPatientText(scenario.openingLine);
    setPatientTurnCount(1);

    initVoices().then(() => {
      setTimeout(() => speak(scenario.openingLine, 'neutral'), 400);
    });

    return () => cancelSpeech();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const studentText = input.trim();
    setInput('');
    cancelSpeech();
    setIsSpeaking(false);

    const studentTurn: Turn = { speaker: 'student', text: studentText, timestamp: Date.now() };
    const nextTurns = [...turns, studentTurn];
    setTurns(nextTurns);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          history: nextTurns,
          studentMessage: studentText,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        const emo = data.emotion as EmotionType;
        const patTurn: Turn = {
          speaker: 'patient',
          text: data.reply,
          emotion: emo,
          intensity: data.intensity,
          timestamp: Date.now(),
        };
        setTurns((p) => [...p, patTurn]);
        setEmotion(emo);
        setIntensity(data.intensity);
        setLastPatientText(data.reply);
        setPatientTurnCount((c) => c + 1);
        speak(data.reply, emo);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const toggleMic = () => {
    if (!micSupported) return;
    const W = window as unknown as Record<string, unknown>;
    const SpeechRec = (W.SpeechRecognition ?? W.webkitSpeechRecognition) as typeof SpeechRecognition | undefined;
    if (!SpeechRec) return;

    if (isMicActive) {
      recognitionRef.current?.stop();
      setIsMicActive(false);
      return;
    }

    cancelSpeech();
    setIsSpeaking(false);

    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + ' ' + t : t));
    };
    rec.onend = () => setIsMicActive(false);
    rec.onerror = () => setIsMicActive(false);
    rec.start();
    recognitionRef.current = rec;
    setIsMicActive(true);
  };

  const handleEnd = () => {
    const studentCount = turns.filter((t) => t.speaker === 'student').length;
    if (studentCount < 2) {
      alert('Please have at least a couple of exchanges before ending.');
      return;
    }
    cancelSpeech();
    recognitionRef.current?.stop();
    onEnd(turns);
  };

  // Progress: how much has intensity decreased from the start
  const initialI = scenario.initialIntensity;
  const progressRaw = initialI > 0.35
    ? Math.max(0, Math.min(1, (initialI - intensity) / initialI))
    : Math.min(1, patientTurnCount / scenario.maxTurns); // for low-intensity scenarios, measure engagement
  const progress = progressRaw;
  const progressPct = Math.round(progress * 100);
  const progressColor = progress > 0.6 ? '#34d399' : progress > 0.3 ? '#fbbf24' : '#f87171';

  const glowColor = EMOTION_COLORS[emotion];
  const studentTurnCount = turns.filter((t) => t.speaker === 'student').length;
  const nearEnd = patientTurnCount >= scenario.maxTurns;

  return (
    <div
      className="min-h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: 'oklch(0.07 0.018 255)' }}
    >
      {/* ── Top bar ── */}
      <header
        className="flex-shrink-0 flex items-center gap-4 px-5 py-3 border-b z-10"
        style={{ borderColor: 'oklch(0.13 0.014 255)', background: 'oklch(0.08 0.017 255)' }}
      >
        {/* Scenario name */}
        <span className="text-sm font-medium truncate flex-1" style={{ color: 'oklch(0.62 0.018 255)' }}>
          {scenario.title} — {scenario.patientName}
        </span>

        {/* Goal progress */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <span className="text-xs" style={{ color: 'oklch(0.42 0.016 255)' }}>
            {initialI > 0.35 ? 'De-escalation' : 'Engagement'}
          </span>
          <div className="w-28 h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.17 0.016 255)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: progressColor }}
            />
          </div>
          <span className="text-xs font-medium w-8" style={{ color: progressColor }}>
            {progressPct}%
          </span>
        </div>

        {/* Turn counter */}
        <span className="text-xs flex-shrink-0" style={{ color: 'oklch(0.4 0.016 255)' }}>
          {patientTurnCount}/{scenario.maxTurns}
        </span>

        {/* Controls */}
        <button
          id="btn-toggle-transcript"
          onClick={() => setShowTranscript((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg transition-all duration-200 flex-shrink-0"
          style={{
            background: showTranscript ? 'oklch(0.72 0.14 200 / 0.15)' : 'oklch(0.13 0.014 255)',
            border: `1px solid ${showTranscript ? 'oklch(0.72 0.14 200 / 0.4)' : 'oklch(0.2 0.016 255)'}`,
            color: showTranscript ? 'oklch(0.72 0.14 200)' : 'oklch(0.5 0.02 255)',
          }}
        >
          💬 Transcript
        </button>

        <button
          id="btn-end-session"
          onClick={handleEnd}
          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 flex-shrink-0 active:scale-95"
          style={{
            background: 'oklch(0.64 0.22 25 / 0.12)',
            border: '1px solid oklch(0.64 0.22 25 / 0.3)',
            color: '#f87171',
          }}
        >
          End Session
        </button>
      </header>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Center: Avatar + orb */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4 py-6 overflow-hidden">

          {/* Patient speech bubble */}
          <div
            className="w-full max-w-lg min-h-[4.5rem] px-5 py-3.5 rounded-2xl text-sm leading-relaxed text-center transition-all duration-500"
            style={{
              background: `oklch(0.1 0.016 255)`,
              border: `1px solid ${glowColor}25`,
              color: 'oklch(0.82 0.012 255)',
              boxShadow: `0 0 20px ${glowColor}10`,
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-1.5">
                {[0,1,2].map((j) => (
                  <span
                    key={j}
                    className="w-2 h-2 rounded-full inline-block"
                    style={{
                      background: glowColor,
                      animation: `orb-pulse 1.1s ease-in-out ${j * 0.18}s infinite`,
                    }}
                  />
                ))}
              </span>
            ) : (
              lastPatientText
            )}
          </div>

          {/* Avatar */}
          <div className="flex-shrink-0 animate-breathe">
            <Avatar
              emotion={emotion}
              intensity={intensity}
              isSpeaking={isSpeaking}
              isListening={isMicActive}
              size={300}
            />
          </div>

          {/* Emotion pill */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-700"
            style={{ background: `${glowColor}14`, border: `1px solid ${glowColor}30` }}
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: glowColor, boxShadow: `0 0 6px ${glowColor}` }} />
            <span className="text-sm font-medium" style={{ color: glowColor }}>
              {EMOTION_LABELS[emotion]}
            </span>
            <span className="text-xs" style={{ color: `${glowColor}70` }}>
              {Math.round(intensity * 100)}%
            </span>
          </div>

          {/* Voice orb */}
          <div className="relative">
            <VoiceOrb
              isSpeaking={isSpeaking}
              isListening={isMicActive}
              isIdle={!isSpeaking && !isMicActive}
              color={glowColor}
              size={120}
            />
          </div>

          {/* Near-end prompt */}
          {nearEnd && (
            <div
              className="text-xs px-4 py-2 rounded-full animate-fade-in"
              style={{ background: 'oklch(0.72 0.14 200 / 0.1)', color: 'oklch(0.72 0.14 200)', border: '1px solid oklch(0.72 0.14 200 / 0.25)' }}
            >
              Good session — ready to end when you are
            </div>
          )}
        </div>

        {/* Transcript side panel */}
        {showTranscript && (
          <div
            className="flex flex-col border-l animate-fade-in w-72 xl:w-80 flex-shrink-0"
            style={{ borderColor: 'oklch(0.14 0.014 255)', background: 'oklch(0.085 0.017 255)' }}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'oklch(0.13 0.014 255)' }}>
              <span className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'oklch(0.42 0.016 255)' }}>
                Transcript
              </span>
              <span className="text-xs" style={{ color: 'oklch(0.35 0.014 255)' }}>
                {studentTurnCount} exchanges
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {turns.map((t, i) => (
                <div key={i}
                  className="text-xs leading-relaxed px-3 py-2 rounded-xl"
                  style={
                    t.speaker === 'student'
                      ? { background: 'oklch(0.72 0.14 200 / 0.1)', color: 'oklch(0.8 0.012 255)', textAlign: 'right' }
                      : { background: 'oklch(0.11 0.014 255)', color: 'oklch(0.65 0.014 255)' }
                  }
                >
                  <span className="font-semibold mr-1.5"
                    style={{ color: t.speaker === 'student' ? 'oklch(0.72 0.14 200)' : glowColor }}>
                    {t.speaker === 'student' ? 'You' : scenario.patientName.split(' ')[0]}:
                  </span>
                  {t.text}
                  {t.speaker === 'patient' && t.emotion && (
                    <span className="ml-1.5 opacity-50">
                      [{EMOTION_LABELS[t.emotion as EmotionType]}]
                    </span>
                  )}
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-5 py-3 border-t"
        style={{ borderColor: 'oklch(0.13 0.014 255)', background: 'oklch(0.08 0.017 255)' }}
      >
        {/* Mute */}
        <button
          id="btn-mute"
          onClick={() => { if (!isMuted) cancelSpeech(); setIsMuted((m) => !m); }}
          title={isMuted ? 'Unmute patient voice' : 'Mute patient voice'}
          className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-sm transition-all duration-200"
          style={{
            background: 'oklch(0.12 0.014 255)',
            border: `1px solid ${isMuted ? '#f8717140' : 'oklch(0.2 0.016 255)'}`,
            color: isMuted ? '#f87171' : 'oklch(0.45 0.018 255)',
          }}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        {/* Mic */}
        <button
          id="btn-mic"
          onClick={toggleMic}
          disabled={!micSupported || isLoading}
          title={!micSupported ? 'Voice not supported in this browser' : isMicActive ? 'Stop recording' : 'Start recording'}
          className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-sm transition-all duration-200 disabled:opacity-40"
          style={{
            background: isMicActive ? 'oklch(0.64 0.22 25 / 0.18)' : 'oklch(0.12 0.014 255)',
            border: isMicActive ? '1.5px solid #f87171' : '1px solid oklch(0.2 0.016 255)',
            color: isMicActive ? '#f87171' : 'oklch(0.45 0.018 255)',
            boxShadow: isMicActive ? '0 0 10px #f8717135' : 'none',
          }}
        >
          {isMicActive ? '⏹' : '🎤'}
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          id="input-student-message"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          placeholder={isMicActive ? 'Listening…' : `Respond to ${scenario.patientName.split(' ')[0]}…`}
          disabled={isLoading}
          className="flex-1 px-4 py-2 rounded-xl text-sm outline-none transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'oklch(0.11 0.014 255)',
            border: '1px solid oklch(0.19 0.016 255)',
            color: 'oklch(0.92 0.012 255)',
          }}
        />

        {/* Send */}
        <button
          id="btn-send"
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-base transition-all duration-200 disabled:opacity-30 active:scale-95"
          style={{ background: 'oklch(0.72 0.14 200)', color: 'oklch(0.08 0.018 255)' }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page (orchestrator) ───────────────────────────────────────────── */

export default function SessionPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = use(params);
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('brief');
  const [isEnding, setIsEnding] = useState(false);

  const scenario = scenarios.find((s) => s.id === scenarioId);

  if (!scenario) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4"
        style={{ background: 'oklch(0.075 0.018 255)' }}>
        <p className="text-xl" style={{ color: 'oklch(0.94 0.012 255)' }}>Scenario not found.</p>
        <Link href="/" className="underline" style={{ color: 'oklch(0.72 0.14 200)' }}>← Back home</Link>
      </div>
    );
  }

  const handleEnd = async (turns: Turn[]) => {
    setIsEnding(true);
    const intensityTimeSeries = turns
      .filter((t) => t.speaker === 'patient' && t.intensity !== undefined)
      .map((t) => t.intensity!);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, history: turns, intensityTimeSeries }),
      });
      const feedback = await res.json();
      sessionStorage.setItem('clinicalmirror_session', JSON.stringify({ scenario, turns, feedback }));
      router.push('/feedback');
    } catch (err) {
      console.error('Feedback error:', err);
      setIsEnding(false);
    }
  };

  return (
    <>
      {stage === 'brief' && (
        <BriefingScreen scenario={scenario} onBegin={() => setStage('active')} />
      )}
      {stage === 'active' && !isEnding && (
        <ActiveSession scenario={scenario} onEnd={handleEnd} />
      )}

      {/* Feedback generation overlay */}
      {isEnding && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center gap-5 z-50 animate-fade-in"
          style={{ background: 'oklch(0.075 0.018 255 / 0.95)', backdropFilter: 'blur(16px)' }}
        >
          <div className="w-16 h-16 rounded-full border-2 border-t-transparent"
            style={{
              borderColor: 'oklch(0.72 0.14 200)',
              borderTopColor: 'transparent',
              animation: 'spin-slow 0.9s linear infinite',
            }}
          />
          <div className="text-center space-y-2">
            <p className="text-xl font-semibold" style={{ color: 'oklch(0.92 0.012 255)' }}>
              Analysing your session…
            </p>
            <p className="text-sm" style={{ color: 'oklch(0.5 0.02 255)' }}>
              Generating personalised feedback
            </p>
          </div>
        </div>
      )}
    </>
  );
}
