import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
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
    const parts = [live.gamePoints, setOrdinalLabel(live.currentSet)];
    if (live.elapsedMinutes > 0) {
      parts.push(elapsedLabel(live.elapsedMinutes));
    }
    return parts.join(' · ');
  }
  return 'Final score';
}

interface ServeRowTop {
  containerRef: RefObject<HTMLDivElement | null>;
  rowRefs: RefObject<Array<HTMLDivElement | null>>;
  top: number | null;
}

/* Measure the serving row's centre so the optic dot lands exactly, whatever
 * the responsive slot height — then CSS transitions the slide. */
function useServeRowTop(activeRow: number | null): ServeRowTop {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (activeRow === null) {
      setTop(null);
      return;
    }
    const container = containerRef.current;
    const row = rowRefs.current[activeRow];
    if (container === null || row === null || row === undefined) {
      return;
    }
    const measure = (): void => {
      const containerRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      setTop(rowRect.top - containerRect.top + rowRect.height / 2);
    };
    measure();
    /* ResizeObserver is absent under jsdom and the SSG pre-render (plan §5). */
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return (): void => observer.disconnect();
  }, [activeRow]);

  return { containerRef, rowRefs, top };
}

interface PlaqueRowProps {
  player: MatchPlayer;
  games: number[];
  isHero: boolean;
}

function PlaqueRow({ player, games, isHero }: PlaqueRowProps): ReactElement {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={`min-w-0 truncate font-display ${isHero ? 'text-name-lg' : 'text-name-sm'}`}
      >
        {player.displayName}
        {player.ranking !== undefined ? (
          <span className={`text-chalk/55 ${isHero ? 'text-base' : 'text-xs'}`}>
            {' '}
            ({player.ranking})
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 gap-1 sm:gap-1.5">
        {games.map((gamesWon, setIndex) => (
          <span
            key={setIndex}
            className={`overflow-hidden rounded-[2px] bg-centre-court-deep/80 shadow-inner ${
              isHero
                ? 'h-10 w-7 text-2xl sm:h-12 sm:w-9 sm:text-3xl md:h-14 md:w-10 md:text-4xl'
                : 'h-9 w-7 text-lg'
            }`}
          >
            <FlipDigit value={String(gamesWon)} />
          </span>
        ))}
      </span>
    </div>
  );
}

interface PlaqueRowsProps {
  player1: MatchPlayer;
  player2: MatchPlayer;
  sets: SetScore[];
  servingPlayer: 1 | 2 | null;
  isHero: boolean;
}

function PlaqueRows({
  player1,
  player2,
  sets,
  servingPlayer,
  isHero,
}: PlaqueRowsProps): ReactElement {
  const activeRow = servingPlayer !== null ? servingPlayer - 1 : null;
  const { containerRef, rowRefs, top } = useServeRowTop(activeRow);
  const players = [player1, player2];
  return (
    <div ref={containerRef} className={`relative ${isHero ? 'space-y-4' : 'space-y-3'}`}>
      {activeRow !== null && top !== null ? (
        <span
          aria-hidden
          style={{ top }}
          className={`serve-dot -translate-y-1/2 ${isHero ? '-left-6' : '-left-5'}`}
        >
          <LiveDot />
        </span>
      ) : null}
      {players.map((player, rowIndex) => (
        <div
          key={player.id === 0 ? rowIndex : player.id}
          ref={(element): void => {
            rowRefs.current[rowIndex] = element;
          }}
        >
          <PlaqueRow
            player={player}
            games={sets.map((set) => (rowIndex === 0 ? set.p1Games : set.p2Games))}
            isHero={isHero}
          />
        </div>
      ))}
    </div>
  );
}

/*
 * The Club Scoreboard plaque (plan §4.1): centre-court green panel, chalk
 * split-flap digits, one gilt hairline frame, the single sanctioned gradient
 * (the light falloff inside a scoreboard slot), and the optic serve dot that
 * slides to the serving player's row.
 */
export function ScorePlaque({ match, isHero = false }: ScorePlaqueProps): ReactElement | null {
  const score = plaqueScoreFor(match.state);
  if (score === null) {
    return null;
  }
  const isLive = match.state.status === 'live';
  return (
    <article
      className={`rounded-plaque border border-line-strong bg-gradient-to-b from-centre-court to-centre-court-deep text-chalk ${
        isHero ? 'p-6 md:p-8' : 'p-5'
      }`}
    >
      <header className="mb-4 flex items-center gap-2.5 font-body text-eyebrow uppercase text-chalk/90">
        {isLive ? <LiveDot /> : null}
        <span className="truncate">
          {isLive ? 'Live · ' : ''}
          {match.tournamentName}
          {match.surface !== undefined ? ` · ${match.surface}` : ''}
        </span>
      </header>
      <PlaqueRows
        player1={match.player1}
        player2={match.player2}
        sets={score.sets}
        servingPlayer={isLive ? (score.live?.servingPlayer ?? null) : null}
        isHero={isHero}
      />
      <footer
        className={`mt-5 font-score tracking-wide text-chalk/80 ${isHero ? 'text-base' : 'text-sm'}`}
      >
        {plaqueFooterLine(match.state, score.live)}
      </footer>
    </article>
  );
}
