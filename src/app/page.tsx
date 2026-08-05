import Link from "next/link";
import { scenarios } from "@/lib/scenarios";

const DIFF = {
  easy: { label: "Easy", color: "#9eb299" },
  medium: { label: "Medium", color: "#fab475" },
  hard: { label: "Hard", color: "#f49797" },
};

function getInitialPersona(scenario: typeof scenarios[0]) {
  const seg = scenario.segments[scenario.initialSegmentId];
  return scenario.personas[seg.activePersonaId];
}

export default function HomePage() {
  return (
    <div
      style={{
        background: "var(--bg)",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Nav */}
      <nav className="nav-container"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--border)", background: "var(--bg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--r)",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#0a0a0a",
              flexShrink: 0,
            }}
          >
            CM
          </div>
          <span
            style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)" }}
          >
            ClinicalMirror
          </span>
        </div>
        <span
          className="font-mono"
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            letterSpacing: "0.1em",
          }}
        >
          AI TRAINING
        </span>
      </nav>

      <main className="main-container" style={{ flex: 1 }}>
        {/* Hero: asymmetric split */}
        <div className="hero-grid"
          style={{
            display: "grid", alignItems: "end",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <h1 className="hero-title"
              style={{
                fontSize: "clamp(48px, 7vw, 80px)",
                fontWeight: 700,
                lineHeight: 0.95,
                letterSpacing: "-0.03em",
                color: "var(--text-1)",
                margin: 0,
              }}
            >
              Practice before
              <br />
              <span style={{ color: "var(--accent)" }}>it counts.</span>
            </h1>
            <p
              style={{
                marginTop: 24,
                fontSize: 16,
                color: "var(--text-2)",
                maxWidth: "48ch",
                lineHeight: 1.6,
              }}
            >
              AI patient simulations for healthcare students. Build
              communication skills (empathy, clarity, de-escalation) and get
              detailed feedback.
            </p>
          </div>

          {/* Right: metadata column */}
          <div className="hero-stats"
            style={{
              display: "flex", flexDirection: "column", gap: 20,
              paddingBottom: 4, flexShrink: 0,
            }}
          >
            <div>
              <div
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: "var(--text-3)",
                  letterSpacing: "0.12em",
                  marginBottom: 4,
                }}
              >
                SCENARIOS
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: "var(--text-1)",
                  lineHeight: 1,
                }}
              >
                {scenarios.length}
              </div>
            </div>
            <div>
              <div
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: "var(--text-3)",
                  letterSpacing: "0.12em",
                  marginBottom: 4,
                }}
              >
                AI MODEL
              </div>
              <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                Gemini Flash Lite
              </div>
            </div>
          </div>
        </div>

        {/* Scenario list */}
        <div>
          {scenarios.map((scenario, i) => {
            const diff = DIFF[scenario.difficulty];
            return (
              <Link
                key={scenario.id}
                href={`/session/${scenario.id}`}
                id={`scenario-row-${scenario.id}`}
                className="scenario-row"
                style={{
                  display: "flex", alignItems: "center",
                  borderBottom: "1px solid var(--border)",
                  textDecoration: "none", transition: "background 0.15s ease",
                  cursor: "pointer",
                }}
              >
                {/* Number */}
                <span
                  className="font-mono scenario-number"
                  style={{
                    fontSize: 12,
                    color: "var(--text-3)",
                    fontWeight: 500,
                    flexShrink: 0,
                    width: 28,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: "var(--text-1)",
                        marginBottom: 2,
                      }}
                    >
                      {scenario.title}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                      {(() => { const p = getInitialPersona(scenario); return `${p.name}, ${p.age}`; })()
                      }
                      <span style={{ margin: "0 4px", color: "var(--text-3)" }}>
                        ,
                      </span>
                      {scenario.description}
                      {scenario.availability === "faculty-review" && (
                        <span style={{ marginLeft: 8, color: "var(--warn)", fontWeight: 600 }}>Faculty review required</span>
                      )}
                    </div>
                  </div>

                {/* Difficulty */}
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.12em",
                    color: diff.color,
                    flexShrink: 0,
                    padding: "3px 8px",
                    border: `1px solid ${diff.color}25`,
                    borderRadius: 4,
                    background: `${diff.color}08`,
                  }}
                >
                  {scenario.availability === "available" ? diff.label.toUpperCase() : "ON HOLD"}
                </span>

                {/* (Arrow removed to reduce AI tell) */}
              </Link>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer-container"
        style={{
          borderTop: "1px solid var(--border-sub)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
          For educational use only
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            letterSpacing: "0.08em",
          }}
        >
          CLINICALMIRROR
        </span>
      </footer>

      <style>{`
        .scenario-row:hover {
          background: var(--surface) !important;
        }
        .main-container { padding: 0 40px; }
        .nav-container { padding: 18px 40px; }
        .hero-grid { grid-template-columns: 1fr auto; gap: 40px; padding: 72px 0 56px; }
        .hero-stats { text-align: right; }
        .scenario-row { padding: 28px 40px; margin: 0 -40px; gap: 32px; }
        .scenario-number { display: block; }
        .footer-container { padding: 20px 40px; }
        
        @media (max-width: 768px) {
          .main-container { padding: 0 20px; }
          .nav-container { padding: 16px 20px; }
          .hero-grid { grid-template-columns: 1fr; gap: 24px; padding: 40px 0 32px; }
          .hero-stats { text-align: left; flex-direction: row; gap: 32px; }
          .scenario-row { padding: 20px 20px; margin: 0 -20px; gap: 16px; align-items: flex-start; }
          .scenario-number { display: none; }
          .footer-container { padding: 20px 20px; }
          .hero-title { font-size: clamp(36px, 10vw, 48px) !important; }
        }
      `}</style>
    </div>
  );
}
