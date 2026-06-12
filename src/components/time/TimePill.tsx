import type { ReactElement } from 'react';
import { formatLocalKickoff } from '@/utils/time';

export interface TimePillProps {
  utcIso: string;
  timeZone: string;
  isProvisional: boolean;
}

/*
 * Local-time-first everywhere; provisional times carry "~" and never pretend
 * precision (plan §7, §13: order-of-play chaos breaks trust).
 */
export function TimePill({ utcIso, timeZone, isProvisional }: TimePillProps): ReactElement {
  return (
    <span className="font-score text-sm tabular-nums">
      {isProvisional ? '~' : ''}
      {formatLocalKickoff(utcIso, timeZone)}
    </span>
  );
}
