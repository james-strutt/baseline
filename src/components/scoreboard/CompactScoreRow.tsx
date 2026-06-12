import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { LiveDot } from '@/components/scoreboard/LiveDot';
import type { TennisMatch } from '@/types/matches';
import { formatSetLine, playerLabelWithRank } from '@/utils/score/formatScoreline';

export interface CompactScoreRowProps {
  match: TennisMatch;
}

/* The ball sits beside whoever is serving — its presence is also the only
 * signal of "live" (plan §4.2: no red badges anywhere). */
export function CompactScoreRow({ match }: CompactScoreRowProps): ReactElement {
  const score =
    match.state.status === 'live' || match.state.status === 'suspended'
      ? match.state.score
      : null;
  return (
    <Link
      to="/matches/$fixtureId"
      params={{ fixtureId: String(match.fixtureId) }}
      className="block border-b border-centre-court/10 px-2 py-3 transition-colors hover:bg-centre-court/5"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 font-body text-[15px]">
          <span className="truncate">{playerLabelWithRank(match.player1)}</span>
          {score?.servingPlayer === 1 ? <LiveDot /> : null}
          <span className="text-centre-court/50">v</span>
          <span className="truncate">{playerLabelWithRank(match.player2)}</span>
          {score?.servingPlayer === 2 ? <LiveDot /> : null}
        </span>
        <span className="shrink-0 font-score text-[15px] tabular-nums">
          {score !== null ? formatSetLine(score.sets) : ''}
        </span>
      </span>
      <span className="mt-0.5 flex items-baseline justify-between font-body text-xs text-centre-court/60">
        <span>{match.tournamentName}</span>
        <span className="font-score tabular-nums">{score?.gamePoints ?? ''}</span>
      </span>
    </Link>
  );
}
