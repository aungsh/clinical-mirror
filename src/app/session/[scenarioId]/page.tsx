'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mic, Square, Volume2, VolumeX, ArrowUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { scenarios } from '@/lib/scenario-catalog';
import { Turn, EmotionType } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { VoiceOrb } from '@/components/VoiceOrb';
import { speakEmotional, cancelSpeech, initVoices } from '@/lib/tts';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const EMOTION_COLORS: Record<EmotionType, string> = {
  neutral:    '#9eb299',
  sad:        '#9ec5f2',
  angry:      '#f49797',
  anxious:    '#fab475',
  distressed: '#f49797',
  relieved:   '#9eb299',
  calm:       '#d3aef6',
};

const EMOTION_LABELS: Record<EmotionType, string> = {
  neutral: 'Neutral', sad: 'Sad', angry: 'Angry',
  anxious: 'Anxious', distressed: 'Distressed', relieved: 'Relieved', calm: 'Calm',
};

const DIFF_COLORS = {
  easy:   '#9eb299',
  medium: '#fab475',
  hard:   '#f49797',
};

type Stage = 'brief' | 'active';

/* ─── Briefing Screen ────────────────────────────────────────────────────── */

function BriefingScreen({
  scenario,
  onBegin,
}: {
  scenario: (typeof scenarios)[0];
  onBegin: () => void;
}) {
  const diffColor = DIFF_COLORS[scenario.difficulty];
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        flexShrink: 0,
      }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}
          onClick={() => cancelSpeech()}>
          ← Scenarios
        </Link>
        <span className="font-mono" style={{
          fontSize: 10, color: diffColor, letterSpacing: '0.12em',
          padding: '3px 8px', border: `1px solid ${diffColor}25`,
          borderRadius: 4, background: `${diffColor}08`,
        }}>
          {scenario.difficulty.toUpperCase()}
        </span>
      </header>

      <main style={{ flex: 1, padding: '48px 40px', maxWidth: 900, width: '100%', margin: '0 auto' }}>

        {/* Title */}
        <div style={{ marginBottom: 48 }}>
          <p className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.14em', marginBottom: 12 }}>
            MISSION BRIEF
          </p>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700,
            letterSpacing: '-0.025em', lineHeight: 1.05,
            color: 'var(--text-1)', margin: 0,
          }}>
            {scenario.title}
          </h1>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 48 }}>

          {/* Left: Patient profile */}
          <div>
            {/* Avatar */}
            <div style={{
              display: 'flex', justifyContent: 'center',
              padding: '24px 0',
              marginBottom: 24,
              borderBottom: '1px solid var(--border)',
            }}>
              <Avatar
                emotion="neutral"
                intensity={scenario.initialIntensity}
                variant={scenario.avatarVariant}
                size={200}
              />
            </div>

            {/* Patient details */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Name', scenario.patientName],
                  ['Age', String(scenario.patientAge)],
                  ['Starting state', `${Math.round(scenario.initialIntensity * 100)}% intensity`],
                  ['Session length', `${scenario.maxTurns} exchanges`],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                    <td className="font-mono" style={{
                      fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em',
                      padding: '10px 0', paddingRight: 16, verticalAlign: 'top', whiteSpace: 'nowrap',
                    }}>
                      {k.toUpperCase()}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-2)', padding: '10px 0' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 20 }}>
              <p className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 8 }}>
                BACKGROUND
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
                {scenario.patientBackground}
              </p>
            </div>
          </div>

          {/* Right: Mission */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Context */}
            <div>
              <p className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', marginBottom: 10 }}>
                CLINICAL CONTEXT
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
                {scenario.clinicalContext}
              </p>
            </div>

            {/* Goal */}
            <div style={{
              padding: '16px 20px',
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-bd)',
              borderRadius: 'var(--r)',
            }}>
              <p className="font-mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.12em', marginBottom: 8 }}>
                YOUR GOAL
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                {scenario.sessionGoal}
              </p>
            </div>

            {/* Objectives */}
            <div>
              <p className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', marginBottom: 10 }}>
                LEARNING OBJECTIVES
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scenario.objectives.map((obj, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0, paddingTop: 2 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{obj}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Do / Avoid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--primary)', letterSpacing: '0.12em', marginBottom: 10 }}>
                  TRY THIS
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {scenario.doList.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
                      <span style={{ color: 'var(--primary)', opacity: 0.6, flexShrink: 0 }}>+</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--destructive)', letterSpacing: '0.12em', marginBottom: 10 }}>
                  AVOID THIS
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {scenario.avoidList.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
                      <span style={{ color: 'var(--destructive)', opacity: 0.6, flexShrink: 0 }}>-</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ paddingTop: 8 }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', maxWidth: 520, marginBottom: 16, fontSize: 12, lineHeight: 1.5, color: 'var(--text-2)' }}>
                <input type="checkbox" checked={privacyAccepted} onChange={event => setPrivacyAccepted(event.target.checked)} style={{ marginTop: 3 }} />
                <span>I understand this is an educational AI simulation. My transcript is sent to Gemini for a response and formative feedback, so I will not enter real patient names or identifiable information.</span>
              </label>
              <button
                id="btn-begin-session"
                onClick={onBegin}
                disabled={!privacyAccepted}
                style={{
                  padding: '14px 32px',
                  background: 'var(--accent)',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: 'var(--r)',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: privacyAccepted ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  transition: 'opacity 0.15s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  opacity: privacyAccepted ? 1 : 0.45,
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Begin Session
                <span style={{ fontSize: 18 }}>→</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Active Session ─────────────────────────────────────────────────────── */

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
  const [activePanel, setActivePanel] = useState<'none' | 'transcript' | 'briefing'>('none');
  const [shouldAutoSend, setShouldAutoSend] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [patientTurnCount, setPatientTurnCount] = useState(0);
  const [lastPatientText, setLastPatientText] = useState(scenario.openingLine);
  const [requestError, setRequestError] = useState('');

  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const W = window as unknown as Record<string, unknown>;
      if (!W.SpeechRecognition && !W.webkitSpeechRecognition) setMicSupported(false);
    }
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, activePanel]);

  const speak = useCallback((text: string, emo: EmotionType) => {
    if (isMuted) return;
    speakEmotional(text, emo, {
      onStart: () => setIsSpeaking(true),
      onEnd:   () => setIsSpeaking(false),
    });
  }, [isMuted]);

  useEffect(() => {
    const opening: Turn = {
      speaker: 'patient', text: scenario.openingLine,
      emotion: 'neutral', intensity: scenario.initialIntensity,
      timestamp: Date.now(),
    };
    setTurns([opening]);
    setLastPatientText(scenario.openingLine);
    setPatientTurnCount(1);
    initVoices().then(() => setTimeout(() => speak(scenario.openingLine, 'neutral'), 300));
    return () => cancelSpeech();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const txt = input.trim();
    setInput('');
    setRequestError('');
    cancelSpeech();
    setIsSpeaking(false);

    const studentTurn: Turn = { speaker: 'student', text: txt, timestamp: Date.now() };
    const next = [...turns, studentTurn];
    setTurns(next);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: scenario.id, history: next, studentMessage: txt }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const emo = data.emotion as EmotionType;
        const pt: Turn = {
          speaker: 'patient', text: data.reply, emotion: emo,
          intensity: data.intensity, timestamp: Date.now(),
        };
        setTurns(p => [...p, pt]);
        setEmotion(emo);
        setIntensity(data.intensity);
        setLastPatientText(data.reply);
        setPatientTurnCount(c => c + 1);
        speak(data.reply, emo);
      } else {
        setInput(txt);
        setRequestError(data.error ?? 'The simulated patient could not respond. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setInput(txt);
      setRequestError('Network error. Check that the development server is running, then try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (shouldAutoSend) {
      if (input.trim() && !isLoading) {
        sendMessage();
      }
      setShouldAutoSend(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoSend, input, isLoading]);

  const toggleMic = () => {
    if (!micSupported) return;
    const W = window as unknown as Record<string, unknown>;
    const SR = (W.SpeechRecognition ?? W.webkitSpeechRecognition) as any;
    if (!SR) return;
    if (isMicActive) { recognitionRef.current?.stop(); setIsMicActive(false); return; }
    cancelSpeech(); setIsSpeaking(false);
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false;
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setInput(p => p ? p + ' ' + t : t);
    };
    rec.onend = () => {
      setIsMicActive(false);
      setShouldAutoSend(true);
    };
    rec.onerror = () => setIsMicActive(false);
    rec.start();
    recognitionRef.current = rec;
    setIsMicActive(true);
  };

  const handleEnd = () => {
    const sc = turns.filter(t => t.speaker === 'student').length;
    if (sc < 2) { alert('Please have at least a couple of exchanges first.'); return; }
    cancelSpeech();
    recognitionRef.current?.stop();
    onEnd(turns);
  };

  const ec = EMOTION_COLORS[emotion];
  const studentCount = turns.filter(t => t.speaker === 'student').length;

  // Progress toward goal
  const initI = scenario.initialIntensity;
  const progress = initI > 0.35
    ? Math.max(0, Math.min(1, (initI - intensity) / initI))
    : Math.min(1, patientTurnCount / scenario.maxTurns);
  const nearEnd = patientTurnCount >= scenario.maxTurns;

  return (
    <div style={{ background: 'var(--bg)', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Progress bar: 2px line at very top */}
      <div style={{ height: 2, background: 'var(--border)', flexShrink: 0 }}>
        <div style={{
          height: '100%', width: `${Math.round(progress * 100)}%`,
          background: 'var(--accent)',
          transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>

      {/* Top bar */}
      <header className="header-bar" style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '12px 24px', flexShrink: 0,
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        <span className="header-title" style={{ fontSize: 13, color: 'var(--text-2)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {scenario.patientName} · {scenario.title}
        </span>

        <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', flexShrink: 0 }}>
          {patientTurnCount}/{scenario.maxTurns}
        </span>

        <button
          onClick={() => { if (!isMuted) cancelSpeech(); setIsMuted(m => !m); }}
          style={{
            padding: '5px 10px', borderRadius: 'var(--r)',
            background: 'var(--surface-2)', border: `1px solid ${isMuted ? 'var(--danger-bd)' : 'var(--border)'}`,
            color: isMuted ? 'var(--danger)' : 'var(--text-3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
          }}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          {isMuted ? 'MUTED' : 'AUDIO'}
        </button>

        <button
          id="btn-toggle-briefing"
          onClick={() => setActivePanel(p => p === 'briefing' ? 'none' : 'briefing')}
          style={{
            padding: '5px 12px', fontSize: 12, borderRadius: 'var(--r)',
            background: activePanel === 'briefing' ? 'var(--accent-bg)' : 'var(--surface-2)',
            border: `1px solid ${activePanel === 'briefing' ? 'var(--accent-bd)' : 'var(--border)'}`,
            color: activePanel === 'briefing' ? 'var(--accent)' : 'var(--text-2)',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          Briefing
        </button>

        <button
          id="btn-toggle-transcript"
          onClick={() => setActivePanel(p => p === 'transcript' ? 'none' : 'transcript')}
          style={{
            padding: '5px 12px', fontSize: 12, borderRadius: 'var(--r)',
            background: activePanel === 'transcript' ? 'var(--accent-bg)' : 'var(--surface-2)',
            border: `1px solid ${activePanel === 'transcript' ? 'var(--accent-bd)' : 'var(--border)'}`,
            color: activePanel === 'transcript' ? 'var(--accent)' : 'var(--text-2)',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          Transcript
        </button>

        <button
          id="btn-end-session"
          onClick={handleEnd}
          style={{
            padding: '5px 12px', fontSize: 12, borderRadius: 'var(--r)',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-bd)',
            color: 'var(--danger)',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'opacity 0.15s',
            marginLeft: 'auto',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          End Session
        </button>
      </header>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Center stage */}
        <div className="main-stage" style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 20, padding: '16px 24px', overflow: 'hidden',
        }}>

          {/* Patient speech */}
          <div style={{
            maxWidth: 520, width: '100%',
            padding: '14px 20px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r)',
            minHeight: 56,
            display: 'flex', alignItems: 'center',
          }}>
            {isLoading ? (
              <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0,1,2].map(j => (
                  <span key={j} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--text-3)', display: 'inline-block',
                    animation: `orb-pulse 1s ease-in-out ${j * 0.17}s infinite`,
                  }} />
                ))}
              </span>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>
                {lastPatientText}
              </p>
            )}
          </div>

          {/* Avatar */}
          <div className="animate-breathe avatar-wrapper">
            <Avatar
              emotion={emotion}
              intensity={intensity}
              variant={scenario.avatarVariant}
              isSpeaking={isSpeaking}
              isListening={isMicActive}
              size={280}
            />
          </div>

          {/* Emotion label - simple, no glow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="font-mono" style={{ fontSize: 10, color: ec, letterSpacing: '0.1em' }}>
              {EMOTION_LABELS[emotion].toUpperCase()}
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: 10, margin: '0 2px' }}>,</span>
            <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em' }}>
              {Math.round(intensity * 100)}%
            </span>
          </div>

          {/* Orb */}
          <VoiceOrb
            isSpeaking={isSpeaking}
            isListening={isMicActive}
            isIdle={!isSpeaking && !isMicActive}
            color={ec}
            size={90}
          />

          {nearEnd && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
              Good session length - end when ready
            </p>
          )}
        </div>

        {/* Side panel */}
        {activePanel !== 'none' && (
          <div className="side-panel" style={{
            width: 320, borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            background: 'var(--surface)', flexShrink: 0,
            zIndex: 50,
          }}>
            {activePanel === 'transcript' && (
              <>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.14em' }}>
                    TRANSCRIPT
                  </span>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--text-3)' }}>
                    {studentCount} exchanges
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {turns.map((t, i) => (
                    <div key={i} style={{
                      fontSize: 12, lineHeight: 1.5,
                      color: t.speaker === 'student' ? 'var(--text-1)' : 'var(--text-2)',
                      padding: '8px 12px',
                      borderRadius: 'var(--r)',
                      background: t.speaker === 'student' ? 'var(--surface-2)' : 'transparent',
                      border: t.speaker === 'student' ? '1px solid var(--border)' : 'none',
                    }}>
                      <span style={{
                        fontWeight: 600, marginRight: 6,
                        color: t.speaker === 'student' ? 'var(--accent)' : 'var(--text-3)',
                        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                      }}>
                        {t.speaker === 'student' ? 'YOU' : scenario.patientName.split(' ')[0].toUpperCase()}
                      </span>
                      {t.text}
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              </>
            )}

            {activePanel === 'briefing' && (
              <>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                }}>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.14em' }}>
                    MISSION BRIEF
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div>
                    <div className="font-mono" style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 6 }}>GOAL</div>
                    <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5, fontWeight: 500, padding: '8px 12px', background: 'var(--accent-bg)', border: '1px solid var(--accent-bd)', borderRadius: 'var(--r)' }}>
                      {scenario.sessionGoal}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono" style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 6 }}>BACKGROUND</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                      {scenario.patientBackground}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono" style={{ fontSize: 9, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: 8 }}>TRY THIS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {scenario.doList.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
                          <span style={{ color: 'var(--primary)', opacity: 0.6, flexShrink: 0 }}>+</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono" style={{ fontSize: 9, color: 'var(--destructive)', letterSpacing: '0.1em', marginBottom: 8 }}>AVOID THIS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {scenario.avoidList.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
                          <span style={{ color: 'var(--destructive)', opacity: 0.6, flexShrink: 0 }}>-</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Siri-style Input Area using Tabs */}
      <div className="input-area" style={{
        flexShrink: 0, padding: '24px',
        borderTop: '1px solid var(--border)', background: 'var(--surface)',
        display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center',
      }}>
        {requestError && (
          <div role="alert" style={{ width: '100%', maxWidth: 480, marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--r)', background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--text-1)', fontSize: 12 }}>
            {requestError}
          </div>
        )}
        <Tabs className="tabs-container" defaultValue="voice" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          
          <TabsContent value="voice" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minHeight: 140, justifyContent: 'center', outline: 'none' }}>
            <button
              onClick={toggleMic}
              disabled={!micSupported || isLoading}
              style={{
                width: 90, height: 90, borderRadius: '50%',
                background: isMicActive ? 'var(--danger-bg)' : 'var(--accent)',
                color: isMicActive ? 'var(--danger)' : '#ffffff',
                border: isMicActive ? '2px solid var(--danger)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isMicActive ? '0 0 30px rgba(244, 151, 151, 0.4)' : '0 8px 24px rgba(158, 178, 153, 0.4)',
                transform: isMicActive ? 'scale(1.05)' : 'scale(1)',
                opacity: (!micSupported || isLoading) ? 0.5 : 1,
              }}
            >
              {isMicActive ? <Square size={32} fill="currentColor" /> : <Mic size={36} />}
            </button>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
              {isMicActive ? 'Listening... tap to send' : 'Tap to speak'}
            </div>
            {isMicActive && input && (
              <div style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 300, textAlign: 'center', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                &ldquo;{input}&rdquo;
              </div>
            )}
          </TabsContent>

          <TabsContent value="text" style={{ width: '100%', outline: 'none' }}>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              background: 'var(--surface-2)', padding: '6px',
              borderRadius: '8px', border: '1px solid var(--border)',
            }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Type your response to ${scenario.patientName.split(' ')[0]}...`}
                disabled={isLoading}
                style={{
                  flex: 1, height: 44, padding: '0 14px',
                  background: 'transparent', border: 'none',
                  fontSize: 14, color: 'var(--text-1)',
                  outline: 'none', fontFamily: 'inherit',
                  opacity: isLoading ? 0.5 : 1,
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                style={{
                  height: 44, padding: '0 20px', borderRadius: '6px',
                  background: 'var(--accent)', border: 'none', color: '#ffffff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: (!input.trim() || isLoading) ? 0.35 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <ArrowUp size={20} strokeWidth={2.5} />
              </button>
            </div>
          </TabsContent>

          <TabsList style={{ marginTop: 8 }}>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .side-panel {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 100% !important;
            max-width: 320px;
            box-shadow: -4px 0 24px rgba(0,0,0,0.1);
          }
          .header-bar {
            padding: 12px 16px !important;
            gap: 8px !important;
          }
          .header-title { display: none !important; }
          .main-stage { padding: 16px !important; }
          .avatar-wrapper { transform: scale(0.75); margin: -20px 0; }
          .input-area { padding: 16px !important; }
          .tabs-container { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── Page Orchestrator ──────────────────────────────────────────────────── */

export default function SessionPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = use(params);
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('brief');
  const [isEnding, setIsEnding] = useState(false);

  const scenario = scenarios.find(s => s.id === scenarioId);

  if (!scenario) return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <p style={{ color: 'var(--text-1)' }}>Scenario not found.</p>
      <Link href="/" style={{ color: 'var(--accent)', fontSize: 14 }}>Back to scenarios</Link>
    </div>
  );

  if (scenario.availability !== 'available') return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 560, padding: 32, border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface)' }}>
        <p className="font-mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--warn)' }}>FACULTY REVIEW REQUIRED</p>
        <h1 style={{ color: 'var(--text-1)', fontSize: 28 }}>{scenario.title}</h1>
        <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{scenario.safetyNote}</p>
        <Link href="/" style={{ color: 'var(--accent)', fontSize: 14 }}>Back to available scenarios</Link>
      </div>
    </div>
  );

  const handleEnd = async (turns: Turn[]) => {
    setIsEnding(true);
    const intensityTimeSeries = turns
      .filter(t => t.speaker === 'patient' && t.intensity !== undefined)
      .map(t => t.intensity!);
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
      console.error(err);
      setIsEnding(false);
    }
  };

  return (
    <>
      {stage === 'brief' && <BriefingScreen scenario={scenario} onBegin={() => setStage('active')} />}
      {stage === 'active' && !isEnding && <ActiveSession scenario={scenario} onEnd={handleEnd} />}

      {isEnding && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(253,251,247,0.92)',
          backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 50,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
            animation: 'spin-r 0.7s linear infinite',
          }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>
            Analysing your session
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
            Generating personalised feedback
          </p>
        </div>
      )}
    </>
  );
}
