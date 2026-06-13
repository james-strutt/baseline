import type { ReactElement } from 'react';
import { TimePill } from '@/components/time/TimePill';
import type { TennisMatch } from '@/types/matches';
import { matchupLabel } from '@/utils/score/formatScoreline';
import { formatCountdown } from '@/utils/time';

export interface NextMatchCardProps {
  match: TennisMatch;
  nowMs: number;
  timeZone: string;
}

export function NextMatchCard({ match, nowMs, timeZone }: NextMatchCardProps): ReactElement {
  return (
    <article className="rounded-plaque border border-ink/20 bg-canvas p-5">
      <h3 className="font-display text-lg uppercase tracking-[0.08em]">
        Next — {matchupLabel(match)}
      </h3>
      <p className="mt-1.5 font-body text-[15px]">
        <span className="font-score tabular-nums">
          {formatCountdown(nowMs, match.scheduledUtc)}
        </span>
        {' · '}
        <TimePill
          utcIso={match.scheduledUtc}
          timeZone={timeZone}
          isProvisional={match.isProvisional}
        />
      </p>
      <p className="mt-1 font-body text-xs text-ink-muted">
        {match.tournamentName}
        {match.roundName !== undefined ? ` · ${match.roundName}` : ''}
      </p>
    </article>
  );
}
