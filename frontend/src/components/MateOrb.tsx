import type { CSSProperties } from 'react';
import './mate-orb.css';

export type MateOrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

/** Mate's conversation form. Decorative; the caller provides a visible status label. */
export function MateOrb({
  state = 'idle',
  size = 'hero',
  frozen = false,
  level,
  className = '',
}: {
  state?: MateOrbState;
  size?: 'hero' | 'session' | 'small';
  frozen?: boolean;
  /** Normalized RMS from the active transport; omit for a state-only preview. */
  level?: number;
  className?: string;
}) {
  const amplitude = Math.min(1, Math.max(0, level ?? 0));
  return (
    <div
      className={`em-orb em-orb--${size} ${className}`}
      data-state={state}
      data-frozen={frozen}
      data-metered={level !== undefined}
      aria-hidden="true"
      style={{ '--em-energy': amplitude } as CSSProperties}
    >
      <div className="em-orb-shadow" />
      <div className="em-orb-body">
        <span className="em-orb-antenna">
          <i />
        </span>
        <span className="em-orb-ear em-orb-ear--left" />
        <span className="em-orb-ear em-orb-ear--right" />
        <span className="em-orb-face">
          <i className="em-orb-eye" />
          <i className="em-orb-eye" />
          <span className="em-orb-mouth">
            <i />
            <i />
            <i />
          </span>
        </span>
        <span className="em-orb-cheek em-orb-cheek--left" />
        <span className="em-orb-cheek em-orb-cheek--right" />
      </div>
    </div>
  );
}
