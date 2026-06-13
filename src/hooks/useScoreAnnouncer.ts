import { useEffect, useRef, useState } from 'react';
import { useFavourites } from '@/hooks/useFavourites';
import { useLiveMatches } from '@/hooks/useTennisData';
import type { TennisMatch } from '@/types/matches';
import { matchInvolvesPlayer } from '@/utils/matches/matchInvolvesPlayer';

const MIN_ANNOUNCEMENT_INTERVAL_MS = 3000;

/* The umpire calling the score for screen readers: only favourites, throttled,
 * never the whole 29-court list. */
function liveScoreCall(match: TennisMatch): string | null {
  if (match.state.status !== 'live') {
    return null;
  }
  const { sets, gamePoints, servingPlayer } = match.state.score;
  const setLine = sets.map((set) => `${set.p1Games}-${set.p2Games}`).join(', ');
  const server = servingPlayer === 1 ? match.player1.displayName : match.player2.displayName;
  return `${match.player1.displayName} versus ${match.player2.displayName}. ${setLine}. ${gamePoints.replace('–', '-')}. ${server} to serve.`;
}

export function useScoreAnnouncer(): string {
  const { matches } = useLiveMatches();
  const { favouritePlayerIds } = useFavourites();
  const [announcement, setAnnouncement] = useState('');
  const lastCallByFixture = useRef<Map<number, string>>(new Map());
  const lastAnnouncedAt = useRef(0);

  useEffect(() => {
    const now = Date.now();
    for (const match of matches) {
      if (!matchInvolvesPlayer(match, favouritePlayerIds)) {
        continue;
      }
      const call = liveScoreCall(match);
      if (call === null) {
        continue;
      }
      const previous = lastCallByFixture.current.get(match.fixtureId);
      if (previous === undefined) {
        // First sighting establishes the baseline without announcing.
        lastCallByFixture.current.set(match.fixtureId, call);
        continue;
      }
      if (previous === call || now - lastAnnouncedAt.current <= MIN_ANNOUNCEMENT_INTERVAL_MS) {
        // Unchanged, or throttled — leave the stale call so the change is
        // re-detected next tick rather than silently swallowed.
        continue;
      }
      lastCallByFixture.current.set(match.fixtureId, call);
      lastAnnouncedAt.current = now;
      setAnnouncement(call);
      break;
    }
  }, [matches, favouritePlayerIds]);

  return announcement;
}
