'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { scenarios } from '@/lib/scenarios';
import { Turn, EmotionType } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { VoiceOrb } from '@/components/VoiceOrb';

const EMOTION_LABELS: Record<EmotionType, string> = {
  neutral: 'Neutral',
  sad: 'Sad',
  angry: 'Angry',
  anxious: 'Anxious',
  distressed: 'Distressed',
  relieved: 'Relieved',
  calm: 'Calm',
};

const EMOTION_COLORS: Record<EmotionType, string> = {
  neutral: '#22d3ee',
  sad: '#60a5fa',
  angry: '#f87171',
  anxious: '#fbbf24',
  distressed: '#f97316',
  relieved: '#34d399',
  calm: '#818cf8',
};

function getVoiceParams(emotion: EmotionType) {
  switch (emotion) {
    case 'angry':     return { pitch: 0.8, rate: 1.2 };
    case 'anxious':   return { pitch: 1.2, rate: 1.25 };
    case 'distressed':return { pitch: 1.1, rate: 1.15 };
    case 'sad':       return { pitch: 0.85, rate: 0.85 };
    case 'relieved':  return { pitch: 1.05, rate: 0.95 };
    case 'calm':      return { pitch: 1.0, rate: 0.9 };
    default:          return { pitch: 1.0, rate: 1.0 };
  }
}

export default function SessionPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = use(params);
  const router = useRouter();

  const scenario = scenarios.find((s) => s.id === scenarioId);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [emotion, setEmotion] = useState<EmotionType>('neutral');
  const [intensity, setIntensity] = useState(0.5);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [turnCount, setTurnCount] = useState(0); // patient turns

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll transcript to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  // Check mic support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRec =
        (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
      if (!SpeechRec) setMicSupported(false);
    }
  }, []);

  const speakText = useCallback(
    (text: string, emo: EmotionType) => {
      if (isMuted || typeof window === 'undefined') return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const params = getVoiceParams(emo);
      utterance.pitch = params.pitch;
      utterance.rate = params.rate;
      utterance.volume = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      // Try to use a natural voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Karen'))
      );
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    },
    [isMuted]
  );

  // Load opening line
  useEffect(() => {
    if (!scenario) return;
    const opening: Turn = {
      speaker: 'patient',
      text: scenario.openingLine,
      emotion: 'neutral',
      intensity: 0.5,
      timestamp: Date.now(),
    };
    setTurns([opening]);
    setEmotion('neutral');
    setIntensity(0.5);
    setTurnCount(1);
    // Delay slightly so voices load
    setTimeout(() => speakText(scenario.openingLine, 'neutral'), 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario?.id]);

  // If scenario not found
  if (!scenario) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center flex-col gap-4">
        <p className="text-xl" style={{ color: 'oklch(0.94 0.012 255)' }}>Scenario not found.</p>
        <Link href="/" className="underline" style={{ color: 'oklch(0.72 0.14 200)' }}>← Back home</Link>
      </div>
    );
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const studentText = input.trim();
    setInput('');

    const studentTurn: Turn = {
      speaker: 'student',
      text: studentText,
      timestamp: Date.now(),
    };
    const updatedTurns = [...turns, studentTurn];
    setTurns(updatedTurns);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId,
          history: updatedTurns,
          studentMessage: studentText,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        const patientTurn: Turn = {
          speaker: 'patient',
          text: data.reply,
          emotion: data.emotion as EmotionType,
          intensity: data.intensity,
          timestamp: Date.now(),
        };
        setTurns((prev) => [...prev, patientTurn]);
        setEmotion(data.emotion as EmotionType);
        setIntensity(data.intensity);
        setTurnCount((c) => c + 1);
        speakText(data.reply, data.emotion);
      } else {
        console.error('Chat API error:', data);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const toggleMic = () => {
    if (!micSupported) return;

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRec) return;

    if (isMicActive) {
      recognitionRef.current?.stop();
      setIsMicActive(false);
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const recognition = new SpeechRec();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
    };
    recognition.onend = () => setIsMicActive(false);
    recognition.onerror = () => setIsMicActive(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsMicActive(true);
  };

  const toggleMute = () => {
    if (!isMuted) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setIsMuted((m) => !m);
  };

  const endSession = async () => {
    if (turns.filter((t) => t.speaker === 'student').length < 2) {
      alert('Please have at least a couple of exchanges before ending the session.');
      return;
    }
    setIsEnding(true);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

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

      sessionStorage.setItem(
        'clinicalmirror_session',
        JSON.stringify({ scenario, turns, feedback })
      );
      router.push('/feedback');
    } catch (err) {
      console.error('Failed to generate feedback:', err);
      setIsEnding(false);
    }
  };

  const glowColor = EMOTION_COLORS[emotion];
  const studentTurnCount = turns.filter((t) => t.speaker === 'student').length;
  const showWrapUp = studentTurnCount >= 8;

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ background: 'oklch(0.075 0.018 255)' }}
    >
      {/* ── Top bar ── */}
      <header
        className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'oklch(0.14 0.014 255)', background: 'oklch(0.085 0.018 255)' }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: 'oklch(0.45 0.02 255)' }}
            onClick={() => window.speechSynthesis.cancel()}
          >
            ← Back
          </Link>
          <span style={{ color: 'oklch(0.25 0.016 255)' }}>|</span>
          <span className="text-sm font-medium" style={{ color: 'oklch(0.7 0.018 255)' }}>
            {scenario.title}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {showWrapUp && (
            <span className="text-xs px-2.5 py-1 rounded-full animate-fade-in"
              style={{ background: 'oklch(0.72 0.14 200 / 0.1)', color: 'oklch(0.72 0.14 200)' }}>
              Ready to end?
            </span>
          )}
          <button
            id="btn-end-session"
            onClick={endSession}
            disabled={isEnding}
            className="text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50"
            style={{ background: 'oklch(0.64 0.22 25 / 0.15)', color: '#f87171', border: '1px solid oklch(0.64 0.22 25 / 0.3)' }}
          >
            {isEnding ? 'Generating feedback…' : 'End Session'}
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Avatar panel ── */}
        <div
          className="flex flex-col items-center justify-center gap-6 px-8 py-8 flex-shrink-0"
          style={{
            width: 380,
            borderRight: '1px solid oklch(0.14 0.014 255)',
            background: 'oklch(0.08 0.017 255)',
          }}
        >
          {/* Patient info */}
          <div className="text-center w-full">
            <h2 className="font-semibold text-lg" style={{ color: 'oklch(0.92 0.012 255)' }}>
              {scenario.patientName}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.48 0.02 255)' }}>
              Age {scenario.patientAge} · {scenario.title}
            </p>
          </div>

          {/* Avatar */}
          <div className="animate-breathe">
            <Avatar
              emotion={emotion}
              intensity={intensity}
              isSpeaking={isSpeaking}
              isListening={isMicActive}
              size={260}
            />
          </div>

          {/* Emotion badge */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-700"
            style={{
              background: `${glowColor}15`,
              border: `1px solid ${glowColor}35`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: glowColor, boxShadow: `0 0 6px ${glowColor}` }}
            />
            <span className="text-sm font-medium" style={{ color: glowColor }}>
              {EMOTION_LABELS[emotion]}
            </span>
            <span className="text-xs ml-1" style={{ color: `${glowColor}80` }}>
              {Math.round(intensity * 100)}%
            </span>
          </div>

          {/* Voice orb */}
          <div className="mt-2">
            <VoiceOrb
              isSpeaking={isSpeaking}
              isListening={isMicActive}
              isIdle={!isSpeaking && !isMicActive}
              color={glowColor}
              size={100}
            />
          </div>

          {/* Mute toggle */}
          <button
            id="btn-mute-toggle"
            onClick={toggleMute}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 mt-4"
            style={{
              background: 'oklch(0.12 0.014 255)',
              border: '1px solid oklch(0.17 0.016 255)',
              color: isMuted ? '#f87171' : 'oklch(0.48 0.02 255)',
            }}
          >
            {isMuted ? '🔇 Unmute patient' : '🔊 Mute patient'}
          </button>
        </div>

        {/* ── Right: Chat panel ── */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
            {turns.map((turn, i) => (
              <div
                key={i}
                className="flex gap-3 animate-fade-in-up"
                style={{
                  justifyContent: turn.speaker === 'student' ? 'flex-end' : 'flex-start',
                  animationDelay: '0ms',
                }}
              >
                {/* Patient avatar dot */}
                {turn.speaker === 'patient' && (
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold mt-1"
                    style={{ background: 'oklch(0.14 0.016 255)', color: 'oklch(0.72 0.14 200)' }}
                  >
                    {scenario.patientName.charAt(0)}
                  </div>
                )}

                <div
                  className="max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={
                    turn.speaker === 'student'
                      ? {
                          background: 'oklch(0.72 0.14 200)',
                          color: 'oklch(0.08 0.018 255)',
                          borderBottomRightRadius: 6,
                        }
                      : {
                          background: 'oklch(0.12 0.016 255)',
                          color: 'oklch(0.88 0.012 255)',
                          border: '1px solid oklch(0.18 0.016 255)',
                          borderBottomLeftRadius: 6,
                        }
                  }
                >
                  {turn.text}
                  {turn.speaker === 'patient' && turn.emotion && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: EMOTION_COLORS[turn.emotion as EmotionType] }}
                      />
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: EMOTION_COLORS[turn.emotion as EmotionType] + 'aa' }}
                      >
                        {EMOTION_LABELS[turn.emotion as EmotionType]} · {Math.round((turn.intensity ?? 0) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-fade-in">
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold mt-1"
                  style={{ background: 'oklch(0.14 0.016 255)', color: 'oklch(0.72 0.14 200)' }}
                >
                  {scenario.patientName.charAt(0)}
                </div>
                <div
                  className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
                  style={{
                    background: 'oklch(0.12 0.016 255)',
                    border: '1px solid oklch(0.18 0.016 255)',
                    borderBottomLeftRadius: 6,
                  }}
                >
                  {[0, 1, 2].map((j) => (
                    <div
                      key={j}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: 'oklch(0.45 0.02 255)',
                        animation: `orb-pulse 1.2s ease-in-out ${j * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input bar ── */}
          <div
            className="flex-shrink-0 px-6 py-4 border-t flex gap-3 items-end"
            style={{ borderColor: 'oklch(0.14 0.014 255)', background: 'oklch(0.085 0.018 255)' }}
          >
            {/* Mic button */}
            <button
              id="btn-mic"
              onClick={toggleMic}
              disabled={!micSupported || isLoading || isEnding}
              title={!micSupported ? 'Voice not supported in this browser' : isMicActive ? 'Stop recording' : 'Start recording'}
              className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg transition-all duration-200 disabled:opacity-40"
              style={{
                background: isMicActive
                  ? 'oklch(0.64 0.22 25 / 0.2)'
                  : 'oklch(0.13 0.014 255)',
                border: isMicActive
                  ? '1.5px solid #f87171'
                  : '1px solid oklch(0.2 0.016 255)',
                color: isMicActive ? '#f87171' : 'oklch(0.5 0.02 255)',
                boxShadow: isMicActive ? '0 0 12px #f8717140' : 'none',
              }}
            >
              {isMicActive ? '⏹' : '🎤'}
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                id="input-student-message"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={isMicActive ? 'Listening…' : 'Type your response…'}
                disabled={isLoading || isEnding}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'oklch(0.11 0.014 255)',
                  border: '1px solid oklch(0.2 0.016 255)',
                  color: 'oklch(0.92 0.012 255)',
                }}
              />
            </div>

            {/* Send button */}
            <button
              id="btn-send"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isEnding}
              className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-base font-bold transition-all duration-200 disabled:opacity-30 active:scale-95"
              style={{
                background: 'oklch(0.72 0.14 200)',
                color: 'oklch(0.08 0.018 255)',
              }}
            >
              ↑
            </button>
          </div>

          {/* Turn counter / hint */}
          <div
            className="px-6 py-2 flex items-center justify-between text-xs"
            style={{ color: 'oklch(0.38 0.016 255)', background: 'oklch(0.08 0.017 255)' }}
          >
            <span>{studentTurnCount} {studentTurnCount === 1 ? 'exchange' : 'exchanges'}</span>
            {showWrapUp && (
              <span style={{ color: 'oklch(0.72 0.14 200)' }}>
                Good session length — end when ready
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Generating feedback overlay */}
      {isEnding && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center gap-4 z-50 animate-fade-in"
          style={{ background: 'oklch(0.075 0.018 255 / 0.92)', backdropFilter: 'blur(12px)' }}
        >
          <div
            className="w-14 h-14 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'oklch(0.72 0.14 200)', borderTopColor: 'transparent' }}
          />
          <p className="text-lg font-semibold" style={{ color: 'oklch(0.92 0.012 255)' }}>
            Analysing your session…
          </p>
          <p className="text-sm" style={{ color: 'oklch(0.5 0.02 255)' }}>
            Generating personalised feedback
          </p>
        </div>
      )}
    </div>
  );
}
