import type { ReactElement } from 'react';

export interface FavouriteToggleButtonProps {
  playerId: number;
  playerName: string;
  isFavourite: boolean;
  onToggleFavourite(playerId: number): void;
}

/* Inherits the surrounding text colour so it sits on green boards and white rows alike. */
export function FavouriteToggleButton({
  playerId,
  playerName,
  isFavourite,
  onToggleFavourite,
}: FavouriteToggleButtonProps): ReactElement {
  return (
    <button
      type="button"
      aria-pressed={isFavourite}
      aria-label={isFavourite ? `Unfollow ${playerName}` : `Follow ${playerName}`}
      onClick={(): void => onToggleFavourite(playerId)}
      className="cursor-pointer px-1 transition-opacity hover:opacity-70"
    >
      {isFavourite ? '♥' : '♡'}
    </button>
  );
}
