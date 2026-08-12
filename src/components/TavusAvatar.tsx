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
  /**
   * Optional fixed frame width in px. When omitted the frame is a responsive
   * 4:5 portrait that grows to fill the available stage height.
   */
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
  size,
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
  /** Second, heavily blurred copy of the same stream — the ambient halo. */
  const haloRef = useRef<HTMLVideoElement>(null);
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

  /**
   * Tavus streams 16:9 landscape, so the frame is 16:9 — a portrait frame would
   * crop the sides of the stream away.
   *
   * Height is still the constrained axis inside the session stage, so the frame
   * is driven from viewport height and the aspect ratio derives the width, with
   * a max-width guard for wide-but-short windows.
   */
  const frameSize: React.CSSProperties = size
    ? { width: size, height: Math.round((size * 9) / 16) }
    : {
        /*
         * Driven from width with a definite aspect-ratio so the box can never
         * distort or overflow its column. The vh term is the height budget:
         * 380px is everything else stacked in the session stage (header,
         * caption, emotion readout, call controls), converted to a width via
         * 16/9 so the derived height always fits what is left.
         */
        width: 'max(280px, min(100%, calc((100dvh - 380px) * 16 / 9), 1040px))',
        aspectRatio: '16 / 9',
      };

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

      // The same track feeds the sharp frame and the blurred ambient halo.
      videoRef.current.srcObject = new MediaStream([videoTrack]);
      void videoRef.current.play().catch(() => {
        /* muted video autoplay is allowed; ignore transient failures */
      });

      if (haloRef.current) {
        haloRef.current.srcObject = new MediaStream([videoTrack]);
        void haloRef.current.play().catch(() => undefined);
      }

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        width: '100%',
      }}
    >
      {/* Positioning context for the ambient halo, which bleeds around the frame */}
      <div style={{ position: 'relative', ...frameSize, flexShrink: 0 }}>
        {/* ── Ambient halo (YouTube-style) ──
            A second copy of the live stream, scaled up and heavily blurred, so
            the colour spilling around the frame is genuinely derived from the
            video rather than being a static decoration. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            opacity: showVideo ? 1 : 0,
            transition: 'opacity 1.1s ease',
          }}
        >
          {/*
           * Two things make this work:
           *
           * 1. The blur filter sits on the video itself and nothing above it
           *    clips — with overflow:hidden in between, the blur is cut off at
           *    the frame edge and the halo disappears entirely.
           * 2. mix-blend-mode: multiply. The page background is near-white, so
           *    a screen or normal blend has no light to add and just greys the
           *    page. Multiplying a saturated blur produces a coloured ambient
           *    spill that grounds the video on a light theme.
           */}
          <video
            ref={haloRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 32,
              filter: 'blur(52px) saturate(300%) contrast(112%)',
              mixBlendMode: 'multiply',
              opacity: 0.5,
              transform: isPatientSpeaking ? 'scale(1.13)' : 'scale(1.07)',
              transition: 'transform 1.3s cubic-bezier(0.16,1,0.3,1)',
              willChange: 'transform',
            }}
          />
        </div>

        {/* Emotion-tinted bloom: always faintly present while live, blooming
            outward when the patient speaks. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '-20%',
            zIndex: 0,
            pointerEvents: 'none',
            borderRadius: '50%',
            // Normal blend, unlike the video halo above: this is a pure
            // saturated pastel, which does read against the cream background.
            background: `radial-gradient(ellipse at 50% 50%, ${glowColor}66 0%, ${glowColor}2b 45%, transparent 72%)`,
            opacity: showVideo ? (isPatientSpeaking ? 0.85 : 0.3) : 0,
            transform: isPatientSpeaking ? 'scale(1.12)' : 'scale(1.02)',
            transition: 'opacity 0.7s ease, transform 1.3s cubic-bezier(0.16,1,0.3,1)',
          }}
        />

        {/* ── The video card ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100%',
            borderRadius: 24,
            overflow: 'hidden',
            background: '#15171a',
            boxShadow: showVideo
              ? '0 28px 60px -22px rgba(45,43,42,0.38), 0 0 0 1px rgba(255,255,255,0.07) inset, 0 1px 0 0 rgba(255,255,255,0.13) inset'
              : '0 20px 46px -20px rgba(45,43,42,0.3), 0 0 0 1px rgba(0,0,0,0.05)',
            transition: 'box-shadow 0.5s ease',
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
                'radial-gradient(120% 90% at 50% 28%, transparent 52%, rgba(10,11,13,0.38) 100%), linear-gradient(to top, rgba(10,11,13,0.6) 0%, transparent 30%)',
            }}
          />
        )}

        {/* LIVE badge */}
        {showVideo && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '5px 11px',
              borderRadius: 999,
              background: 'rgba(10,11,13,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
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

        {/* Mic + camera status, overlaid rather than placed below the frame so
            the video keeps the vertical space. */}
        {showVideo && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 10px',
              borderRadius: 999,
              background: 'rgba(10,11,13,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <span
              title={micEnabled ? 'Your microphone is live' : 'Your microphone is muted'}
              style={{
                display: 'flex',
                color: micEnabled ? 'rgba(255,255,255,0.85)' : '#f4a0a0',
              }}
            >
              {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
            </span>
            <span
              aria-hidden
              style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.16)' }}
            />
            <button
              onClick={() => setCameraOn((c) => !c)}
              aria-label={cameraOn ? 'Turn your camera off' : 'Turn your camera on'}
              title={
                cameraOn
                  ? 'Turn your camera off'
                  : 'Turn your camera on so the patient can read your body language'
              }
              style={{
                display: 'flex',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: cameraOn ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.42)',
              }}
            >
              {cameraOn ? <Video size={13} /> : <VideoOff size={13} />}
            </button>
          </div>
        )}

        {/* Name plate */}
        {showVideo && (
          <div style={{ position: 'absolute', bottom: 18, left: 20, right: 20 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'rgba(255,255,255,0.96)',
              }}
            >
              {patientName}
            </div>
            <div
              className="font-mono"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 9,
                color: 'rgba(255,255,255,0.62)',
                letterSpacing: '0.12em',
                marginTop: 3,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: isPatientSpeaking ? glowColor : 'rgba(255,255,255,0.4)',
                  transition: 'background 0.4s ease',
                }}
              />
              {isPatientSpeaking ? 'SPEAKING' : 'LISTENING'}
            </div>
          </div>
        )}

        {/* Pre-join panel */}
        {status === 'idle' && (
          <div style={overlayStyle}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.14)',
                flexShrink: 0,
              }}
            >
              <Video size={24} color="rgba(255,255,255,0.8)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.94)' }}>
                {patientName} is ready
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: 'rgba(255,255,255,0.6)',
                  marginTop: 5,
                  lineHeight: 1.5,
                  maxWidth: 340,
                }}
              >
                Speak naturally. They will hear you and reply in real time.
              </div>
            </div>
            <button
              id="btn-tavus-start"
              onClick={() => void startCall()}
              style={{
                padding: '10px 22px',
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
            position: 'relative',
            zIndex: 1,
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
  gap: 12,
  padding: 20,
  overflow: 'hidden',
  background: 'linear-gradient(180deg, #1e2126 0%, #14161a 100%)',
};
