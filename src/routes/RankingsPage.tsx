import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { FavouriteToggleButton } from '@/components/favourites/FavouriteToggleButton';
import { MembershipPanel } from '@/components/membership/MembershipPanel';
import { PlayerSearchInput } from '@/components/search/PlayerSearchInput';
import { useFavourites } from '@/hooks/useFavourites';
import { useRankings } from '@/hooks/useTennisData';
import type { RankingEntry, RankingTour } from '@/types/players';

const HONOURS_BOARD_DEPTH = 10;

function MovementBadge({ movement }: { movement: number }): ReactElement {
  if (movement > 0) {
    return <span className="font-score text-sm">▲{movement}</span>;
  }
  if (movement < 0) {
    return <span className="font-score text-sm">▼{Math.abs(movement)}</span>;
  }
  return <span className="font-score text-sm opacity-40">—</span>;
}

interface RankingRowProps {
  entry: RankingEntry;
  isOnBoard: boolean;
  isFavourite: boolean;
  onToggleFavourite(playerId: number): void;
}

function RankingRow({
  entry,
  isOnBoard,
  isFavourite,
  onToggleFavourite,
}: RankingRowProps): ReactElement {
  return (
    <div
      className={`flex items-baseline gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 ${
        isOnBoard ? 'text-chalk' : 'border-b border-centre-court/10 text-centre-court'
      }`}
    >
      <span
        className={`w-7 shrink-0 text-right font-score text-base tabular-nums ${
          isOnBoard ? 'text-gilt' : 'text-centre-court/60'
        }`}
      >
        {entry.position}
      </span>
      <Link
        to="/players/$playerId"
        params={{ playerId: String(entry.playerId) }}
        className="min-w-0 truncate font-display text-base uppercase tracking-[0.08em] transition-opacity hover:opacity-70"
      >
        {entry.playerName}
      </Link>
      <span
        className={`hidden font-body text-xs sm:inline ${
          isOnBoard ? 'text-chalk/60' : 'text-centre-court/50'
        }`}
      >
        {entry.countryCode}
      </span>
      <FavouriteToggleButton
        playerId={entry.playerId}
        playerName={entry.playerName}
        isFavourite={isFavourite}
        onToggleFavourite={onToggleFavourite}
      />
      <span className="ml-auto shrink-0 font-score text-base tabular-nums">
        {entry.points.toLocaleString('en-AU')}
      </span>
      <span className="w-10 shrink-0 text-right">
        <MovementBadge movement={entry.weeklyMovement} />
      </span>
    </div>
  );
}

export function RankingsPage(): ReactElement {
  const [tour, setTour] = useState<RankingTour>('atp');
  const [searchQuery, setSearchQuery] = useState('');
  const { rankings, isLoading, isError } = useRankings(tour);
  const { isFavourite, toggleFavourite, paywallPlayerId, acceptPlusPreview, dismissPaywall } =
    useFavourites();

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchedRankings =
    trimmedQuery === ''
      ? rankings
      : rankings.filter((entry) => entry.playerName.toLowerCase().includes(trimmedQuery));
  const isSearching = trimmedQuery !== '';
  const boardEntries = isSearching
    ? []
    : searchedRankings.filter((entry) => entry.position <= HONOURS_BOARD_DEPTH);
  const quietEntries = isSearching
    ? searchedRankings
    : searchedRankings.filter((entry) => entry.position > HONOURS_BOARD_DEPTH);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-2xl uppercase tracking-[0.12em]">Rankings</h1>
        <div className="flex gap-1.5">
          {(['atp', 'wta'] as const).map((tourOption) => (
            <button
              key={tourOption}
              type="button"
              aria-pressed={tour === tourOption}
              onClick={(): void => setTour(tourOption)}
              className={`cursor-pointer rounded-plaque px-3 py-1 font-body text-sm uppercase transition-colors ${
                tour === tourOption ? 'bg-ribbon text-chalk' : 'text-centre-court/60 hover:text-ribbon'
              }`}
            >
              {tourOption}
            </button>
          ))}
        </div>
      </header>
      <PlayerSearchInput
        placeholder="Search any player"
        ariaLabel="Search rankings by player name"
        onSearch={setSearchQuery}
      />
      {isLoading ? <div className="club-skeleton h-72" /> : null}
      {isError ? (
        <p className="font-body text-[15px] text-centre-court/70">
          The honours board is being re-engraved — rankings are not loading. Resuming shortly.
        </p>
      ) : null}
      {isSearching && searchedRankings.length === 0 && !isLoading ? (
        <p className="font-body text-[15px] text-centre-court/70">
          No player by that name on the {tour.toUpperCase()} list. Try the other tour.
        </p>
      ) : null}
      {boardEntries.length > 0 ? (
        <section className="rounded-plaque border border-gilt bg-gradient-to-b from-centre-court to-centre-court-deep py-2">
          {boardEntries.map((entry) => (
            <RankingRow
              key={entry.playerId}
              entry={entry}
              isOnBoard
              isFavourite={isFavourite(entry.playerId)}
              onToggleFavourite={toggleFavourite}
            />
          ))}
        </section>
      ) : null}
      <div>
        {quietEntries.map((entry) => (
          <RankingRow
            key={entry.playerId}
            entry={entry}
            isOnBoard={false}
            isFavourite={isFavourite(entry.playerId)}
            onToggleFavourite={toggleFavourite}
          />
        ))}
      </div>
      {paywallPlayerId !== null ? (
        <MembershipPanel onContinue={acceptPlusPreview} onDismiss={dismissPaywall} />
      ) : null}
    </div>
  );
}
