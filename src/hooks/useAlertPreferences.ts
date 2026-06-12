import { useCallback, useEffect, useState } from 'react';
import { ANALYTICS_EVENTS } from '@/constants/analyticsEvents';
import { captureAnalyticsEvent } from '@/lib/analytics';
import {
  readAlertPreferences,
  writeAlertPreferences,
} from '@/services/favourites/alertPrefsStore';
import type { AlertChannel, AlertKind, AlertPreferences } from '@/types/alerts';

export interface UseAlertPreferencesReturn {
  preferences: AlertPreferences;
  toggleKind(kind: AlertKind): void;
  toggleChannel(channel: AlertChannel): void;
}

export function useAlertPreferences(playerId: number): UseAlertPreferencesReturn {
  const [preferences, setPreferences] = useState<AlertPreferences>(() =>
    readAlertPreferences(playerId),
  );

  useEffect(() => {
    setPreferences(readAlertPreferences(playerId));
  }, [playerId]);

  const persist = useCallback(
    (next: AlertPreferences, changed: string, enabled: boolean): void => {
      writeAlertPreferences(playerId, next);
      captureAnalyticsEvent(ANALYTICS_EVENTS.alertPreferenceChanged, {
        player_id: playerId,
        preference: changed,
        enabled,
      });
      setPreferences(next);
    },
    [playerId],
  );

  const toggleKind = useCallback(
    (kind: AlertKind): void => {
      const enabled = !preferences.kinds[kind];
      persist(
        { ...preferences, kinds: { ...preferences.kinds, [kind]: enabled } },
        kind,
        enabled,
      );
    },
    [preferences, persist],
  );

  const toggleChannel = useCallback(
    (channel: AlertChannel): void => {
      const enabled = !preferences.channels[channel];
      persist(
        { ...preferences, channels: { ...preferences.channels, [channel]: enabled } },
        channel,
        enabled,
      );
    },
    [preferences, persist],
  );

  return { preferences, toggleKind, toggleChannel };
}
