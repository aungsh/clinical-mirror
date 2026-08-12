"use client";

/**
 * /avatars — visual reference sheet for the stylised patient avatars.
 *
 * Every scenario character is rendered across all seven emotions so you can
 * check at a glance that each patient reads as a distinct person and that the
 * expressions still morph correctly.
 */

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { scenarios } from "@/lib/scenario-catalog";
import type { EmotionType } from "@/lib/types";

const EMOTIONS: EmotionType[] = [
  "neutral",
  "calm",
  "relieved",
  "sad",
  "anxious",
  "angry",
  "distressed",
];

export default function AvatarPreviewPage() {
  const [intensity, setIntensity] = useState(0.7);
  const [speaking, setSpeaking] = useState(false);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: "16px 32px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={{ fontSize: 13, color: "var(--text-2)" }}>
          ← Back
        </Link>
        <span
          className="font-mono"
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            letterSpacing: "0.12em",
          }}
        >
          AVATAR REFERENCE SHEET
        </span>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12,
            color: "var(--text-2)",
          }}
        >
          Intensity {Math.round(intensity * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
          />
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--text-2)",
          }}
        >
          <input
            type="checkbox"
            checked={speaking}
            onChange={(e) => setSpeaking(e.target.checked)}
          />
          Speaking
        </label>
      </header>

      <main style={{ padding: "32px", overflowX: "auto" }}>
        {scenarios.map((scenario) => (
          <section key={scenario.id} style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 12 }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-1)",
                  margin: 0,
                }}
              >
                {scenario.patientName}, {scenario.patientAge}
              </h2>
              <p
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: "var(--text-3)",
                  letterSpacing: "0.1em",
                  margin: "4px 0 0",
                }}
              >
                {scenario.avatarVariant.toUpperCase()} · {scenario.title}
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {EMOTIONS.map((emotion) => (
                <figure
                  key={emotion}
                  style={{
                    margin: 0,
                    padding: 8,
                    borderRadius: "var(--r)",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Avatar
                    emotion={emotion}
                    intensity={intensity}
                    variant={scenario.avatarVariant}
                    isSpeaking={speaking}
                    size={150}
                  />
                  <figcaption
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      color: "var(--text-3)",
                      letterSpacing: "0.1em",
                      marginTop: 4,
                    }}
                  >
                    {emotion.toUpperCase()}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
