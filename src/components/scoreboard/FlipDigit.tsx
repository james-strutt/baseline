import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export interface FlipDigitProps {
  value: string;
}

interface FlipState {
  from: string;
  token: number;
}

/* A touch over the 140ms flip so the leaves have settled before teardown. */
const FLIP_CLEAR_MS = 160;

/*
 * The manual scoreboard plaque's split-flap digit — the brand's signature
 * motion (plan §4.1). On change, the old top leaf folds down to reveal the
 * new top, then the new bottom leaf folds in. Static finished scores never
 * flap (guarded on mount and when the value is unchanged). The visual layers
 * are aria-hidden; one sr-only value carries the score to assistive tech.
 * Under prefers-reduced-motion it collapses to a 140ms cross-fade.
 */
export function FlipDigit({ value }: FlipDigitProps): ReactElement {
  const prefersReduced = usePrefersReducedMotion();
  const previousValue = useRef(value);
  const flipToken = useRef(0);
  const [flip, setFlip] = useState<FlipState | null>(null);

  useEffect(() => {
    if (previousValue.current === value) {
      return;
    }
    const from = previousValue.current;
    previousValue.current = value;
    if (prefersReduced) {
      setFlip(null);
      return;
    }
    flipToken.current += 1;
    const token = flipToken.current;
    setFlip({ from, token });
    const timer = window.setTimeout(() => {
      setFlip((current) => (current?.token === token ? null : current));
    }, FLIP_CLEAR_MS);
    return (): void => window.clearTimeout(timer);
  }, [value, prefersReduced]);

  if (prefersReduced) {
    return (
      <span className="flap-slot">
        <span className="sr-only">{value}</span>
        <span key={value} aria-hidden className="flap-plain plaque-fade font-score tabular-nums">
          {value}
        </span>
      </span>
    );
  }

  const bottomStaticValue = flip !== null ? flip.from : value;
  return (
    <span className="flap-slot">
      <span className="sr-only">{value}</span>
      <span aria-hidden className="flap-static flap-top font-score tabular-nums">
        {value}
      </span>
      <span aria-hidden className="flap-static flap-bottom font-score tabular-nums">
        {bottomStaticValue}
      </span>
      {flip !== null ? (
        <>
          <span
            key={`top-${flip.token}`}
            aria-hidden
            className="flap-leaf flap-leaf-top font-score tabular-nums"
          >
            {flip.from}
          </span>
          <span
            key={`bottom-${flip.token}`}
            aria-hidden
            className="flap-leaf flap-leaf-bottom font-score tabular-nums"
          >
            {value}
          </span>
        </>
      ) : null}
    </span>
  );
}
