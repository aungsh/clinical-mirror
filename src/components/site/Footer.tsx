import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border-sub)', marginTop: 'auto' }}>
      <div
        className="shell footer-grid"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          paddingBlock: 28,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Logo />
          <p className="t-small" style={{ maxWidth: '46ch' }}>
            An educational simulator. Not a clinical assessment tool, and not a
            substitute for supervised practice.
          </p>
        </div>

        <div
          className="footer-links"
          style={{ display: 'flex', alignItems: 'center', gap: 22, flexShrink: 0 }}
        >
          <Link href="/#safety" className="link-quiet" style={{ fontSize: 13 }}>
            Safety
          </Link>
          <Link href="/avatars" className="link-quiet" style={{ fontSize: 13 }}>
            Avatars
          </Link>
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.12em' }}>
            CLINICALMIRROR
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) {
          .footer-grid {
            flex-direction: column;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </footer>
  );
}
