import type { ReactElement } from 'react';

export interface FlipDigitProps {
  value: string;
}

/*
 * The 140ms vertical roll of a hand-flipped scoreboard plaque: keying the
 * inner span by value remounts it on change, re-running the flip animation
 * (cross-fade under prefers-reduced-motion — see global.css).
 */
export function FlipDigit({ value }: FlipDigitProps): ReactElement {
  return (
    <span className="inline-flex w-[1.4ch] justify-center overflow-hidden">
      <span key={value} className="plaque-flip font-score tabular-nums">
        {value}
      </span>
    </span>
  );
}
