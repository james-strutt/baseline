/*
 * Centralised PostHog event names (CLAUDE.md: Domain Constants).
 * Convention: area.feature.action.
 */
export const ANALYTICS_EVENTS = {
  favouritePlayerAdded: 'favourites.player.added',
  favouritePlayerRemoved: 'favourites.player.removed',
  alertPreferenceChanged: 'alerts.preference.changed',
  paywallPlusShown: 'paywall.plus.shown',
  paywallPlusAccepted: 'paywall.plus.accepted',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
