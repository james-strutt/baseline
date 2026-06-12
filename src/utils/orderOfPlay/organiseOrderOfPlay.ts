import type { TennisMatch } from '@/types/matches';
import type { LocalDayPeriod, OrderOfPlaySegment } from '@/types/schedule';
import { localHourOf } from '@/utils/time';

const SEGMENT_LABELS: Record<LocalDayPeriod, string> = {
  morning: 'Your morning',
  afternoon: 'Your afternoon',
  evening: 'Your evening',
  overnight: 'Overnight',
};

function dayPeriodForHour(hour: number): LocalDayPeriod {
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }
  if (hour >= 12 && hour < 18) {
    return 'afternoon';
  }
  if (hour >= 18 && hour < 23) {
    return 'evening';
  }
  return 'overnight';
}

/*
 * The day reorganises around the user's clock, not the venue's (plan §3.1,
 * W6): chronological order with consecutive matches grouped into local
 * day-period segments.
 */
export function organiseOrderOfPlay(
  matches: TennisMatch[],
  timeZone: string,
): OrderOfPlaySegment[] {
  const chronological = [...matches].sort(
    (a, b) => Date.parse(a.scheduledUtc) - Date.parse(b.scheduledUtc),
  );
  const segments: OrderOfPlaySegment[] = [];
  for (const match of chronological) {
    const period = dayPeriodForHour(localHourOf(match.scheduledUtc, timeZone));
    const currentSegment = segments[segments.length - 1];
    if (currentSegment?.period === period) {
      currentSegment.matches.push(match);
    } else {
      segments.push({ period, label: SEGMENT_LABELS[period], matches: [match] });
    }
  }
  return segments;
}
