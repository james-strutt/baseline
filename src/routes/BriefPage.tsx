import type { ReactElement } from 'react';
import { ScorePlaque } from '@/components/scoreboard/ScorePlaque';
import { TimePill } from '@/components/time/TimePill';
import { useFavourites } from '@/hooks/useFavourites';
import { useMatchCentre, useOrderOfPlay, useRecentResults } from '@/hooks/useTennisData';
import { useUserClock } from '@/hooks/useUserClock';
import type { TennisMatch } from '@/types/matches';
import { matchInvolvesPlayer } from '@/utils/matches/matchInvolvesPlayer';
import { matchupLabel } from '@/utils/score/formatScoreline';
import { formatLocalDate } from '@/utils/time';

const BRIEF_HEADING_CLASS =
  'font-display text-[13px] uppercase tracking-[0.22em] text-centre-court/70';

function TodayRow({
  match,
  timeZone,
  isFavouriteMatch,
}: {
  match: TennisMatch;
  timeZone: string;
  isFavouriteMatch: boolean;
}): ReactElement {
  return (
    <p className="flex items-baseline gap-3 border-b border-centre-court/10 py-2 font-body text-[15px]">
      <TimePill utcIso={match.scheduledUtc} timeZone={timeZone} isProvisional={match.isProvisional} />
      <span className="min-w-0 truncate">{matchupLabel(match)}</span>
      {isFavouriteMatch ? <span className="text-ribbon">♥</span> : null}
    </p>
  );
}

/*
 * Web preview of the Wake-up Brief (plan W8) — the same artefact the Resend
 * email template renders: the morning paper from the club.
 */
export function BriefPage(): ReactElement {
  const { results } = useRecentResults();
  const { matches } = useOrderOfPlay();
  const { favouritePlayerIds } = useFavourites();
  const { nowMs, timeZone, clockLabel } = useUserClock();

  const todaysMatches = matches
    .filter((match) => match.state.status === 'scheduled')
    .sort((a, b) => Date.parse(a.scheduledUtc) - Date.parse(b.scheduledUtc));
  const { matchCentre } = useMatchCentre(todaysMatches[0]?.fixtureId ?? 0);
  const zoneAbbreviation = clockLabel.split(' ').pop() ?? '';

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header className="space-y-2 border-b border-gilt pb-5 text-center">
        <h1 className="font-display text-3xl uppercase tracking-[0.45em]">Baseline</h1>
        <p className="font-body text-sm text-centre-court/60">
          {formatLocalDate(nowMs, timeZone)} · {zoneAbbreviation}
        </p>
      </header>
      <section className="space-y-3">
        <h2 className={BRIEF_HEADING_CLASS}>While you slept</h2>
        {results.map((match) => (
          <ScorePlaque key={match.fixtureId} match={match} />
        ))}
      </section>
      <section>
        <h2 className={BRIEF_HEADING_CLASS}>Today, your time</h2>
        <div className="mt-2">
          {todaysMatches.map((match) => (
            <TodayRow
              key={match.fixtureId}
              match={match}
              timeZone={timeZone}
              isFavouriteMatch={matchInvolvesPlayer(match, favouritePlayerIds)}
            />
          ))}
        </div>
      </section>
      {matchCentre?.storyline !== undefined ? (
        <section className="space-y-2">
          <h2 className={BRIEF_HEADING_CLASS}>One storyline</h2>
          <p className="font-body text-[15px]">{matchCentre.storyline}</p>
        </section>
      ) : null}
      <footer className="border-t border-centre-court/10 pt-4 text-center font-body text-xs text-centre-court/50">
        Delivered each morning at 7:00am your time, once the notification service is live.
      </footer>
    </div>
  );
}
