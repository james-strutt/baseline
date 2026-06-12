import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { LiveDot } from '@/components/scoreboard/LiveDot';
import { useFavourites } from '@/hooks/useFavourites';
import { useOrderOfPlay } from '@/hooks/useTennisData';
import { useUserClock } from '@/hooks/useUserClock';
import type { TennisMatch } from '@/types/matches';
import { matchInvolvesPlayer } from '@/utils/matches/matchInvolvesPlayer';
import { organiseOrderOfPlay } from '@/utils/orderOfPlay/organiseOrderOfPlay';
import { matchupLabel } from '@/utils/score/formatScoreline';
import { formatLocalTime } from '@/utils/time';

interface OrderOfPlayRowProps {
  match: TennisMatch;
  timeZone: string;
  isFavouriteMatch: boolean;
}

function OrderOfPlayRow({ match, timeZone, isFavouriteMatch }: OrderOfPlayRowProps): ReactElement {
  const isLive = match.state.status === 'live';
  return (
    <Link
      to="/matches/$fixtureId"
      params={{ fixtureId: String(match.fixtureId) }}
      className="flex items-baseline gap-3 border-b border-centre-court/10 px-2 py-2.5 transition-colors hover:bg-centre-court/5"
    >
      <span className="w-20 shrink-0 font-score text-sm tabular-nums">
        {match.isProvisional ? '~' : ''}
        {formatLocalTime(match.scheduledUtc, timeZone)}
      </span>
      <span className="flex min-w-0 items-center gap-2 font-body text-sm">
        {isLive ? <LiveDot /> : null}
        <span className="truncate">{matchupLabel(match)}</span>
        {isFavouriteMatch ? <span className="text-ribbon">♥</span> : null}
      </span>
      <span className="ml-auto shrink-0 font-body text-xs text-centre-court/60">
        {match.tournamentName}
        {match.isProvisional ? ' · not before' : ''}
      </span>
    </Link>
  );
}

export function OrderOfPlayPage(): ReactElement {
  const { matches, isLoading, isError } = useOrderOfPlay();
  const { timeZone } = useUserClock();
  const { favouritePlayerIds } = useFavourites();
  const segments = useMemo(
    () => organiseOrderOfPlay(matches, timeZone),
    [matches, timeZone],
  );

  if (isLoading) {
    return <div className="club-skeleton h-64" />;
  }
  if (isError || segments.length === 0) {
    return (
      <p className="font-body text-sm text-centre-court/70">
        Quiet, please — no order of play published yet. The next session appears here first.
      </p>
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-xl uppercase tracking-[0.12em]">Order of Play</h1>
        <p className="font-body text-xs text-centre-court/60">Times shown in your local time</p>
      </header>
      {segments.map((segment) => (
        <section key={`${segment.period}-${segment.matches[0]?.fixtureId ?? segment.label}`}>
          <h2 className="mb-1 font-display text-sm uppercase tracking-[0.18em] text-centre-court/80">
            {segment.label}
          </h2>
          {segment.matches.map((match) => (
            <OrderOfPlayRow
              key={match.fixtureId}
              match={match}
              timeZone={timeZone}
              isFavouriteMatch={matchInvolvesPlayer(match, favouritePlayerIds)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
