import Link from 'next/link';
import { scenarios } from '@/lib/scenarios';

const DIFFICULTY_STYLES = {
  easy: { label: 'Easy', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)', text: '#34d399' },
  medium: { label: 'Medium', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)', text: '#fbbf24' },
  hard: { label: 'Hard', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)', text: '#f87171' },
};

export default function HomePage() {
  return (
    <main className="min-h-[100dvh] flex flex-col" style={{ background: 'oklch(0.075 0.018 255)' }}>

      {/* ── Header ── */}
      <header className="px-8 py-6 flex items-center gap-3 border-b" style={{ borderColor: 'oklch(0.17 0.016 255)' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ background: 'oklch(0.72 0.14 200)', color: 'oklch(0.08 0.018 255)' }}
        >
          CM
        </div>
        <span className="font-semibold text-lg" style={{ color: 'oklch(0.94 0.012 255)' }}>
          ClinicalMirror
        </span>
        <span
          className="ml-1 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'oklch(0.72 0.14 200 / 0.15)', color: 'oklch(0.72 0.14 200)' }}
        >
          AI Training
        </span>
      </header>

      {/* ── Hero ── */}
      <section className="px-8 pt-16 pb-12 max-w-4xl mx-auto w-full text-center">
        <p
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-5"
          style={{ color: 'oklch(0.72 0.14 200)' }}
        >
          Clinical Communication Training
        </p>
        <h1
          className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-5"
          style={{ color: 'oklch(0.96 0.01 255)' }}
        >
          Practice before it
          <br />
          <span style={{ color: 'oklch(0.72 0.14 200)' }}>counts.</span>
        </h1>
        <p
          className="text-lg leading-relaxed max-w-[52ch] mx-auto"
          style={{ color: 'oklch(0.58 0.02 255)' }}
        >
          Train with AI patients in realistic clinical scenarios. Build empathy,
          clarity, and de-escalation skills — with instant, personalised feedback.
        </p>
      </section>

      {/* ── Scenario cards ── */}
      <section className="px-6 pb-16 max-w-5xl mx-auto w-full">
        <p
          className="text-sm font-medium mb-6"
          style={{ color: 'oklch(0.52 0.022 255)' }}
        >
          Choose a scenario to begin
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((scenario, idx) => {
            const diff = DIFFICULTY_STYLES[scenario.difficulty];
            return (
              <Link
                key={scenario.id}
                href={`/session/${scenario.id}`}
                id={`scenario-card-${scenario.id}`}
                className="group relative rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'oklch(0.1 0.016 255)',
                  border: '1px solid oklch(0.17 0.016 255)',
                  boxShadow: '0 2px 24px rgba(0,0,0,0.3)',
                  animationDelay: `${idx * 80}ms`,
                }}
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, oklch(0.72 0.14 200 / 0.06) 0%, transparent 60%)',
                    border: '1px solid oklch(0.72 0.14 200 / 0.2)',
                  }}
                />

                <div className="flex items-start justify-between gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: 'oklch(0.14 0.016 255)' }}
                  >
                    {scenario.icon}
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 mt-0.5"
                    style={{ background: diff.bg, borderColor: diff.border, color: diff.text }}
                  >
                    {diff.label}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 relative">
                  <h2
                    className="text-lg font-semibold leading-snug"
                    style={{ color: 'oklch(0.94 0.012 255)' }}
                  >
                    {scenario.title}
                  </h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'oklch(0.55 0.02 255)' }}
                  >
                    {scenario.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'oklch(0.14 0.016 255)', color: 'oklch(0.55 0.02 255)' }}
                    >
                      {scenario.patientName.charAt(0)}
                    </div>
                    <span className="text-xs" style={{ color: 'oklch(0.48 0.02 255)' }}>
                      {scenario.patientName}, {scenario.patientAge}
                    </span>
                  </div>
                  <span
                    className="text-xs font-medium group-hover:translate-x-0.5 transition-transform duration-200"
                    style={{ color: 'oklch(0.72 0.14 200)' }}
                  >
                    Start session →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="mt-auto px-8 py-5 border-t text-center text-xs"
        style={{ borderColor: 'oklch(0.13 0.014 255)', color: 'oklch(0.38 0.016 255)' }}
      >
        ClinicalMirror — AI-powered clinical communication training · For educational use only
      </footer>
    </main>
  );
}
