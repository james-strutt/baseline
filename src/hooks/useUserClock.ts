import { useEffect, useMemo, useState } from 'react';
import { currentUtcMs, detectUserTimeZone, formatUserClock } from '@/utils/time';

const CLOCK_REFRESH_MS = 30_000;

export interface UseUserClockReturn {
  nowMs: number;
  timeZone: string;
  clockLabel: string;
}

export function useUserClock(): UseUserClockReturn {
  const [nowMs, setNowMs] = useState<number>(currentUtcMs);
  const timeZone = useMemo(() => detectUserTimeZone(), []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(currentUtcMs()), CLOCK_REFRESH_MS);
    return (): void => window.clearInterval(intervalId);
  }, []);

  return { nowMs, timeZone, clockLabel: formatUserClock(nowMs, timeZone) };
}
