import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { NextMatchCard } from '@/components/matches/NextMatchCard';
import { CompactScoreRow } from '@/components/scoreboard/CompactScoreRow';
import { HeroPlaqueCarousel } from '@/components/scoreboard/HeroPlaqueCarousel';
import { useFavourites } from '@/hooks/useFavourites';
import { useLiveMatches, useOrderOfPlay, useRecentResults } from '@/hooks/useTennisData';
import { useUserClock } from '@/hooks/useUserClock';
import type { TennisMatch, TourLevel } from '@/types/matches';
import { youtubeHighlightsSearchUrl } from '@/utils/links/youtubeHighlights';
import { matchInvolvesPlayer } from '@/utils/matches/matchInvolvesPlayer';
import { resultLine } from '@/utils/score/formatScoreline';

type CourtFilter = 'all' | TourLevel;

/* The umpire never abbreviates aloud — the chip shows "CH", screen readers
 * hear "Challenger". */
const COURT_FILTERS: ReadonlyArray<{ key: CourtFilter; label: string; spoken: string }> = [
  { key: 'all', label: 'All', spoken: 'All courts' },
  { key: 'atp', label: 'ATP', spoken: 'ATP' },
  { key: 'wta', label: 'WTA', spoken: 'WTA' },
  { key: 'challenger', label: 'CH', spoken: 'Challenger' },
  { key: 'itf', label: 'ITF', spoken: 'ITF' },
];

/* The hub never opens without the scoreboard: the highest-tier live match
 * stands in as the featured plaque until favourites take over. */
const TOUR_PRIORITY: Record<TourLevel, number> = {
  'grand-slam': 0,
  atp: 1,
  wta: 1,
  challenger: 2,
  itf: 3,
  utr: 3,
};

const SECTION_HEADING_CLASS =
  'font-display text-[13px] uppercase tracking-[0.22em] text-ink-muted';

interface MyMatchesSectionProps {
  favouriteLiveMatches: TennisMatch[];
  nextFavouriteMatch: TennisMatch | undefined;
  featuredMatches: TennisMatch[];
  hasFavourites: boolean;
  nowMs: number;
  timeZone: string;
}

function MyMatchesSection({
  favouriteLiveMatches,
  nextFavouriteMatch,
  featuredMatches,
  hasFavourites,
  nowMs,
  timeZone,
}: MyMatchesSectionProps): ReactElement {
  if (!hasFavourites) {
    return (
      <section className="space-y-4">
        <h2 className={SECTION_HEADING_CLASS}>On court now</h2>
        <HeroPlaqueCarousel matches={featuredMatches} />
        <div className="rounded-plaque border border-line p-5">
          <p className="font-display text-name-sm">Follow the players you love.</p>
          <p className="mt-1 font-body text-[15px] text-ink-muted">
            Their matches lead your hub, in your time — wherever they play.
          </p>
          <Link
            to="/players"
            className="mt-3 inline-block rounded-plaque bg-ribbon px-4 py-2 font-body text-sm text-chalk transition-opacity hover:opacity-90"
          >
            Choose your players ›
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section className="space-y-4">
      <h2 className={SECTION_HEADING_CLASS}>My matches</h2>
      {favouriteLiveMatches.length > 0 ? (
        <HeroPlaqueCarousel matches={favouriteLiveMatches} />
      ) : null}
      {nextFavouriteMatch !== undefined ? (
        <NextMatchCard match={nextFavouriteMatch} nowMs={nowMs} timeZone={timeZone} />
      ) : null}
      {favouriteLiveMatches.length === 0 && nextFavouriteMatch === undefined ? (
        <p className="font-body text-[15px] text-ink-muted">
          None of your players are on court. The Order of Play has what is next.
        </p>
      ) : null}
    </section>
  );
}

/* "Checked", not "updated" — the provider's own cadence can lag behind our
 * fetch loop, and the caption must not pretend otherwise (plan §13). */
function updatedAgoLabel(nowMs: number, lastUpdatedMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - lastUpdatedMs) / 1000));
  return `Checked ${seconds}s ago`;
}

interface AllCourtsSectionProps {
  matches: TennisMatch[];
  nowMs: number;
  lastUpdatedMs: number;
}

function AllCourtsSection({ matches, nowMs, lastUpdatedMs }: AllCourtsSectionProps): ReactElement {
  const [filter, setFilter] = useState<CourtFilter>('all');
  const visibleMatches =
    filter === 'all' ? matches : matches.filter((match) => match.tourLevel === filter);
  return (
    <section className="space-y-4 lg:border-l lg:border-line lg:pl-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className={SECTION_HEADING_CLASS}>All courts ({visibleMatches.length})</h2>
        <div className="flex gap-1.5">
          {COURT_FILTERS.map((courtFilter) => (
            <button
              key={courtFilter.key}
              type="button"
              aria-pressed={filter === courtFilter.key}
              aria-label={courtFilter.spoken}
              onClick={(): void => setFilter(courtFilter.key)}
              className={`cursor-pointer rounded-plaque px-2.5 py-1 font-body text-xs transition-colors ${
                filter === courtFilter.key
                  ? 'bg-ribbon text-chalk'
                  : 'text-ink-muted hover:text-ribbon'
              }`}
            >
              {courtFilter.label}
            </button>
          ))}
        </div>
      </div>
      {visibleMatches.length === 0 ? (
        <p className="font-body text-[15px] text-ink-muted">
          Quiet, please — no matches in play. The Order of Play has the next session.
        </p>
      ) : (
        <div className="border-t border-ink/10">
          {visibleMatches.map((match) => (
            <CompactScoreRow key={match.fixtureId} match={match} />
          ))}
          {lastUpdatedMs > 0 ? (
            <p className="px-2 pt-3 font-body text-xs text-ink-muted">
              {updatedAgoLabel(nowMs, lastUpdatedMs)}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function WhileYouSleptSection({ results }: { results: TennisMatch[] }): ReactElement | null {
  if (results.length === 0) {
    return null;
  }
  return (
    <section className="space-y-2.5">
      <h2 className={SECTION_HEADING_CLASS}>While you slept ({results.length})</h2>
      {results.map((match) => (
        <p key={match.fixtureId} className="font-body text-[15px]">
          {resultLine(match)}
          <span className="text-ink-muted"> · {match.tournamentName} · </span>
          <a
            href={youtubeHighlightsSearchUrl(match)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ribbon underline underline-offset-2"
          >
            Highlights ›
          </a>
        </p>
      ))}
    </section>
  );
}

function LiveHubSkeleton(): ReactElement {
  return (
    <div className="grid gap-10 lg:grid-cols-[8fr_4fr] xl:gap-16">
      <div className="space-y-4">
        <p className="font-body text-eyebrow uppercase tracking-[0.24em] text-ink-muted">
          Taking the court…
        </p>
        <div className="club-skeleton h-56" aria-hidden />
        <div className="club-skeleton h-24" aria-hidden />
      </div>
      <div className="club-skeleton h-80" aria-hidden />
    </div>
  );
}

export function LiveHubPage(): ReactElement {
  const { matches: liveMatches, isLoading, isError, lastUpdatedMs } = useLiveMatches();
  const { matches: orderOfPlay } = useOrderOfPlay();
  const { results } = useRecentResults();
  const { favouritePlayerIds } = useFavourites();
  const { nowMs, timeZone } = useUserClock();

  const favouriteLiveMatches = liveMatches.filter((match) =>
    matchInvolvesPlayer(match, favouritePlayerIds),
  );
  const featuredMatches = useMemo(
    () =>
      [...liveMatches].sort(
        (a, b) => TOUR_PRIORITY[a.tourLevel] - TOUR_PRIORITY[b.tourLevel],
      ),
    [liveMatches],
  );
  const nextFavouriteMatch = useMemo(
    () =>
      orderOfPlay
        .filter(
          (match) =>
            match.state.status === 'scheduled' &&
            matchInvolvesPlayer(match, favouritePlayerIds),
        )
        .sort((a, b) => Date.parse(a.scheduledUtc) - Date.parse(b.scheduledUtc))[0],
    [orderOfPlay, favouritePlayerIds],
  );

  if (isLoading) {
    return <LiveHubSkeleton />;
  }
  if (isError) {
    return (
      <p className="font-body text-[15px] text-ink-muted">
        Play suspended — live scores are not updating. Resuming shortly.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[8fr_4fr] xl:gap-16">
      <h1 className="sr-only">Live tennis scores</h1>
      <div className="space-y-10">
        <MyMatchesSection
          favouriteLiveMatches={favouriteLiveMatches}
          nextFavouriteMatch={nextFavouriteMatch}
          featuredMatches={featuredMatches}
          hasFavourites={favouritePlayerIds.length > 0}
          nowMs={nowMs}
          timeZone={timeZone}
        />
        <WhileYouSleptSection results={results} />
      </div>
      <AllCourtsSection matches={liveMatches} nowMs={nowMs} lastUpdatedMs={lastUpdatedMs} />
    </div>
  );
}
