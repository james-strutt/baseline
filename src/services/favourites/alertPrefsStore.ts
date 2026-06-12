import { logger } from '@/lib/logger';
import type { AlertChannel, AlertKind, AlertPreferences } from '@/types/alerts';

/*
 * Local persistence for per-favourite alert preferences (plan W7). When the
 * notification service lands, this becomes the favourites.notif_prefs column
 * behind the same read/write functions.
 */
const ALERT_PREFS_STORAGE_KEY = 'baseline.alert-preferences';

export const ALERT_KINDS: AlertKind[] = [
  'day-before',
  'starting-soon',
  'walk-on',
  'every-set',
  'final-result',
];

export const ALERT_CHANNELS: AlertChannel[] = ['push', 'email'];

const DEFAULT_PREFERENCES: AlertPreferences = {
  kinds: {
    'day-before': true,
    'starting-soon': true,
    'walk-on': true,
    'every-set': false,
    'final-result': true,
  },
  channels: { push: true, email: true },
};

interface StoredPreferences {
  kinds?: Record<string, unknown>;
  channels?: Record<string, unknown>;
}

function storedPreferencesFor(playerId: number): StoredPreferences {
  try {
    const stored = window.localStorage.getItem(ALERT_PREFS_STORAGE_KEY);
    if (stored === null) {
      return {};
    }
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }
    const entry: unknown = (parsed as Record<string, unknown>)[String(playerId)];
    return typeof entry === 'object' && entry !== null ? (entry as StoredPreferences) : {};
  } catch {
    return {};
  }
}

export function readAlertPreferences(playerId: number): AlertPreferences {
  const stored = storedPreferencesFor(playerId);
  const kinds = { ...DEFAULT_PREFERENCES.kinds };
  for (const kind of ALERT_KINDS) {
    const value = stored.kinds?.[kind];
    if (typeof value === 'boolean') {
      kinds[kind] = value;
    }
  }
  const channels = { ...DEFAULT_PREFERENCES.channels };
  for (const channel of ALERT_CHANNELS) {
    const value = stored.channels?.[channel];
    if (typeof value === 'boolean') {
      channels[channel] = value;
    }
  }
  return { kinds, channels };
}

export function writeAlertPreferences(playerId: number, preferences: AlertPreferences): void {
  try {
    const stored = window.localStorage.getItem(ALERT_PREFS_STORAGE_KEY);
    const parsed: unknown = stored !== null ? JSON.parse(stored) : {};
    const all = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    all[String(playerId)] = preferences;
    window.localStorage.setItem(ALERT_PREFS_STORAGE_KEY, JSON.stringify(all));
  } catch (error) {
    logger.warn(
      'alert preferences could not be persisted',
      { error: error instanceof Error ? error.message : String(error) },
      'alertPrefsStore',
    );
  }
}
