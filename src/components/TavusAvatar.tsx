'use client';

/**
 * TavusAvatar — live, photorealistic patient over Tavus CVI.
 *
 * Unlike the Wav2Lip path (one generated clip per turn), this is a persistent
 * real-time WebRTC call. Tavus handles speech recognition, the patient's
 * responses, the voice, and the rendered face. We only join the room and
 * render the remote tracks.
 *
 * Flow:
 *   1. Student clicks "Start video call"  (an explicit gesture is required so
 *      the browser lets us play audio, and so we never create a paid Tavus
 *      conversation just because a page mounted).
 *   2. POST /api/tavus/conversation      → { conversationUrl, ... }
 *   3. Join that URL with a Daily call object.
 *   4. Attach the replica's video/audio tracks to our own elements so the
 *      framing matches the rest of the app.
 *   5. On unmount, leave the room and POST /api/tavus/conversation/end.
 *
 * Transcript: Tavus broadcasts `conversation.utterance` events over the Daily
 * data channel. We forward them to the parent so the transcript panel and the
 * feedback report work exactly as they do in the other avatar modes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import type {
  DailyCall,
  DailyEventObjectAppMessage,
  DailyParticipant,
} from '@daily-co/daily-js';
import type { EmotionType, TavusConversation, TavusStatus } from '@/lib/types';

/* ─── Props ──────────────────────────────────────────────────────────────── */

export interface TavusAvatarProps {
  scenarioId: string;
  patientName: string;
  /** Frame width in px. Height is derived as a 4:5 portrait. */
  size?: number;
  /** Current patient emotion — drives the ambient glow only. */
  emotion?: EmotionType;
  /** Student microphone on/off, controlled by the parent. */
  micEnabled?: boolean;
  /** Mute the patient's voice (the header audio toggle). */
  patientMuted?: boolean;
  /** Send the student's camera to Tavus so the patient can "see" them. */
  cameraEnabled?: boolean;
  onStatusChange?: (status: TavusStatus) => void;
  onUtterance?: (utterance: { role: 'student' | 'patient'; text: string }) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  onConversationReady?: (conversation: TavusConversation) => void;
  onError?: (message: string) => void;
}

/* ─── Ambient glow, matched to the Mii avatar ────────────────────────────── */

const GLOW_COLORS: Record<EmotionType, string> = {
  neutral: '#9eb299',
  sad: '#9ec5f2',
  angry: '#f49797',
  anxious: '#fab475',
  distressed: '#f49797',
  relieved: '#9eb299',
  calm: '#d3aef6',
};

const STATUS_TEXT: Partial<Record<TavusStatus, string>> = {
  creating: 'Connecting to the clinic',
  joining: 'Joining the consultation room',
  waiting: 'Patient is joining',
  ended: 'Call ended',
};

/* ─── Tavus data-channel event shapes (only what we consume) ─────────────── */

interface TavusEvent {
  message_type?: string;
  event_type?: string;
  properties?: {
    role?: string;
    speech?: string;
    text?: string;
  };
}

/** Tavus uses "pal" (current) and "replica" (legacy) for the patient side. */
function normaliseRole(role: string | undefined): 'student' | 'patient' | null {
  if (!role) return null;
  if (role === 'user' || role === 'participant') return 'student';
  if (role === 'pal' || role === 'replica' || role === 'assistant') return 'patient';
  return null;
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function TavusAvatar({
  scenarioId,
  patientName,
  size = 300,
  emotion = 'neutral',
  micEnabled = true,
  patientMuted = false,
  cameraEnabled = false,
  onStatusChange,
  onUtterance,
  onSpeakingChange,
  onConversationReady,
  onError,
}: TavusAvatarProps) {
  const [status, setStatus] = useState<TavusStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPatientSpeaking, setIsPatientSpeaking] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [cameraOn, setCameraOn] = useState(cameraEnabled);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const videoTrackIdRef = useRef<string | null>(null);
  const audioTrackIdRef = useRef<string | null>(null);
  const teardownRef = useRef(false);

  // Keep callbacks in refs so the Daily event handlers never go stale.
  const cb = useRef({ onStatusChange, onUtterance, onSpeakingChange, onConversationReady, onError });
  useEffect(() => {
    cb.current = { onStatusChange, onUtterance, onSpeakingChange, onConversationReady, onError };
  }, [onStatusChange, onUtterance, onSpeakingChange, onConversationReady, onError]);

  const glowColor = GLOW_COLORS[emotion];
  const frameW = size;
  const frameH = Math.round(size * 1.18);

  const updateStatus = useCallback((next: TavusStatus) => {
    setStatus(next);
    cb.current.onStatusChange?.(next);
  }, []);

  const fail = useCallback(
    (message: string) => {
      setErrorMessage(message);
      updateStatus('error');
      cb.current.onError?.(message);
    },
    [updateStatus],
  );

  /* ── Attach the patient's media tracks to our own elements ───────────── */

  const attachRemoteTracks = useCallback((call: DailyCall) => {
    const remote = Object.values(call.participants()).find(
      (p): p is DailyParticipant => Boolean(p) && !p.local,
    );
    if (!remote) return;

    const videoTrack = remote.tracks?.video?.persistentTrack;
    const audioTrack = remote.tracks?.audio?.persistentTrack;

    if (videoTrack && videoRef.current && videoTrackIdRef.current !== videoTrack.id) {
      videoTrackIdRef.current = videoTrack.id;
      videoRef.current.srcObject = new MediaStream([videoTrack]);
      void videoRef.current.play().catch(() => {
        /* muted video autoplay is allowed; ignore transient failures */
      });
      updateStatus('live');
    }

    if (audioTrack && audioRef.current && audioTrackIdRef.current !== audioTrack.id) {
      audioTrackIdRef.current = audioTrack.id;
      audioRef.current.srcObject = new MediaStream([audioTrack]);
      audioRef.current
        .play()
        .then(() => setAudioBlocked(false))
        .catch(() => setAudioBlocked(true));
    }
  }, [updateStatus]);

  /* ── Tavus data-channel events → transcript + speaking state ─────────── */

  const handleAppMessage = useCallback((event?: DailyEventObjectAppMessage) => {
    const data = event?.data as TavusEvent | undefined;
    const eventType = data?.event_type;
    if (!eventType) return;

    if (eventType.endsWith('utterance')) {
      const role = normaliseRole(data?.properties?.role);
      const text = (data?.properties?.speech ?? data?.properties?.text ?? '').trim();
      if (role && text) cb.current.onUtterance?.({ role, text });
      return;
    }

    if (eventType.includes('started_speaking')) {
      const role = normaliseRole(data?.properties?.role) ?? 'patient';
      if (role === 'patient') {
        setIsPatientSpeaking(true);
        cb.current.onSpeakingChange?.(true);
      }
      return;
    }

    if (eventType.includes('stopped_speaking')) {
      const role = normaliseRole(data?.properties?.role) ?? 'patient';
      if (role === 'patient') {
        setIsPatientSpeaking(false);
        cb.current.onSpeakingChange?.(false);
      }
    }
  }, []);

  /* ── Start the call (explicit user gesture) ──────────────────────────── */

  const startCall = useCallback(async () => {
    if (callRef.current || status === 'creating' || status === 'joining') return;

    teardownRef.current = false;
    setErrorMessage('');
    updateStatus('creating');

    // 1. Create the conversation server-side.
    let conversation: TavusConversation;
    try {
      const res = await fetch('/api/tavus/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        fail(data.error ?? 'The live video patient could not be started.');
        return;
      }
      conversation = data as TavusConversation;
    } catch {
      fail('Network error while starting the live video patient.');
      return;
    }

    if (teardownRef.current) return;
    conversationIdRef.current = conversation.conversationId;
    cb.current.onConversationReady?.(conversation);

    // 2. Join the Tavus-hosted Daily room.
    updateStatus('joining');
    try {
      const DailyIframe = (await import('@daily-co/daily-js')).default;

      // Only one call object may exist per window.
      const existing = DailyIframe.getCallInstance();
      if (existing) await existing.destroy().catch(() => undefined);

      const call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: cameraOn,
        // We render the tracks ourselves, so Daily should not create elements.
        dailyConfig: { useDevicePreferenceCookies: false },
      });
      callRef.current = call;

      call
        .on('participant-joined', () => attachRemoteTracks(call))
        .on('participant-updated', () => attachRemoteTracks(call))
        .on('track-started', () => attachRemoteTracks(call))
        .on('app-message', handleAppMessage)
        .on('left-meeting', () => {
          if (!teardownRef.current) updateStatus('ended');
        })
        .on('error', (event) => {
          if (teardownRef.current) return;
          fail(event?.errorMsg ?? 'The video connection dropped.');
        });

      await call.join({
        url: conversation.conversationUrl,
        ...(conversation.meetingToken ? { token: conversation.meetingToken } : {}),
        startVideoOff: !cameraOn,
        startAudioOff: !micEnabled,
      });

      if (teardownRef.current) return;
      updateStatus('waiting');
      attachRemoteTracks(call);
    } catch (error) {
      if (teardownRef.current) return;
      fail(
        error instanceof Error && /permission|notallowed/i.test(error.message)
          ? 'Microphone access was blocked. Allow the microphone and try again.'
          : 'Could not join the consultation room.',
      );
    }
  }, [attachRemoteTracks, cameraOn, fail, handleAppMessage, micEnabled, scenarioId, status, updateStatus]);

  /* ── Mic / camera toggles follow the parent ──────────────────────────── */

  useEffect(() => {
    callRef.current?.setLocalAudio(micEnabled);
  }, [micEnabled]);

  useEffect(() => {
    callRef.current?.setLocalVideo(cameraOn);
  }, [cameraOn]);



  /* ── Teardown: leave the room and release the Tavus conversation ─────── */

  useEffect(() => {
    function endConversationBeacon() {
      const conversationId = conversationIdRef.current;
      if (!conversationId) return;
      const payload = JSON.stringify({ conversationId });
      // sendBeacon survives page unload; fetch does not.
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/tavus/conversation/end', new Blob([payload], { type: 'application/json' }));
      }
    }

    window.addEventListener('pagehide', endConversationBeacon);

    return () => {
      window.removeEventListener('pagehide', endConversationBeacon);
      teardownRef.current = true;

      const call = callRef.current;
      callRef.current = null;
      if (call) {
        void call
          .leave()
          .catch(() => undefined)
          .finally(() => void call.destroy().catch(() => undefined));
      }

      const conversationId = conversationIdRef.current;
      conversationIdRef.current = null;
      if (conversationId) {
        void fetch('/api/tavus/conversation/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId }),
          keepalive: true,
        }).catch(() => undefined);
      }
    };
  }, []);

  /* ── Render ──────────────────────────────────────────────────────────── */

  const isConnecting = status === 'creating' || status === 'joining' || status === 'waiting';
  const showVideo = status === 'live';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          position: 'relative',
          width: frameW,
          height: frameH,
          borderRadius: 20,
          overflow: 'hidden',
          background: '#15171a',
          border: '1px solid var(--border)',
          boxShadow: showVideo
            ? `0 18px 48px rgba(20,22,26,0.22), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 ${isPatientSpeaking ? 34 : 0}px ${glowColor}66`
            : '0 10px 30px rgba(20,22,26,0.12)',
          transition: 'box-shadow 0.5s ease',
          flexShrink: 0,
        }}
      >
        {/* Patient video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: showVideo ? 'block' : 'none',
          }}
        />
        {/* Patient audio, rendered separately so we can recover from autoplay
            blocks and so the header audio toggle can mute it independently. */}
        <audio ref={audioRef} autoPlay muted={patientMuted} />

        {/* Soft vignette + bottom scrim keeps real footage looking composed */}
        {showVideo && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(120% 90% at 50% 30%, transparent 55%, rgba(10,11,13,0.34) 100%), linear-gradient(to top, rgba(10,11,13,0.55) 0%, transparent 32%)',
            }}
          />
        )}

        {/* LIVE badge */}
        {showVideo && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 9px',
              borderRadius: 999,
              background: 'rgba(10,11,13,0.55)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#f47272',
                animation: 'orb-pulse 1.4s ease-in-out infinite',
              }}
            />
            <span
              className="font-mono"
              style={{ fontSize: 9, color: 'rgba(255,255,255,0.88)', letterSpacing: '0.12em' }}
            >
              LIVE
            </span>
          </div>
        )}

        {/* Name plate */}
        {showVideo && (
          <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>
              {patientName}
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em' }}
            >
              {isPatientSpeaking ? 'SPEAKING' : 'LISTENING'}
            </div>
          </div>
        )}

        {/* Pre-join panel */}
        {status === 'idle' && (
          <div style={overlayStyle}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            >
              <Video size={26} color="rgba(255,255,255,0.8)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.94)' }}>
                {patientName} is ready
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                Speak naturally. They will hear you and reply in real time.
              </div>
            </div>
            <button
              id="btn-tavus-start"
              onClick={() => void startCall()}
              style={{
                padding: '11px 22px',
                borderRadius: 'var(--r)',
                background: 'var(--accent)',
                color: '#14161a',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Start video call
            </button>
          </div>
        )}

        {/* Connecting states */}
        {isConnecting && (
          <div style={overlayStyle}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.16)',
                borderTopColor: 'var(--accent)',
                animation: 'spin-r 0.75s linear infinite',
              }}
            />
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>
              {STATUS_TEXT[status]}
            </div>
            <div className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.1em' }}>
              THIS TAKES A FEW SECONDS
            </div>
          </div>
        )}

        {/* Ended */}
        {status === 'ended' && (
          <div style={overlayStyle}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>{STATUS_TEXT.ended}</div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={overlayStyle}>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.9)',
                textAlign: 'center',
                lineHeight: 1.5,
                maxWidth: 240,
              }}
            >
              {errorMessage}
            </div>
            <button
              onClick={() => {
                updateStatus('idle');
                setErrorMessage('');
              }}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--r)',
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(255,255,255,0.18)',
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Audio unblock prompt — browsers can refuse programmatic playback */}
      {audioBlocked && showVideo && (
        <button
          onClick={() => {
            audioRef.current
              ?.play()
              .then(() => setAudioBlocked(false))
              .catch(() => undefined);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 14px',
            borderRadius: 'var(--r)',
            background: 'var(--warn)',
            border: 'none',
            color: '#2d2b2a',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <Volume2 size={14} />
          Tap to hear {patientName.split(' ')[0]}
        </button>
      )}

      {/* Call footer: mic + camera state */}
      {showVideo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="font-mono"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 9,
              letterSpacing: '0.1em',
              color: micEnabled ? 'var(--accent-dim)' : 'var(--danger)',
            }}
          >
            {micEnabled ? <Mic size={12} /> : <MicOff size={12} />}
            {micEnabled ? 'MIC LIVE' : 'MIC MUTED'}
          </span>
          <span style={{ color: 'var(--text-3)', fontSize: 9 }}>·</span>
          <button
            onClick={() => setCameraOn((c) => !c)}
            title={
              cameraOn
                ? 'Turn your camera off'
                : 'Turn your camera on so the patient can read your body language'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 9,
              letterSpacing: '0.1em',
              color: cameraOn ? 'var(--accent-dim)' : 'var(--text-3)',
            }}
          >
            {cameraOn ? <Video size={12} /> : <VideoOff size={12} />}
            {cameraOn ? 'CAMERA ON' : 'CAMERA OFF'}
          </button>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  padding: 24,
  background: 'linear-gradient(180deg, #1b1e22 0%, #14161a 100%)',
};
