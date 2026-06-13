import { Link, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { NextMatchCard } from '@/components/matches/NextMatchCard';
import { ScorePlaque } from '@/components/scoreboard/ScorePlaque';
import { useMatchCentre } from '@/hooks/useTennisData';
import { useUserClock } from '@/hooks/useUserClock';
import type {
  H2HSummary,
  MatchStatLine,
  TennisMatch,
  TimelinePoint,
} from '@/types/matches';
import { youtubeHighlightsSearchUrl } from '@/utils/links/youtubeHighlights';

type CentreTab = 'points' | 'stats' | 'h2h';

const CENTRE_TABS: ReadonlyArray<{ key: CentreTab; label: string }> = [
  { key: 'points', label: 'Points' },
  { key: 'stats', label: 'Stats' },
  { key: 'h2h', label: 'H2H' },
];

function MomentumStrip({ momentum }: { momentum: number[] }): ReactElement | null {
  if (momentum.length === 0) {
    return null;
  }
  const peak = Math.max(...momentum);
  return (
    <section className="space-y-2">
      <h2 className="font-display text-[13px] uppercase tracking-[0.22em] text-ink-muted">
        Momentum
      </h2>
      <div className="flex h-16 items-end gap-1" aria-label="per-game momentum">
        {momentum.map((value, gameIndex) => (
          <span
            key={gameIndex}
            className="w-2.5 rounded-t-[2px] bg-ink/30"
            style={{ height: `${Math.round((value / peak) * 100)}%` }}
          />
        ))}
      </div>
    </section>
  );
}

function PointByPointList({ timeline }: { timeline: TimelinePoint[] }): ReactElement {
  if (timeline.length === 0) {
    return (
      <p className="font-body text-[15px] text-ink-muted">
        Point-by-point coverage begins when play does.
      </p>
    );
  }
  return (
    <div>
      {timeline.map((point, pointIndex) => (
        <p
          key={pointIndex}
          className="flex gap-4 border-b border-ink/10 py-2 font-body text-[15px]"
        >
          <span className="w-10 shrink-0 font-score tabular-nums">{point.games}</span>
          {point.points !== '' ? (
            <span className="w-14 shrink-0 font-score tabular-nums">{point.points}</span>
          ) : null}
          <span className="min-w-0">{point.description}</span>
        </p>
      ))}
    </div>
  );
}

function StatsTable({ stats, match }: { stats: MatchStatLine[]; match: TennisMatch }): ReactElement {
  if (stats.length === 0) {
    return (
      <p className="font-body text-[15px] text-ink-muted">
        No statistics filed for this court yet.
      </p>
    );
  }
  return (
    <div>
      <p className="flex justify-between pb-1 font-display text-xs uppercase tracking-[0.12em] text-ink-muted">
        <span>{match.player1.displayName}</span>
        <span>{match.player2.displayName}</span>
      </p>
      {stats.map((line) => (
        <p
          key={line.label}
          className="flex items-baseline justify-between border-b border-ink/10 py-2 font-body text-[15px]"
        >
          <span className="w-16 shrink-0 font-score tabular-nums">{line.p1}</span>
          <span className="text-ink-muted">{line.label}</span>
          <span className="w-16 shrink-0 text-right font-score tabular-nums">{line.p2}</span>
        </p>
      ))}
    </div>
  );
}

function h2hHeadline(h2h: H2HSummary, match: TennisMatch): string {
  if (h2h.p1Wins === h2h.p2Wins) {
    return `All square at ${h2h.p1Wins}–${h2h.p2Wins}`;
  }
  const leader = h2h.p1Wins > h2h.p2Wins ? match.player1 : match.player2;
  const high = Math.max(h2h.p1Wins, h2h.p2Wins);
  const low = Math.min(h2h.p1Wins, h2h.p2Wins);
  return `${leader.displayName} leads the head-to-head ${high}–${low}`;
}

function H2HPanel({ h2h, match }: { h2h: H2HSummary | undefined; match: TennisMatch }): ReactElement {
  if (h2h === undefined) {
    return (
      <p className="font-body text-[15px] text-ink-muted">
        No previous meetings on file — a first acquaintance.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="font-display text-base uppercase tracking-[0.08em]">
        {h2hHeadline(h2h, match)}
      </p>
      <div>
        {h2h.meetings.map((meeting) => (
          <p
            key={`${meeting.year}-${meeting.eventName}`}
            className="flex items-baseline gap-3 border-b border-ink/10 py-2 font-body text-[15px]"
          >
            <span className="w-12 shrink-0 font-score tabular-nums">{meeting.year}</span>
            <span className="min-w-0 truncate">{meeting.eventName}</span>
            <span className="ml-auto shrink-0 text-ink-muted">
              {meeting.winnerName} · <span className="font-score">{meeting.score}</span>
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function MatchCentrePage(): ReactElement {
  const { fixtureId } = useParams({ strict: false });
  const { matchCentre, isLoading } = useMatchCentre(Number(fixtureId ?? '0'));
  const { nowMs, timeZone } = useUserClock();
  const [tab, setTab] = useState<CentreTab>('points');

  if (isLoading) {
    return <div className="club-skeleton h-72" />;
  }
  if (matchCentre === null) {
    return (
      <p className="font-body text-[15px] text-ink-muted">
        No match at this address.{' '}
        <Link to="/" className="text-ribbon underline">
          The live hub has everything in play.
        </Link>
      </p>
    );
  }
  const { match, momentum, timeline, stats, storyline, h2h } = matchCentre;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="sr-only">
        {match.player1.displayName} v {match.player2.displayName} — match centre
      </h1>
      <header className="flex items-baseline justify-between gap-3">
        <Link to="/" className="font-body text-sm text-ribbon">
          ‹ Back
        </Link>
        <p className="font-body text-xs uppercase tracking-[0.18em] text-ink-muted">
          {match.tournamentName}
          {match.roundName !== undefined ? ` · ${match.roundName}` : ''}
        </p>
      </header>
      {match.state.status === 'scheduled' ? (
        <NextMatchCard match={match} nowMs={nowMs} timeZone={timeZone} />
      ) : (
        <ScorePlaque match={match} isHero />
      )}
      {match.state.status === 'finished' ? (
        <a
          href={youtubeHighlightsSearchUrl(match)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-body text-sm text-ribbon underline underline-offset-2"
        >
          Highlights on YouTube ›
        </a>
      ) : null}
      <MomentumStrip momentum={momentum} />
      <nav className="flex gap-6 border-b border-ink/15">
        {CENTRE_TABS.map((centreTab) => (
          <button
            key={centreTab.key}
            type="button"
            aria-pressed={tab === centreTab.key}
            onClick={(): void => setTab(centreTab.key)}
            className={`cursor-pointer pb-2 font-body text-[15px] transition-colors ${
              tab === centreTab.key
                ? 'border-b-2 border-ribbon text-ribbon'
                : 'text-ink-muted hover:text-ribbon'
            }`}
          >
            {centreTab.label}
          </button>
        ))}
      </nav>
      {tab === 'points' ? <PointByPointList timeline={timeline} /> : null}
      {tab === 'stats' ? <StatsTable stats={stats} match={match} /> : null}
      {tab === 'h2h' ? <H2HPanel h2h={h2h} match={match} /> : null}
      {storyline !== undefined ? (
        <footer className="border-t border-gilt pt-3 font-body text-[15px] text-ink-muted">
          {storyline}
        </footer>
      ) : null}
    </div>
  );
}
