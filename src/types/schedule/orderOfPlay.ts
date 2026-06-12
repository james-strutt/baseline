import type { TennisMatch } from '@/types/matches';

export type LocalDayPeriod = 'morning' | 'afternoon' | 'evening' | 'overnight';

export interface OrderOfPlaySegment {
  period: LocalDayPeriod;
  label: string;
  matches: TennisMatch[];
}
