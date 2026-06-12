import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { FavouriteToggleButton } from '@/components/favourites/FavouriteToggleButton';
import { MembershipPanel } from '@/components/membership/MembershipPanel';
import { PlayerSearchInput } from '@/components/search/PlayerSearchInput';
import { useFavourites } from '@/hooks/useFavourites';
import { useRankings } from '@/hooks/useTennisData';
import type { RankingEntry, RankingTour } from '@/types/players';

const TILE_COUNT_PER_TOUR = 3;

interface TourRankingEntry extends RankingEntry {
  tour: RankingTour;
}

interface PlayerTileProps {
  entry: TourRankingEntry;
  isFavourite: boolean;
  onToggleFavourite(playerId: number): void;
}

function PlayerTile({ entry, isFavourite, onToggleFavourite }: PlayerTileProps): ReactElement {
  const surname = entry.playerName.split(' ').slice(-1)[0] ?? entry.playerName;
  return (
    <button
      type="button"
      aria-pressed={isFavourite}
      aria-label={isFavourite ? `Unfollow ${entry.playerName}` : `Follow ${entry.playerName}`}
      onClick={(): void => onToggleFavourite(entry.playerId)}
      className={`cursor-pointer rounded-plaque bg-gradient-to-b from-centre-court to-centre-court-deep p-4 text-left transition-opacity hover:opacity-90 ${
        isFavourite ? 'border-2 border-gilt' : 'border border-centre-court/40'
      }`}
    >
      <span className="block truncate font-display text-lg uppercase tracking-[0.08em] text-chalk">
        {surname}
      </span>
      <span className="mt-1 flex items-baseline justify-between font-body text-xs text-chalk/70">
        {entry.countryCode}
        <span>{isFavourite ? '♥' : '♡'}</span>
      </span>
    </button>
  );
}

interface PlayerListRowProps {
  entry: TourRankingEntry;
  isFavourite: boolean;
  onToggleFavourite(playerId: number): void;
}

function PlayerListRow({ entry, isFavourite, onToggleFavourite }: PlayerListRowProps): ReactElement {
  return (
    <div className="flex items-baseline gap-3 border-b border-centre-court/10 px-2 py-2.5">
      <span className="w-7 shrink-0 text-right font-score text-sm tabular-nums text-centre-court/60">
        {entry.position}
      </span>
      <Link
        to="/players/$playerId"
        params={{ playerId: String(entry.playerId) }}
        className="min-w-0 truncate font-body text-[15px] transition-colors hover:text-ribbon"
      >
        {entry.playerName}
      </Link>
      <span className="font-body text-xs text-centre-court/50">{entry.countryCode}</span>
      <span className="font-body text-xs uppercase text-centre-court/40">{entry.tour}</span>
      <span className="ml-auto">
        <FavouriteToggleButton
          playerId={entry.playerId}
          playerName={entry.playerName}
          isFavourite={isFavourite}
          onToggleFavourite={onToggleFavourite}
        />
      </span>
    </div>
  );
}

export function PlayersPage(): ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const atp = useRankings('atp');
  const wta = useRankings('wta');
  const { isFavourite, toggleFavourite, paywallPlayerId, acceptPlusPreview, dismissPaywall } =
    useFavourites();

  const allPlayers = useMemo<TourRankingEntry[]>(
    () => [
      ...atp.rankings.map((entry): TourRankingEntry => ({ ...entry, tour: 'atp' })),
      ...wta.rankings.map((entry): TourRankingEntry => ({ ...entry, tour: 'wta' })),
    ],
    [atp.rankings, wta.rankings],
  );
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchResults = allPlayers.filter((entry) =>
    entry.playerName.toLowerCase().includes(trimmedQuery),
  );
  const topTiles = useMemo<TourRankingEntry[]>(
    () => [
      ...allPlayers.filter((entry) => entry.tour === 'atp').slice(0, TILE_COUNT_PER_TOUR),
      ...allPlayers.filter((entry) => entry.tour === 'wta').slice(0, TILE_COUNT_PER_TOUR),
    ],
    [allPlayers],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl uppercase tracking-[0.12em]">Players</h1>
        <p className="font-body text-[15px] text-centre-court/70">
          Follow the players you love.
        </p>
      </header>
      <PlayerSearchInput
        placeholder="Search any player or event"
        ariaLabel="Search players by name"
        onSearch={setSearchQuery}
      />
      {trimmedQuery === '' ? (
        <section className="space-y-3">
          <h2 className="font-display text-[13px] uppercase tracking-[0.22em] text-centre-court/70">
            From the top ten
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {topTiles.map((entry) => (
              <PlayerTile
                key={entry.playerId}
                entry={entry}
                isFavourite={isFavourite(entry.playerId)}
                onToggleFavourite={toggleFavourite}
              />
            ))}
          </div>
          <p className="font-body text-xs text-centre-court/50">
            Tap a tile to follow. Open any profile from the list below or the Rankings.
          </p>
        </section>
      ) : null}
      <section>
        {searchResults.length === 0 ? (
          <p className="font-body text-[15px] text-centre-court/70">
            No player by that name on the rankings lists yet.
          </p>
        ) : (
          searchResults.map((entry) => (
            <PlayerListRow
              key={`${entry.tour}-${entry.playerId}`}
              entry={entry}
              isFavourite={isFavourite(entry.playerId)}
              onToggleFavourite={toggleFavourite}
            />
          ))
        )}
      </section>
      {paywallPlayerId !== null ? (
        <MembershipPanel onContinue={acceptPlusPreview} onDismiss={dismissPaywall} />
      ) : null}
    </div>
  );
}
