/**
 * Halo — soft ambient light behind a section.
 *
 * Server component: pure decoration, no interactivity. Sits at z-index -1
 * inside a `.halo-wrap` parent so it never intercepts pointer events or
 * covers content.
 */

type HaloTone = 'sage' | 'apricot' | 'lilac' | 'sky';

interface HaloProps {
  tone?: HaloTone;
  /** CSS length or percentage. */
  size?: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  opacity?: number;
  blur?: number;
  drift?: boolean | 'slow';
}

export function Halo({
  tone = 'sage',
  size = '520px',
  top,
  left,
  right,
  bottom,
  opacity = 0.55,
  blur = 46,
  drift = false,
}: HaloProps) {
  const driftClass =
    drift === 'slow' ? ' halo-drift-slow' : drift ? ' halo-drift' : '';

  return (
    <span
      aria-hidden
      className={`halo halo-${tone}${driftClass}`}
      style={{
        width: size,
        height: size,
        top,
        left,
        right,
        bottom,
        opacity,
        filter: `blur(${blur}px)`,
      }}
    />
  );
}
