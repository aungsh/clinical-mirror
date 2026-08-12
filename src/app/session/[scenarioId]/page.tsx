"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, MicOff, Square, Volume2, VolumeX, ArrowUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { scenarios } from "@/lib/scenario-catalog";
import {
  Turn,
  EmotionType,
  AvatarMode,
  StockAvatarId,
  TavusStatus,
} from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import {
  RealisticAvatar,
  STOCK_AVATAR_LABELS,
} from "@/components/RealisticAvatar";
import { TavusAvatar } from "@/components/TavusAvatar";
import { VoiceOrb } from "@/components/VoiceOrb";
import { speakEmotional, cancelSpeech, initVoices } from "@/lib/tts";

/* ─── Constants ─────────────────────────────────────────────────────────── */

const EMOTION_COLORS: Record<EmotionType, string> = {
  neutral: "#9eb299",
  sad: "#9ec5f2",
  angry: "#f49797",
  anxious: "#fab475",
  distressed: "#f49797",
  relieved: "#9eb299",
  calm: "#d3aef6",
};

const EMOTION_LABELS: Record<EmotionType, string> = {
  neutral: "Neutral",
  sad: "Sad",
  angry: "Angry",
  anxious: "Anxious",
  distressed: "Distressed",
  relieved: "Relieved",
  calm: "Calm",
};

const DIFF_COLORS = {
  easy: "#9eb299",
  medium: "#fab475",
  hard: "#f49797",
};

type Stage = "brief" | "avatar-select" | "active";

/* ─── Avatar Selection Screen ────────────────────────────────────────────── */

const STOCK_AVATAR_IDS: StockAvatarId[] = [
  "patient-a",
  "patient-b",
  "patient-c",
];

function AvatarSelectionScreen({
  scenario,
  onSelect,
}: {
  scenario: (typeof scenarios)[0];
  onSelect: (mode: AvatarMode, avatarId: StockAvatarId) => void;
}) {
  const [selectedMode, setSelectedMode] = useState<AvatarMode>("mii");
  const [selectedAvatarId, setSelectedAvatarId] =
    useState<StockAvatarId>("patient-a");
  const realisticUnavailable = !process.env.NEXT_PUBLIC_WAV2LIP_AVAILABLE;

  // Live video patients depend on a server-side Tavus key, so availability is
  // discovered at runtime rather than baked into the client bundle.
  const [tavusAvailable, setTavusAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/tavus/status")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTavusAvailable(Boolean(d?.available));
      })
      .catch(() => {
        if (!cancelled) setTavusAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const tavusUnavailable = tavusAvailable === false;

  return (
    <div
      style={{
        background: "var(--bg)",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 40px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => history.back()}
          style={{
            fontSize: 13,
            color: "var(--text-2)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            padding: 0,
          }}
        >
          ← Back
        </button>
        <span
          className="font-mono"
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            letterSpacing: "0.12em",
          }}
        >
          AVATAR SETUP
        </span>
      </header>

      <main
        style={{
          flex: 1,
          padding: "48px 40px",
          maxWidth: 760,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: 40 }}>
          <p
            className="font-mono"
            style={{
              fontSize: 10,
              color: "var(--text-3)",
              letterSpacing: "0.14em",
              marginBottom: 12,
            }}
          >
            CHOOSE AVATAR MODE
          </p>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-1)",
              margin: 0,
            }}
          >
            How would you like to see {scenario.patientName.split(" ")[0]}?
          </h1>
        </div>

        {/* Mode cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(212px, 1fr))",
            gap: 16,
            marginBottom: 40,
          }}
        >
          {/* Mii / Stylised card */}
          <button
            id="btn-avatar-mode-mii"
            onClick={() => setSelectedMode("mii")}
            style={{
              textAlign: "left",
              padding: "24px",
              borderRadius: "var(--r)",
              background:
                selectedMode === "mii" ? "var(--accent-bg)" : "var(--surface)",
              border: `1px solid ${selectedMode === "mii" ? "var(--accent-bd)" : "var(--border)"}`,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-1)",
                marginBottom: 6,
              }}
            >
              Stylised Avatar
            </div>
            <div
              style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}
            >
              Expressive illustrated character. Instant responses, no setup
              required.
            </div>
            {selectedMode === "mii" && (
              <div
                className="font-mono"
                style={{
                  marginTop: 10,
                  fontSize: 9,
                  color: "var(--accent)",
                  letterSpacing: "0.12em",
                }}
              >
                SELECTED ✓
              </div>
            )}
          </button>

          {/* Realistic card */}
          <button
            id="btn-avatar-mode-realistic"
            onClick={() => {
              if (!realisticUnavailable) setSelectedMode("realistic");
            }}
            disabled={!!realisticUnavailable}
            style={{
              textAlign: "left",
              padding: "24px",
              borderRadius: "var(--r)",
              background:
                selectedMode === "realistic"
                  ? "var(--accent-bg)"
                  : "var(--surface)",
              border: `1px solid ${selectedMode === "realistic" ? "var(--accent-bd)" : "var(--border)"}`,
              cursor: realisticUnavailable ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
              opacity: realisticUnavailable ? 0.5 : 1,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-1)",
                marginBottom: 6,
              }}
            >
              Realistic Avatar
              {realisticUnavailable && (
                <span
                  className="font-mono"
                  style={{
                    marginLeft: 8,
                    fontSize: 9,
                    color: "var(--text-3)",
                    letterSpacing: "0.1em",
                  }}
                >
                  (GPU OFFLINE)
                </span>
              )}
            </div>
            <div
              style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}
            >
              Lip-synced video of a human face. Requires a few seconds per
              response.
            </div>
            {selectedMode === "realistic" && (
              <div
                className="font-mono"
                style={{
                  marginTop: 10,
                  fontSize: 9,
                  color: "var(--accent)",
                  letterSpacing: "0.12em",
                }}
              >
                SELECTED ✓
              </div>
            )}
          </button>

          {/* Live video patient (Tavus CVI) card */}
          <button
            id="btn-avatar-mode-tavus"
            onClick={() => {
              if (!tavusUnavailable) setSelectedMode("tavus");
            }}
            disabled={tavusUnavailable}
            style={{
              textAlign: "left",
              padding: "24px",
              borderRadius: "var(--r)",
              background:
                selectedMode === "tavus" ? "var(--accent-bg)" : "var(--surface)",
              border: `1px solid ${selectedMode === "tavus" ? "var(--accent-bd)" : "var(--border)"}`,
              cursor: tavusUnavailable ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
              opacity: tavusUnavailable ? 0.5 : 1,
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-1)",
                marginBottom: 6,
              }}
            >
              Live Video Patient
              {tavusAvailable === null && (
                <span
                  className="font-mono"
                  style={{
                    marginLeft: 8,
                    fontSize: 9,
                    color: "var(--text-3)",
                    letterSpacing: "0.1em",
                  }}
                >
                  (CHECKING…)
                </span>
              )}
              {tavusUnavailable && (
                <span
                  className="font-mono"
                  style={{
                    marginLeft: 8,
                    fontSize: 9,
                    color: "var(--text-3)",
                    letterSpacing: "0.1em",
                  }}
                >
                  (NOT CONFIGURED)
                </span>
              )}
              {tavusAvailable === true && selectedMode !== "tavus" && (
                <span
                  className="font-mono"
                  style={{
                    marginLeft: 8,
                    fontSize: 9,
                    color: "var(--accent-dim)",
                    letterSpacing: "0.1em",
                  }}
                >
                  (RECOMMENDED)
                </span>
              )}
            </div>
            <div
              style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}
            >
              A real-time video call with a photorealistic patient. Talk out
              loud and they answer immediately, with natural interruptions.
            </div>
            {selectedMode === "tavus" && (
              <div
                className="font-mono"
                style={{
                  marginTop: 10,
                  fontSize: 9,
                  color: "var(--accent)",
                  letterSpacing: "0.12em",
                }}
              >
                SELECTED ✓
              </div>
            )}
          </button>
        </div>

        {/* Live video briefing */}
        {selectedMode === "tavus" && (
          <div
            style={{
              marginBottom: 40,
              padding: "16px 18px",
              borderRadius: "var(--r)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="font-mono"
              style={{
                fontSize: 10,
                color: "var(--text-3)",
                letterSpacing: "0.14em",
                marginBottom: 10,
              }}
            >
              BEFORE YOU JOIN
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 13,
                color: "var(--text-2)",
                lineHeight: 1.7,
              }}
            >
              <li>
                Your browser will ask for microphone access. This is a spoken
                consultation, so there is no text box.
              </li>
              <li>
                Use headphones if you can — it stops the patient from hearing
                their own voice back.
              </li>
              <li>
                Your camera stays off unless you turn it on during the call.
              </li>
              <li>
                The call is capped at 10 minutes and ends automatically when you
                finish the session.
              </li>
            </ul>
          </div>
        )}

        {/* Stock avatar picker — only shown in realistic mode */}
        {selectedMode === "realistic" && (
          <div style={{ marginBottom: 40 }}>
            <p
              className="font-mono"
              style={{
                fontSize: 10,
                color: "var(--text-3)",
                letterSpacing: "0.14em",
                marginBottom: 16,
              }}
            >
              SELECT STOCK AVATAR
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {STOCK_AVATAR_IDS.map((id) => (
                <button
                  key={id}
                  id={`btn-stock-avatar-${id}`}
                  onClick={() => setSelectedAvatarId(id)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "var(--r)",
                    background:
                      selectedAvatarId === id
                        ? "var(--accent-bg)"
                        : "var(--surface)",
                    border: `1px solid ${selectedAvatarId === id ? "var(--accent-bd)" : "var(--border)"}`,
                    color:
                      selectedAvatarId === id
                        ? "var(--accent)"
                        : "var(--text-2)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: selectedAvatarId === id ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {STOCK_AVATAR_LABELS[id]}
                </button>
              ))}
            </div>
            <p
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "var(--text-3)",
                lineHeight: 1.5,
              }}
            >
              Each patient turn takes ~5–8 s to generate. A loading indicator
              will appear while the video is being prepared.
            </p>
          </div>
        )}

        <button
          id="btn-confirm-avatar"
          onClick={() => onSelect(selectedMode, selectedAvatarId)}
          style={{
            padding: "14px 32px",
            background: "var(--accent)",
            color: "#0a0a0a",
            border: "none",
            borderRadius: "var(--r)",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "opacity 0.15s",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Begin Session
          <span style={{ fontSize: 18 }}>→</span>
        </button>
      </main>
    </div>
  );
}

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
    <div
      style={{
        background: "var(--bg)",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 40px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
          flexShrink: 0,
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: 13,
            color: "var(--text-2)",
            textDecoration: "none",
          }}
          onClick={() => cancelSpeech()}
        >
          ← Scenarios
        </Link>
        <span
          className="font-mono"
          style={{
            fontSize: 10,
            color: diffColor,
            letterSpacing: "0.12em",
            padding: "3px 8px",
            border: `1px solid ${diffColor}25`,
            borderRadius: 4,
            background: `${diffColor}08`,
          }}
        >
          {scenario.difficulty.toUpperCase()}
        </span>
      </header>

      <main
        style={{
          flex: 1,
          padding: "48px 40px",
          maxWidth: 900,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* Title */}
        <div style={{ marginBottom: 48 }}>
          <p
            className="font-mono"
            style={{
              fontSize: 10,
              color: "var(--text-3)",
              letterSpacing: "0.14em",
              marginBottom: 12,
            }}
          >
            MISSION BRIEF
          </p>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 52px)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: "var(--text-1)",
              margin: 0,
            }}
          >
            {scenario.title}
          </h1>
        </div>

        {/* Two-column layout */}
        <div
          style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 48 }}
        >
          {/* Left: Patient profile */}
          <div>
            {/* Avatar */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "24px 0",
                marginBottom: 24,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <Avatar
                emotion="neutral"
                intensity={scenario.initialIntensity}
                variant={scenario.avatarVariant}
                size={200}
              />
            </div>

            {/* Patient details */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Name", scenario.patientName],
                  ["Age", String(scenario.patientAge)],
                  [
                    "Starting state",
                    `${Math.round(scenario.initialIntensity * 100)}% intensity`,
                  ],
                  ["Session length", `${scenario.maxTurns} exchanges`],
                ].map(([k, v]) => (
                  <tr
                    key={k}
                    style={{ borderBottom: "1px solid var(--border-sub)" }}
                  >
                    <td
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        color: "var(--text-3)",
                        letterSpacing: "0.1em",
                        padding: "10px 0",
                        paddingRight: 16,
                        verticalAlign: "top",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {k.toUpperCase()}
                    </td>
                    <td
                      style={{
                        fontSize: 13,
                        color: "var(--text-2)",
                        padding: "10px 0",
                      }}
                    >
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 20 }}>
              <p
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: "var(--text-3)",
                  letterSpacing: "0.1em",
                  marginBottom: 8,
                }}
              >
                BACKGROUND
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-2)",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {scenario.patientBackground}
              </p>
            </div>
          </div>

          {/* Right: Mission */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {/* Context */}
            <div>
              <p
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: "var(--text-3)",
                  letterSpacing: "0.12em",
                  marginBottom: 10,
                }}
              >
                CLINICAL CONTEXT
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-2)",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {scenario.clinicalContext}
              </p>
            </div>

            {/* Goal */}
            <div
              style={{
                padding: "16px 20px",
                background: "var(--accent-bg)",
                border: "1px solid var(--accent-bd)",
                borderRadius: "var(--r)",
              }}
            >
              <p
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: "var(--accent)",
                  letterSpacing: "0.12em",
                  marginBottom: 8,
                }}
              >
                YOUR GOAL
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-1)",
                  lineHeight: 1.6,
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                {scenario.sessionGoal}
              </p>
            </div>

            {/* Objectives */}
            <div>
              <p
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: "var(--text-3)",
                  letterSpacing: "0.12em",
                  marginBottom: 10,
                }}
              >
                LEARNING OBJECTIVES
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scenario.objectives.map((obj, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 11,
                        color: "var(--text-3)",
                        flexShrink: 0,
                        paddingTop: 2,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--text-2)",
                        lineHeight: 1.5,
                      }}
                    >
                      {obj}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Do / Avoid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              <div>
                <p
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    color: "var(--primary)",
                    letterSpacing: "0.12em",
                    marginBottom: 10,
                  }}
                >
                  TRY THIS
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 7 }}
                >
                  {scenario.doList.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 8,
                        fontSize: 12,
                        color: "var(--text-2)",
                        lineHeight: 1.4,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--primary)",
                          opacity: 0.6,
                          flexShrink: 0,
                        }}
                      >
                        +
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    color: "var(--destructive)",
                    letterSpacing: "0.12em",
                    marginBottom: 10,
                  }}
                >
                  AVOID THIS
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 7 }}
                >
                  {scenario.avoidList.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 8,
                        fontSize: 12,
                        color: "var(--text-2)",
                        lineHeight: 1.4,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--destructive)",
                          opacity: 0.6,
                          flexShrink: 0,
                        }}
                      >
                        -
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ paddingTop: 8 }}>
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  maxWidth: 520,
                  marginBottom: 16,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "var(--text-2)",
                }}
              >
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(event) => setPrivacyAccepted(event.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  I understand this is an educational AI simulation. My
                  transcript is sent to Gemini for a response and formative
                  feedback, so I will not enter real patient names or
                  identifiable information.
                </span>
              </label>
              <button
                id="btn-begin-session"
                onClick={onBegin}
                disabled={!privacyAccepted}
                style={{
                  padding: "14px 32px",
                  background: "var(--accent)",
                  color: "#0a0a0a",
                  border: "none",
                  borderRadius: "var(--r)",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: privacyAccepted ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                  transition: "opacity 0.15s",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  opacity: privacyAccepted ? 1 : 0.45,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
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
  avatarMode,
  avatarId,
}: {
  scenario: (typeof scenarios)[0];
  onEnd: (turns: Turn[]) => void;
  avatarMode: AvatarMode;
  avatarId: StockAvatarId;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [emotion, setEmotion] = useState<EmotionType>("neutral");
  const [intensity, setIntensity] = useState(scenario.initialIntensity);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activePanel, setActivePanel] = useState<
    "none" | "transcript" | "briefing"
  >("none");
  const [shouldAutoSend, setShouldAutoSend] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [patientTurnCount, setPatientTurnCount] = useState(0);
  const [lastPatientText, setLastPatientText] = useState(scenario.openingLine);
  const [requestError, setRequestError] = useState("");

  // ── Realistic avatar state ────────────────────────────────────────────
  const [realisticVideoUrl, setRealisticVideoUrl] = useState<string | null>(
    null,
  );
  const [realisticLoading, setRealisticLoading] = useState(false);
  const [realisticFallback, setRealisticFallback] = useState(false);

  // ── Live video patient (Tavus CVI) state ──────────────────────────────
  const isTavus = avatarMode === "tavus";
  const [tavusStatus, setTavusStatus] = useState<TavusStatus>("idle");
  const [micLive, setMicLive] = useState(true);
  const lastStudentTextRef = useRef("");
  const lastUtteranceRef = useRef("");

  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const W = window as unknown as Record<string, unknown>;
      if (!W.SpeechRecognition && !W.webkitSpeechRecognition)
        setMicSupported(false);
    }
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, activePanel]);

  const speak = useCallback(
    (text: string, emo: EmotionType, speakIntensity?: number) => {
      if (isMuted) return;
      speakEmotional(text, emo, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        patientId: scenario.avatarVariant,
        intensity: speakIntensity,
      });
    },
    // scenario.avatarVariant is stable for the lifetime of a session
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMuted],
  );

  useEffect(() => {
    let cancelled = false;
    let openingTimer: ReturnType<typeof setTimeout> | undefined;

    // In live video mode Tavus speaks the opening line itself (custom_greeting)
    // and reports it back as an utterance event, so we must not pre-seed it or
    // speak it with browser TTS.
    if (isTavus) return;

    const opening: Turn = {
      speaker: "patient",
      text: scenario.openingLine,
      emotion: "neutral",
      intensity: scenario.initialIntensity,
      timestamp: Date.now(),
    };
    setTurns([opening]);
    setLastPatientText(scenario.openingLine);
    setPatientTurnCount(1);

    void initVoices().then(() => {
      if (cancelled) return;

      openingTimer = setTimeout(() => {
        if (!cancelled) speak(scenario.openingLine, "neutral", scenario.initialIntensity);
      }, 300);
    });

    return () => {
      cancelled = true;
      if (openingTimer !== undefined) clearTimeout(openingTimer);
      cancelSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Live video mode: Tavus utterance → transcript turn ──────────────── */

  const handleTavusUtterance = useCallback(
    ({ role, text }: { role: "student" | "patient"; text: string }) => {
      const clean = text.trim();
      if (!clean) return;

      // Tavus can re-broadcast the same final utterance; ignore exact repeats.
      const fingerprint = `${role}:${clean}`;
      if (lastUtteranceRef.current === fingerprint) return;
      lastUtteranceRef.current = fingerprint;

      setTurns((prev) => [
        ...prev,
        { speaker: role, text: clean, timestamp: Date.now() },
      ]);

      if (role === "student") {
        lastStudentTextRef.current = clean;
        return;
      }

      setLastPatientText(clean);
      setPatientTurnCount((c) => c + 1);

      // Recover the emotion signal that /api/chat would normally return, so the
      // emotion readout and the intensity trend in the feedback report still work.
      fetch("/api/emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          patientText: clean,
          studentText: lastStudentTextRef.current,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d?.emotion) return;
          const emo = d.emotion as EmotionType;
          const inten = typeof d.intensity === "number" ? d.intensity : 0.5;
          setEmotion(emo);
          setIntensity(inten);
          // Backfill the turn we just added so feedback sees the signal.
          setTurns((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i -= 1) {
              if (next[i].speaker === "patient" && next[i].text === clean) {
                next[i] = { ...next[i], emotion: emo, intensity: inten };
                break;
              }
            }
            return next;
          });
        })
        .catch(() => undefined);
    },
    [scenario.id],
  );

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const txt = input.trim();
    setInput("");
    setRequestError("");
    cancelSpeech();
    setIsSpeaking(false);

    const studentTurn: Turn = {
      speaker: "student",
      text: txt,
      timestamp: Date.now(),
    };
    const next = [...turns, studentTurn];
    setTurns(next);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          history: next,
          studentMessage: txt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const emo = data.emotion as EmotionType;
        const pt: Turn = {
          speaker: "patient",
          text: data.reply,
          emotion: emo,
          intensity: data.intensity,
          timestamp: Date.now(),
        };
        setTurns((p) => [...p, pt]);
        setEmotion(emo);
        setIntensity(data.intensity);
        setLastPatientText(data.reply);
        setPatientTurnCount((c) => c + 1);

        if (avatarMode === "realistic") {
          // Kick off video generation in parallel with TTS fallback
          setRealisticVideoUrl(null);
          setRealisticFallback(false);
          setRealisticLoading(true);
          // Still speak via browser TTS so there's no silence during generation
          speak(data.reply, emo, data.intensity);
          fetch("/api/patient-reply-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: data.reply, emotion: emo, avatarId }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.fallback) {
                setRealisticFallback(true);
              } else {
                setRealisticVideoUrl(d.videoUrl ?? null);
              }
            })
            .catch(() => setRealisticFallback(true))
            .finally(() => setRealisticLoading(false));
        } else {
          speak(data.reply, emo, data.intensity);
        }
      } else {
        setInput(txt);
        setRequestError(
          data.error ??
            "The simulated patient could not respond. Please try again.",
        );
      }
    } catch (err) {
      console.error(err);
      setInput(txt);
      setRequestError(
        "Network error. Check that the development server is running, then try again.",
      );
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
    if (isMicActive) {
      recognitionRef.current?.stop();
      setIsMicActive(false);
      return;
    }
    cancelSpeech();
    setIsSpeaking(false);
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setInput((p) => (p ? p + " " + t : t));
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
    const sc = turns.filter((t) => t.speaker === "student").length;
    if (sc < 2) {
      setRequestError(
        isTavus
          ? "Feedback needs at least two of your own spoken turns in the transcript. Check the Transcript panel — if your replies are missing, your microphone may not be reaching the patient."
          : "Please have at least a couple of exchanges first.",
      );
      return;
    }
    setRequestError("");
    cancelSpeech();
    recognitionRef.current?.stop();
    onEnd(turns);
  };

  const ec = EMOTION_COLORS[emotion];
  const studentCount = turns.filter((t) => t.speaker === "student").length;
  const firstName = scenario.patientName.split(" ")[0];

  // In live video mode the caption bubble doubles as call guidance until the
  // patient has actually said something.
  const bubbleText =
    isTavus && patientTurnCount === 0
      ? tavusStatus === "live"
        ? `${firstName} can hear you. Speak when you are ready.`
        : `Start the video call to meet ${firstName}.`
      : lastPatientText;

  // Progress toward goal
  const initI = scenario.initialIntensity;
  const progress =
    initI > 0.35
      ? Math.max(0, Math.min(1, (initI - intensity) / initI))
      : Math.min(1, patientTurnCount / scenario.maxTurns);
  const nearEnd = patientTurnCount >= scenario.maxTurns;

  return (
    <div
      style={{
        background: "var(--bg)",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Progress bar: 2px line at very top */}
      <div style={{ height: 2, background: "var(--border)", flexShrink: 0 }}>
        <div
          style={{
            height: "100%",
            width: `${Math.round(progress * 100)}%`,
            background: "var(--accent)",
            transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>

      {/* Top bar */}
      <header
        className="header-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 24px",
          flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <span
          className="header-title"
          style={{
            fontSize: 13,
            color: "var(--text-2)",
            flex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {scenario.patientName} · {scenario.title}
        </span>

        <span
          className="font-mono"
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            letterSpacing: "0.1em",
            flexShrink: 0,
          }}
        >
          {patientTurnCount}/{scenario.maxTurns}
        </span>

        <button
          onClick={() => {
            if (!isMuted) cancelSpeech();
            setIsMuted((m) => !m);
          }}
          style={{
            padding: "5px 10px",
            borderRadius: "var(--r)",
            background: "var(--surface-2)",
            border: `1px solid ${isMuted ? "var(--danger-bd)" : "var(--border)"}`,
            color: isMuted ? "var(--danger)" : "var(--text-3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            transition: "all 0.15s",
          }}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          {isMuted ? "MUTED" : "AUDIO"}
        </button>

        <button
          id="btn-toggle-briefing"
          onClick={() =>
            setActivePanel((p) => (p === "briefing" ? "none" : "briefing"))
          }
          style={{
            padding: "5px 12px",
            fontSize: 12,
            borderRadius: "var(--r)",
            background:
              activePanel === "briefing"
                ? "var(--accent-bg)"
                : "var(--surface-2)",
            border: `1px solid ${activePanel === "briefing" ? "var(--accent-bd)" : "var(--border)"}`,
            color:
              activePanel === "briefing" ? "var(--accent)" : "var(--text-2)",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
        >
          Briefing
        </button>

        <button
          id="btn-toggle-transcript"
          onClick={() =>
            setActivePanel((p) => (p === "transcript" ? "none" : "transcript"))
          }
          style={{
            padding: "5px 12px",
            fontSize: 12,
            borderRadius: "var(--r)",
            background:
              activePanel === "transcript"
                ? "var(--accent-bg)"
                : "var(--surface-2)",
            border: `1px solid ${activePanel === "transcript" ? "var(--accent-bd)" : "var(--border)"}`,
            color:
              activePanel === "transcript" ? "var(--accent)" : "var(--text-2)",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
        >
          Transcript
        </button>

        <button
          id="btn-end-session"
          onClick={handleEnd}
          style={{
            padding: "5px 12px",
            fontSize: 12,
            borderRadius: "var(--r)",
            background: "var(--danger-bg)",
            border: "1px solid var(--danger-bd)",
            color: "var(--danger)",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "opacity 0.15s",
            marginLeft: "auto",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          End Session
        </button>
      </header>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Center stage */}
        <div
          className="main-stage"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: "16px 24px",
            overflow: "hidden",
          }}
        >
          {/* Patient speech */}
          <div
            style={{
              maxWidth: 520,
              width: "100%",
              padding: "14px 20px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              minHeight: 56,
              display: "flex",
              alignItems: "center",
            }}
          >
            {isLoading ? (
              <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
                {[0, 1, 2].map((j) => (
                  <span
                    key={j}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--text-3)",
                      display: "inline-block",
                      animation: `orb-pulse 1s ease-in-out ${j * 0.17}s infinite`,
                    }}
                  />
                ))}
              </span>
            ) : (
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-1)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {bubbleText}
              </p>
            )}
          </div>

          {/* Avatar — Live video (Tavus), Realistic clip, or Mii */}
          <div
            className={isTavus ? undefined : "animate-breathe avatar-wrapper"}
            style={
              isTavus
                ? { width: "100%", display: "flex", justifyContent: "center" }
                : undefined
            }
          >
            {isTavus ? (
              <TavusAvatar
                scenarioId={scenario.id}
                patientName={scenario.patientName}
                emotion={emotion}
                micEnabled={micLive}
                patientMuted={isMuted}
                onStatusChange={setTavusStatus}
                onUtterance={handleTavusUtterance}
                onSpeakingChange={setIsSpeaking}
              />
            ) : avatarMode === "realistic" && !realisticFallback ? (
              <RealisticAvatar
                videoUrl={realisticVideoUrl}
                isLoading={realisticLoading}
                fallback={realisticFallback}
                avatarId={avatarId}
                emotion={emotion}
                size={280}
                onPlaybackEnd={() => setIsSpeaking(false)}
              />
            ) : (
              <Avatar
                emotion={emotion}
                intensity={intensity}
                variant={scenario.avatarVariant}
                isSpeaking={isSpeaking}
                isListening={isMicActive}
                size={280}
              />
            )}
          </div>

          {/* Emotion label - simple, no glow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              visibility: isTavus && patientTurnCount === 0 ? "hidden" : "visible",
            }}
          >
            <span
              className="font-mono"
              style={{ fontSize: 10, color: ec, letterSpacing: "0.1em" }}
            >
              {EMOTION_LABELS[emotion].toUpperCase()}
            </span>
            <span
              style={{ color: "var(--text-3)", fontSize: 10, margin: "0 2px" }}
            >
              ,
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                color: "var(--text-3)",
                letterSpacing: "0.08em",
              }}
            >
              {Math.round(intensity * 100)}%
            </span>
          </div>

          {/* Orb — the live video frame is its own presence indicator */}
          {!isTavus && (
            <VoiceOrb
              isSpeaking={isSpeaking}
              isListening={isMicActive}
              isIdle={!isSpeaking && !isMicActive}
              color={ec}
              size={90}
            />
          )}

          {nearEnd && (
            <p
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                textAlign: "center",
              }}
            >
              Good session length - end when ready
            </p>
          )}
        </div>

        {/* Side panel */}
        {activePanel !== "none" && (
          <div
            className="side-panel"
            style={{
              width: 320,
              borderLeft: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              background: "var(--surface)",
              flexShrink: 0,
              zIndex: 50,
            }}
          >
            {activePanel === "transcript" && (
              <>
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      color: "var(--text-3)",
                      letterSpacing: "0.14em",
                    }}
                  >
                    TRANSCRIPT
                  </span>
                  <span
                    className="font-mono"
                    style={{ fontSize: 9, color: "var(--text-3)" }}
                  >
                    {studentCount} exchanges
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {turns.map((t, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        color:
                          t.speaker === "student"
                            ? "var(--text-1)"
                            : "var(--text-2)",
                        padding: "8px 12px",
                        borderRadius: "var(--r)",
                        background:
                          t.speaker === "student"
                            ? "var(--surface-2)"
                            : "transparent",
                        border:
                          t.speaker === "student"
                            ? "1px solid var(--border)"
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          marginRight: 6,
                          color:
                            t.speaker === "student"
                              ? "var(--accent)"
                              : "var(--text-3)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 9,
                          letterSpacing: "0.1em",
                        }}
                      >
                        {t.speaker === "student"
                          ? "YOU"
                          : scenario.patientName.split(" ")[0].toUpperCase()}
                      </span>
                      {t.text}
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              </>
            )}

            {activePanel === "briefing" && (
              <>
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      color: "var(--text-3)",
                      letterSpacing: "0.14em",
                    }}
                  >
                    MISSION BRIEF
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "20px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                  }}
                >
                  <div>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: 9,
                        color: "var(--text-3)",
                        letterSpacing: "0.1em",
                        marginBottom: 6,
                      }}
                    >
                      GOAL
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-1)",
                        lineHeight: 1.5,
                        fontWeight: 500,
                        padding: "8px 12px",
                        background: "var(--accent-bg)",
                        border: "1px solid var(--accent-bd)",
                        borderRadius: "var(--r)",
                      }}
                    >
                      {scenario.sessionGoal}
                    </div>
                  </div>
                  <div>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: 9,
                        color: "var(--text-3)",
                        letterSpacing: "0.1em",
                        marginBottom: 6,
                      }}
                    >
                      BACKGROUND
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-2)",
                        lineHeight: 1.5,
                      }}
                    >
                      {scenario.patientBackground}
                    </div>
                  </div>
                  <div>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: 9,
                        color: "var(--primary)",
                        letterSpacing: "0.1em",
                        marginBottom: 8,
                      }}
                    >
                      TRY THIS
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {scenario.doList.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            gap: 8,
                            fontSize: 12,
                            color: "var(--text-2)",
                            lineHeight: 1.4,
                          }}
                        >
                          <span
                            style={{
                              color: "var(--primary)",
                              opacity: 0.6,
                              flexShrink: 0,
                            }}
                          >
                            +
                          </span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: 9,
                        color: "var(--destructive)",
                        letterSpacing: "0.1em",
                        marginBottom: 8,
                      }}
                    >
                      AVOID THIS
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {scenario.avoidList.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            gap: 8,
                            fontSize: 12,
                            color: "var(--text-2)",
                            lineHeight: 1.4,
                          }}
                        >
                          <span
                            style={{
                              color: "var(--destructive)",
                              opacity: 0.6,
                              flexShrink: 0,
                            }}
                          >
                            -
                          </span>
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
      <div
        className="input-area"
        style={{
          flexShrink: 0,
          // Live video mode gives its vertical space to the video instead.
          padding: isTavus ? "18px 24px" : "24px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {requestError && (
          <div
            role="alert"
            style={{
              width: "100%",
              maxWidth: 480,
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: "var(--r)",
              background: "var(--danger-bg)",
              border: "1px solid var(--danger)",
              color: "var(--text-1)",
              fontSize: 12,
            }}
          >
            {requestError}
          </div>
        )}
        {isTavus ? (
          /* ── Live video call controls ── */
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <button
              id="btn-tavus-mic"
              onClick={() => setMicLive((m) => !m)}
              disabled={tavusStatus !== "live"}
              aria-pressed={!micLive}
              aria-label={
                micLive ? "Mute your microphone" : "Unmute your microphone"
              }
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: micLive ? "var(--accent)" : "var(--danger-bg)",
                color: micLive ? "#ffffff" : "var(--danger)",
                border: micLive ? "none" : "2px solid var(--danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: tavusStatus === "live" ? "pointer" : "not-allowed",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: micLive
                  ? "0 8px 24px rgba(158, 178, 153, 0.4)"
                  : "0 0 24px rgba(244, 151, 151, 0.3)",
                opacity: tavusStatus === "live" ? 1 : 0.45,
              }}
            >
              {micLive ? <MicOff size={30} /> : <Mic size={30} />}
            </button>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              {tavusStatus !== "live"
                ? "Start the call above to begin speaking"
                : micLive
                  ? `Just talk — ${firstName} is listening. Tap to mute.`
                  : `Muted. ${firstName} cannot hear you.`}
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: 9,
                color: "var(--text-3)",
                letterSpacing: "0.1em",
                textAlign: "center",
              }}
            >
              LIVE CONVERSATION · NO TYPING NEEDED
            </div>

            {/* Feedback needs the student's side of the transcript. Surface it
                early if only the patient's turns are being captured. */}
            {patientTurnCount >= 2 && studentCount === 0 && (
              <div
                role="status"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--r)",
                  background: "rgba(250, 180, 117, 0.15)",
                  border: "1px solid var(--warn)",
                  color: "var(--text-2)",
                  fontSize: 12,
                  lineHeight: 1.5,
                  textAlign: "center",
                }}
              >
                Your replies are not appearing in the transcript yet. Check the
                Transcript panel — feedback needs your own turns to be captured.
              </div>
            )}
          </div>
        ) : (
        <Tabs
          className="tabs-container"
          defaultValue="voice"
          style={{
            width: "100%",
            maxWidth: 480,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <TabsContent
            value="voice"
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              minHeight: 140,
              justifyContent: "center",
              outline: "none",
            }}
          >
            <button
              onClick={toggleMic}
              disabled={!micSupported || isLoading}
              style={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: isMicActive ? "var(--danger-bg)" : "var(--accent)",
                color: isMicActive ? "var(--danger)" : "#ffffff",
                border: isMicActive ? "2px solid var(--danger)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: isMicActive
                  ? "0 0 30px rgba(244, 151, 151, 0.4)"
                  : "0 8px 24px rgba(158, 178, 153, 0.4)",
                transform: isMicActive ? "scale(1.05)" : "scale(1)",
                opacity: !micSupported || isLoading ? 0.5 : 1,
              }}
            >
              {isMicActive ? (
                <Square size={32} fill="currentColor" />
              ) : (
                <Mic size={36} />
              )}
            </button>
            <div
              style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}
            >
              {isMicActive ? "Listening... tap to send" : "Tap to speak"}
            </div>
            {isMicActive && input && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-2)",
                  maxWidth: 300,
                  textAlign: "center",
                  fontStyle: "italic",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                &ldquo;{input}&rdquo;
              </div>
            )}
          </TabsContent>

          <TabsContent value="text" style={{ width: "100%", outline: "none" }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                background: "var(--surface-2)",
                padding: "6px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={`Type your response to ${scenario.patientName.split(" ")[0]}...`}
                disabled={isLoading}
                style={{
                  flex: 1,
                  height: 44,
                  padding: "0 14px",
                  background: "transparent",
                  border: "none",
                  fontSize: 14,
                  color: "var(--text-1)",
                  outline: "none",
                  fontFamily: "inherit",
                  opacity: isLoading ? 0.5 : 1,
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                style={{
                  height: 44,
                  padding: "0 20px",
                  borderRadius: "6px",
                  background: "var(--accent)",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: !input.trim() || isLoading ? 0.35 : 1,
                  transition: "opacity 0.15s",
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
        )}
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

export default function SessionPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = use(params);
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("brief");
  const [isEnding, setIsEnding] = useState(false);
  const [avatarMode, setAvatarMode] = useState<AvatarMode>("mii");
  const [avatarId, setAvatarId] = useState<StockAvatarId>("patient-a");
  const [endError, setEndError] = useState("");

  const scenario = scenarios.find((s) => s.id === scenarioId);

  if (!scenario)
    return (
      <div
        style={{
          background: "var(--bg)",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <p style={{ color: "var(--text-1)" }}>Scenario not found.</p>
        <Link href="/" style={{ color: "var(--accent)", fontSize: 14 }}>
          Back to scenarios
        </Link>
      </div>
    );


  const handleEnd = async (turns: Turn[]) => {
    setIsEnding(true);
    setEndError("");
    const intensityTimeSeries = turns
      .filter((t) => t.speaker === "patient" && t.intensity !== undefined)
      .map((t) => t.intensity!);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId,
          history: turns,
          intensityTimeSeries,
        }),
      });
      const feedback = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(feedback.error ?? "Feedback could not be generated.");
      const session = { scenario, turns, feedback };
      sessionStorage.setItem("clinicalmirror_session", JSON.stringify(session));
      const previous = JSON.parse(
        sessionStorage.getItem("clinicalmirror_attempts") ?? "[]",
      );
      const attempts = Array.isArray(previous)
        ? [...previous, session].slice(-8)
        : [session];
      sessionStorage.setItem(
        "clinicalmirror_attempts",
        JSON.stringify(attempts),
      );
      router.push("/feedback");
    } catch (err) {
      console.error(err);
      setEndError(
        err instanceof Error
          ? err.message
          : "Feedback could not be generated. Please try again.",
      );
      setIsEnding(false);
    }
  };

  return (
    <>
      {stage === "brief" && (
        <BriefingScreen
          scenario={scenario}
          onBegin={() => setStage("avatar-select")}
        />
      )}
      {stage === "avatar-select" && (
        <AvatarSelectionScreen
          scenario={scenario}
          onSelect={(mode, id) => {
            setAvatarMode(mode);
            setAvatarId(id);
            setStage("active");
          }}
        />
      )}
      {stage === "active" && !isEnding && (
        <ActiveSession
          scenario={scenario}
          onEnd={handleEnd}
          avatarMode={avatarMode}
          avatarId={avatarId}
        />
      )}

      {endError && (
        <div
          role="alert"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 24,
            transform: "translateX(-50%)",
            zIndex: 60,
            maxWidth: 560,
            padding: "12px 16px",
            background: "var(--danger-bg)",
            border: "1px solid var(--danger)",
            borderRadius: "var(--r)",
            color: "var(--text-1)",
            fontSize: 13,
          }}
        >
          {endError} You can end the session again to retry.
        </div>
      )}

      {isEnding && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(253,251,247,0.92)",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "2px solid var(--border)",
              borderTopColor: "var(--accent)",
              animation: "spin-r 0.7s linear infinite",
            }}
          />
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text-1)",
              margin: 0,
            }}
          >
            Analysing your session
          </p>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
            Generating personalised feedback
          </p>
        </div>
      )}
    </>
  );
}
