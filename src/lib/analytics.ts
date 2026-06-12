import type { AnalyticsEventName } from '@/constants/analyticsEvents';
import { logger } from '@/lib/logger';

/*
 * Single capture seam: the PostHog client (plan §5, Phase 3) replaces the
 * logger sink here without touching call sites.
 */
export function captureAnalyticsEvent(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  logger.debug('analytics event captured', { event, ...properties }, 'analytics');
}
