import { Link } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import type { ReactElement, TouchEvent } from 'react';
import { ScorePlaque } from '@/components/scoreboard/ScorePlaque';
import type { TennisMatch } from '@/types/matches';
import { matchupLabel } from '@/utils/score/formatScoreline';

const SWIPE_THRESHOLD_PX = 40;

export interface HeroPlaqueCarouselProps {
  matches: TennisMatch[];
}

/*
 * Manual carousel only — no auto-advance; nothing in a members' enclosure
 * moves uninvited (plan §4.2). Arrows, dots, and touch swipe; the plaque
 * itself opens the match centre.
 */
export function HeroPlaqueCarousel({ matches }: HeroPlaqueCarouselProps): ReactElement | null {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(Number.NaN);
  if (matches.length === 0) {
    return null;
  }
  const safeIndex = Math.min(index, matches.length - 1);
  const match = matches[safeIndex];
  if (match === undefined) {
    return null;
  }
  const stepBy = (step: number): void =>
    setIndex((safeIndex + step + matches.length) % matches.length);

  const handleTouchStart = (event: TouchEvent): void => {
    touchStartX.current = event.touches[0]?.clientX ?? Number.NaN;
  };
  /* NaN start/end positions make every comparison false, so a malformed
   * touch sequence simply does nothing. */
  const handleTouchEnd = (event: TouchEvent): void => {
    const swipeDelta = (event.changedTouches[0]?.clientX ?? Number.NaN) - touchStartX.current;
    touchStartX.current = Number.NaN;
    if (Math.abs(swipeDelta) >= SWIPE_THRESHOLD_PX) {
      stepBy(-Math.sign(swipeDelta));
    }
  };

  return (
    <div className="space-y-3">
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <Link
          to="/matches/$fixtureId"
          params={{ fixtureId: String(match.fixtureId) }}
          aria-label={`Open match centre — ${matchupLabel(match)}`}
          className="block transition-opacity hover:opacity-95"
        >
          <ScorePlaque match={match} isHero />
        </Link>
      </div>
      {matches.length > 1 ? (
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            aria-label="Previous match"
            onClick={(): void => stepBy(-1)}
            className="cursor-pointer px-2 font-body text-lg text-ink-muted transition-colors hover:text-ribbon"
          >
            ‹
          </button>
          <div className="flex gap-2">
            {matches.map((dotMatch, dotIndex) => (
              <button
                key={dotMatch.fixtureId}
                type="button"
                aria-label={`Show ${matchupLabel(dotMatch)}`}
                aria-pressed={dotIndex === safeIndex}
                onClick={(): void => setIndex(dotIndex)}
                className={`size-2 cursor-pointer rounded-full transition-colors ${
                  dotIndex === safeIndex ? 'bg-ribbon' : 'bg-ink/25 hover:bg-ink/50'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next match"
            onClick={(): void => stepBy(1)}
            className="cursor-pointer px-2 font-body text-lg text-ink-muted transition-colors hover:text-ribbon"
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
