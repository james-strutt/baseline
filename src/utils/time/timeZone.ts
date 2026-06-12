/*
 * Users carry an IANA time zone, never a fixed offset — DST-safe (plan §7).
 * The beachhead market default applies only when detection fails.
 */
const FALLBACK_TIME_ZONE = 'Australia/Sydney';

export function detectUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function currentUtcMs(): number {
  return Date.now();
}
