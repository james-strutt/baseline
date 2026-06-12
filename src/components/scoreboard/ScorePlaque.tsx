import type { ReactElement } from 'react';
import { FlipDigit } from '@/components/scoreboard/FlipDigit';
import { LiveDot } from '@/components/scoreboard/LiveDot';
import type { LiveScore, MatchPlayer, MatchState, SetScore, TennisMatch } from '@/types/matches';

export interface ScorePlaqueProps {
  match: TennisMatch;
  isHero?: boolean;
}

interface PlaqueScore {
  sets: SetScore[];
  live: LiveScore | null;
}

function plaqueScoreFor(state: MatchState): PlaqueScore | null {
  switch (state.status) {
    case 'live':
    case 'suspended':
      return { sets: state.score.sets, live: state.score };
    case 'finished':
      return { sets: state.finalSets, live: null };
    case 'scheduled':
      return null;
  }
}

function setOrdinalLabel(setNumber: number): string {
  const ordinals = ['1st', '2nd', '3rd', '4th', '5th'];
  return `${ordinals[setNumber - 1] ?? `${setNumber}th`} set`;
}

function elapsedLabel(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function plaqueFooterLine(state: MatchState, live: LiveScore | null): string {
  if (state.status === 'suspended') {
    return 'Play suspended — resuming shortly.';
  }
  if (live !== null) {
    return `${live.gamePoints} · ${setOrdinalLabel(live.currentSet)} · ${elapsedLabel(live.elapsedMinutes)}`;
  }
  return 'Final score';
}

interface PlaqueRowProps {
  player: MatchPlayer;
  games: number[];
  isServing: boolean;
  isHero: boolean;
}

/* Digits sit in stencil slots — the cut letterforms of a manual scoreboard. */
function PlaqueRow({ player, games, isServing, isHero }: PlaqueRowProps): ReactElement {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={`truncate font-display uppercase tracking-[0.08em] ${
          isHero ? 'text-2xl md:text-3xl' : 'text-lg'
        }`}
      >
        {player.displayName}
        {player.ranking !== undefined ? (
          <span className={`text-chalk/60 ${isHero ? 'text-base' : 'text-xs'}`}>
            {' '}
            ({player.ranking})
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-3">
        <span className={isServing ? 'visible' : 'invisible'}>
          <LiveDot />
        </span>
        <span className="flex gap-1.5">
          {games.map((gamesWon, setIndex) => (
            <span
              key={setIndex}
              className={`flex items-center justify-center rounded-[2px] bg-centre-court-deep/80 shadow-inner ${
                isHero ? 'h-12 w-9 text-2xl md:h-14 md:w-10 md:text-3xl' : 'h-9 w-7 text-lg'
              }`}
            >
              <FlipDigit value={String(gamesWon)} />
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}

/*
 * The Club Scoreboard plaque (plan §4.1): centre-court green panel, chalk
 * digits, one gilt hairline frame, and the single sanctioned gradient — the
 * vertical light falloff inside a real scoreboard slot.
 */
export function ScorePlaque({ match, isHero = false }: ScorePlaqueProps): ReactElement | null {
  const score = plaqueScoreFor(match.state);
  if (score === null) {
    return null;
  }
  const isLive = match.state.status === 'live';
  return (
    <article
      className={`rounded-plaque border border-gilt bg-gradient-to-b from-centre-court to-centre-court-deep text-chalk ${
        isHero ? 'p-6 md:p-8' : 'p-5'
      }`}
    >
      <header className="mb-4 flex items-center gap-2.5 font-body text-[11px] uppercase tracking-[0.24em] text-chalk/90">
        {isLive ? <LiveDot /> : null}
        <span className="truncate">
          {isLive ? 'Live · ' : ''}
          {match.tournamentName} · {match.surface}
        </span>
      </header>
      <div className={isHero ? 'space-y-4' : 'space-y-3'}>
        <PlaqueRow
          player={match.player1}
          games={score.sets.map((set) => set.p1Games)}
          isServing={score.live?.servingPlayer === 1 && isLive}
          isHero={isHero}
        />
        <PlaqueRow
          player={match.player2}
          games={score.sets.map((set) => set.p2Games)}
          isServing={score.live?.servingPlayer === 2 && isLive}
          isHero={isHero}
        />
      </div>
      <footer
        className={`mt-5 font-score tracking-wide text-chalk/80 ${isHero ? 'text-base' : 'text-sm'}`}
      >
        {plaqueFooterLine(match.state, score.live)}
      </footer>
    </article>
  );
}
