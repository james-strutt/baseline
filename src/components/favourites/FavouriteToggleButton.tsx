import type { ReactElement } from 'react';

export interface FavouriteToggleButtonProps {
  playerId: number;
  playerName: string;
  isFavourite: boolean;
  onToggleFavourite(playerId: number): void;
}

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

/*
 * Inherits the surrounding colour so it reads on green boards (chalk) and the
 * canvas (ink) alike — ribbon would vanish on green. The fill cross-fades in
 * on follow (the courteous confirmation); nothing bounces.
 */
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
      className="inline-flex size-5 cursor-pointer items-center justify-center transition-opacity hover:opacity-70"
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path d={HEART_PATH} fill="none" stroke="currentColor" strokeWidth={1.6} />
        <path
          d={HEART_PATH}
          fill="currentColor"
          className={`transition-opacity duration-150 ${isFavourite ? 'opacity-100' : 'opacity-0'}`}
        />
      </svg>
    </button>
  );
}
