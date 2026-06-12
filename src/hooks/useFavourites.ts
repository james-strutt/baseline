import { useCallback, useState } from 'react';
import { ANALYTICS_EVENTS } from '@/constants/analyticsEvents';
import { captureAnalyticsEvent } from '@/lib/analytics';
import {
  grantPlusPreview,
  hasPlusPreview,
  readFavouritePlayerIds,
  writeFavouritePlayerIds,
} from '@/services/favourites/favouritesStore';

const FREE_FAVOURITE_LIMIT = 2;

export interface UseFavouritesReturn {
  favouritePlayerIds: number[];
  isFavourite(playerId: number): boolean;
  toggleFavourite(playerId: number): void;
  paywallPlayerId: number | null;
  acceptPlusPreview(): void;
  dismissPaywall(): void;
}

export function useFavourites(): UseFavouritesReturn {
  const [favouritePlayerIds, setFavouritePlayerIds] = useState<number[]>(readFavouritePlayerIds);
  const [paywallPlayerId, setPaywallPlayerId] = useState<number | null>(null);

  const isFavourite = useCallback(
    (playerId: number): boolean => favouritePlayerIds.includes(playerId),
    [favouritePlayerIds],
  );

  const addFavourite = useCallback((playerId: number, current: number[]): void => {
    const next = [...current, playerId];
    writeFavouritePlayerIds(next);
    captureAnalyticsEvent(ANALYTICS_EVENTS.favouritePlayerAdded, { player_id: playerId });
    setFavouritePlayerIds(next);
  }, []);

  const toggleFavourite = useCallback(
    (playerId: number): void => {
      if (favouritePlayerIds.includes(playerId)) {
        const next = favouritePlayerIds.filter((id) => id !== playerId);
        writeFavouritePlayerIds(next);
        captureAnalyticsEvent(ANALYTICS_EVENTS.favouritePlayerRemoved, { player_id: playerId });
        setFavouritePlayerIds(next);
        return;
      }
      if (favouritePlayerIds.length >= FREE_FAVOURITE_LIMIT && !hasPlusPreview()) {
        captureAnalyticsEvent(ANALYTICS_EVENTS.paywallPlusShown, { player_id: playerId });
        setPaywallPlayerId(playerId);
        return;
      }
      addFavourite(playerId, favouritePlayerIds);
    },
    [favouritePlayerIds, addFavourite],
  );

  const acceptPlusPreview = useCallback((): void => {
    if (paywallPlayerId === null) {
      return;
    }
    grantPlusPreview();
    captureAnalyticsEvent(ANALYTICS_EVENTS.paywallPlusAccepted, { player_id: paywallPlayerId });
    addFavourite(paywallPlayerId, favouritePlayerIds);
    setPaywallPlayerId(null);
  }, [paywallPlayerId, favouritePlayerIds, addFavourite]);

  const dismissPaywall = useCallback((): void => setPaywallPlayerId(null), []);

  return {
    favouritePlayerIds,
    isFavourite,
    toggleFavourite,
    paywallPlayerId,
    acceptPlusPreview,
    dismissPaywall,
  };
}
