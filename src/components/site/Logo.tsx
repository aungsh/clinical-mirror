import Link from 'next/link';

/**
 * Wordmark. The glyph is a split circle — one half solid, one half outlined —
 * which reads as the "mirror" in ClinicalMirror at small sizes.
 */
export function Logo({ label = 'ClinicalMirror' }: { label?: string }) {
  return (
    <Link
      href="/"
      aria-label="ClinicalMirror home"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px -2px rgba(135, 156, 130, 0.75)',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
          <path d="M8 1.5a6.5 6.5 0 0 0 0 13z" fill="#ffffff" opacity="0.95" />
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.85" />
        </svg>
      </span>
      <span
        style={{
          fontSize: 15.5,
          fontWeight: 650,
          letterSpacing: '-0.017em',
          color: 'var(--text-1)',
        }}
      >
        {label}
      </span>
    </Link>
  );
}
