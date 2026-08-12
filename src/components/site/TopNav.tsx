'use client';

/**
 * TopNav — sticky translucent header.
 *
 * Starts flush with the page and gains its border and shadow only once the
 * page has scrolled, so the hero reads as one uninterrupted surface.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from './Logo';

interface NavLink {
  label: string;
  href: string;
}

const LINKS: NavLink[] = [
  { label: 'How it works', href: '/#how' },
  { label: 'Scenarios', href: '/#scenarios' },
  { label: 'Safety', href: '/#safety' },
];

interface TopNavProps {
  /** Hide the section anchors on pages that do not have those sections. */
  showLinks?: boolean;
  /** Right-hand call to action. */
  cta?: { label: string; href: string };
}

export function TopNav({
  showLinks = true,
  cta = { label: 'Start a session', href: '/#scenarios' },
}: TopNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={scrolled ? 'glass' : undefined}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        borderBottom: scrolled ? undefined : '1px solid transparent',
        boxShadow: scrolled ? 'var(--sh-1)' : 'none',
        transition: 'box-shadow var(--dur-3) var(--ease-soft), background-color var(--dur-3) var(--ease-soft)',
      }}
    >
      <nav
        className="shell"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          height: 64,
        }}
      >
        <Logo />

        {showLinks && (
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="link-underline"
                style={{ fontSize: 13.5, fontWeight: 500 }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <Link href={cta.href} className="btn btn-primary btn-sm">
          {cta.label}
        </Link>
      </nav>

      <style>{`
        @media (max-width: 820px) {
          .nav-links { display: none !important; }
        }
      `}</style>
    </header>
  );
}
