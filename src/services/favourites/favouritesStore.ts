import { logger } from '@/lib/logger';

/*
 * Local-only persistence for the scaffold. When Supabase auth lands, this
 * store is replaced by the favourites table (RLS-protected) behind the same
 * read/write functions.
 */
const FAVOURITE_PLAYERS_STORAGE_KEY = 'baseline.favourite-players';
const PLUS_PREVIEW_STORAGE_KEY = 'baseline.plus-preview';

/* Free tier carries two favourites (plan §9.1); the paywall moment fires on
 * the third. The preview flag stands in for a real entitlement until
 * RevenueCat lands in Phase 3. */
export function hasPlusPreview(): boolean {
  try {
    return window.localStorage.getItem(PLUS_PREVIEW_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function grantPlusPreview(): void {
  try {
    window.localStorage.setItem(PLUS_PREVIEW_STORAGE_KEY, 'true');
  } catch (error) {
    logger.warn(
      'plus preview could not be persisted',
      { error: error instanceof Error ? error.message : String(error) },
      'favouritesStore',
    );
  }
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'number');
}

export function readFavouritePlayerIds(): number[] {
  try {
    const stored = window.localStorage.getItem(FAVOURITE_PLAYERS_STORAGE_KEY);
    if (stored === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(stored);
    return isNumberArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeFavouritePlayerIds(playerIds: number[]): void {
  try {
    window.localStorage.setItem(FAVOURITE_PLAYERS_STORAGE_KEY, JSON.stringify(playerIds));
  } catch (error) {
    logger.warn(
      'favourites could not be persisted',
      { error: error instanceof Error ? error.message : String(error) },
      'favouritesStore',
    );
  }
}
