const CLOCK_LOCALE = 'en-AU';

function zonedParts(
  utcMs: number,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Map<string, string> {
  const parts = new Intl.DateTimeFormat(CLOCK_LOCALE, { timeZone, ...options }).formatToParts(
    new Date(utcMs),
  );
  return new Map(parts.map((part) => [part.type, part.value]));
}

export function formatLocalTime(utcIso: string, timeZone: string): string {
  const parts = zonedParts(Date.parse(utcIso), timeZone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const dayPeriod = (parts.get('dayPeriod') ?? '').replace(/\./g, '').toLowerCase();
  return `${parts.get('hour') ?? ''}:${parts.get('minute') ?? ''}${dayPeriod}`;
}

export function formatLocalWeekday(utcIso: string, timeZone: string): string {
  const parts = zonedParts(Date.parse(utcIso), timeZone, { weekday: 'long' });
  return parts.get('weekday') ?? '';
}

export function formatLocalKickoff(utcIso: string, timeZone: string): string {
  return `${formatLocalTime(utcIso, timeZone)} your time ${formatLocalWeekday(utcIso, timeZone)}`;
}

export function formatUserClock(utcMs: number, timeZone: string): string {
  const parts = zonedParts(utcMs, timeZone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });
  const zoneName = parts.get('timeZoneName') ?? '';
  return `${parts.get('hour') ?? ''}:${parts.get('minute') ?? ''} ${zoneName}`.trim();
}

export function formatLocalDate(utcMs: number, timeZone: string): string {
  const parts = zonedParts(utcMs, timeZone, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return `${parts.get('weekday') ?? ''} ${parts.get('day') ?? ''} ${parts.get('month') ?? ''}`;
}

export function formatCountdown(nowUtcMs: number, startUtcIso: string): string {
  const minutesUntil = Math.round((Date.parse(startUtcIso) - nowUtcMs) / 60_000);
  if (minutesUntil <= 0) {
    return 'now';
  }
  const hours = Math.floor(minutesUntil / 60);
  const minutes = minutesUntil % 60;
  return hours > 0 ? `in ${hours}h ${minutes}m` : `in ${minutes}m`;
}

export function localHourOf(utcIso: string, timeZone: string): number {
  const parts = zonedParts(Date.parse(utcIso), timeZone, {
    hour: '2-digit',
    hourCycle: 'h23',
  });
  return Number(parts.get('hour') ?? '0');
}
