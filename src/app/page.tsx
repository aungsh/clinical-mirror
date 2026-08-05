import Link from 'next/link';
import { scenarios } from '@/lib/scenarios';

const DIFF = {
  easy:   { label: 'Easy',   color: '#22c55e' },
  medium: { label: 'Medium', color: '#fb923c' },
  hard:   { label: 'Hard',   color: '#f87171' },
};

export default function HomePage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 40px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--r)',
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 11, fontWeight: 700,
            color: '#0a0a0a', flexShrink: 0,
          }}>CM</div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
            ClinicalMirror
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em' }}>
          AI TRAINING
        </span>
      </nav>

      <main style={{ flex: 1, padding: '0 40px' }}>

        {/* Hero: asymmetric split */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 40,
          alignItems: 'end',
          padding: '72px 0 56px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(48px, 7vw, 80px)',
              fontWeight: 700,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: 'var(--text-1)',
              margin: 0,
            }}>
              Practice before<br />
              <span style={{ color: 'var(--accent)' }}>it counts.</span>
            </h1>
            <p style={{
              marginTop: 24,
              fontSize: 16,
              color: 'var(--text-2)',
              maxWidth: '48ch',
              lineHeight: 1.6,
            }}>
              AI patient simulations for healthcare students. Build communication
              skills - empathy, clarity, de-escalation - and get detailed feedback.
            </p>
          </div>

          {/* Right: metadata column */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 20,
            textAlign: 'right', paddingBottom: 4, flexShrink: 0,
          }}>
            <div>
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', marginBottom: 4 }}>
                SCENARIOS
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                {scenarios.length}
              </div>
            </div>
            <div>
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em', marginBottom: 4 }}>
                AI MODEL
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Gemini Flash Lite</div>
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 32,
                  borderBottom: '1px solid var(--border)',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                  cursor: 'pointer',
                  margin: '0 -40px',
                  padding: '28px 40px',
                }}
              >
                {/* Number */}
                <span className="font-mono" style={{
                  fontSize: 12, color: 'var(--text-3)', fontWeight: 500,
                  flexShrink: 0, width: 28,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--r)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {scenario.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>
                    {scenario.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {scenario.patientName}, {scenario.patientAge}
                    <span style={{ margin: '0 8px', color: 'var(--text-3)' }}>·</span>
                    {scenario.description}
                  </div>
                </div>

                {/* Difficulty */}
                <span className="font-mono" style={{
                  fontSize: 10, fontWeight: 500, letterSpacing: '0.12em',
                  color: diff.color, flexShrink: 0,
                  padding: '3px 8px',
                  border: `1px solid ${diff.color}25`,
                  borderRadius: 4,
                  background: `${diff.color}08`,
                }}>
                  {diff.label.toUpperCase()}
                </span>

                {/* Arrow */}
                <span style={{ color: 'var(--text-3)', flexShrink: 0, fontSize: 18, transition: 'color 0.15s, transform 0.15s' }}>
                  →
                </span>
              </Link>
            );
          })}
        </div>

      </main>

      {/* Footer */}
      <footer style={{
        padding: '20px 40px',
        borderTop: '1px solid var(--border-sub)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          For educational use only
        </span>
        <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em' }}>
          CLINICALMIRROR
        </span>
      </footer>

      <style>{`
        .scenario-row:hover {
          background: var(--surface) !important;
        }
        .scenario-row:hover span:last-child {
          color: var(--accent) !important;
          transform: translateX(3px);
        }
      `}</style>
    </div>
  );
}
