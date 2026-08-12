'use client';

/**
 * Reveal — fades content up as it scrolls into view.
 *
 * Deliberately unobtrusive: one short translate, once, then the observer
 * disconnects so nothing re-animates on scroll-back.
 *
 * Accessibility: the `.reveal` class is forced visible under
 * prefers-reduced-motion, and the observer runs on mount, so content is never
 * left hidden if IntersectionObserver is unavailable.
 */

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Stagger in ms, for revealing a list of siblings in sequence. */
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: React.CSSProperties;
}

export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;

    // No observer support: show immediately rather than hiding forever.
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal${shown ? ' is-in' : ''}${className ? ` ${className}` : ''}`}
      style={{ transitionDelay: shown && delay ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </Tag>
  );
}
