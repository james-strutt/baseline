import { Link, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { AlertControls } from '@/components/alerts/AlertControls';
import { NextMatchCard } from '@/components/matches/NextMatchCard';
import { MembershipPanel } from '@/components/membership/MembershipPanel';
import { useFavourites } from '@/hooks/useFavourites';
import { useOrderOfPlay, usePlayerProfile } from '@/hooks/useTennisData';
import { useUserClock } from '@/hooks/useUserClock';
import type { FormResult, PlayerProfile, SurfaceWinRates } from '@/types/players';

import { matchInvolvesPlayer } from '@/utils/matches/matchInvolvesPlayer';

function FormStrip({ form }: { form: FormResult[] }): ReactElement {
  return (
    <span className="flex gap-1.5" aria-label="last ten matches">
      {form.map((result, matchIndex) => (
        <span
          key={matchIndex}
          className={`inline-flex size-5 items-center justify-center rounded-plaque font-score text-xs ${
            result === 'W' ? 'bg-centre-court text-chalk' : 'bg-ink/15 text-ink-muted'
          }`}
        >
          {result}
        </span>
      ))}
    </span>
  );
}

function HonoursPanel({ profile }: { profile: PlayerProfile }): ReactElement | null {
  if (profile.careerTitles === 0) {
    return null;
  }
  return (
    <section className="rounded-plaque border border-gilt bg-centre-court p-4">
      {profile.grandSlamTitles > 0 ? (
        <p className="font-display text-sm uppercase tracking-[0.18em] text-gilt">
          {profile.grandSlamTitles} Grand Slam titles
        </p>
      ) : null}
      <p className="mt-1 font-display text-sm uppercase tracking-[0.18em] text-gilt">
        {profile.careerTitles} career titles
      </p>
    </section>
  );
}

function surfaceSummaryLine(rates: SurfaceWinRates): string {
  return `Hard ${rates.hard}% · Clay ${rates.clay}% · Grass ${rates.grass}% win rate`;
}

function hasSurfaceRates(rates: SurfaceWinRates): boolean {
  return rates.hard + rates.clay + rates.grass > 0;
}

function profileCareerLine(profile: PlayerProfile): string {
  return [
    profile.country,
    profile.currentRank > 0 ? `No. ${profile.currentRank}` : '',
    profile.rankingPoints > 0 ? `${profile.rankingPoints.toLocaleString('en-AU')} pts` : '',
  ]
    .filter((part) => part !== '')
    .join(' · ');
}

function profileStyleLine(profile: PlayerProfile): string {
  return [profile.plays, profile.turnedPro > 0 ? `Turned pro ${profile.turnedPro}` : '']
    .filter((part) => part !== '')
    .join(' · ');
}

export function PlayerPage(): ReactElement {
  const { playerId } = useParams({ strict: false });
  const playerIdNumber = Number(playerId ?? '0');
  const { profile, isLoading } = usePlayerProfile(playerIdNumber);
  const { matches } = useOrderOfPlay();
  const { isFavourite, toggleFavourite, paywallPlayerId, acceptPlusPreview, dismissPaywall } =
    useFavourites();
  const { nowMs, timeZone } = useUserClock();

  if (isLoading) {
    return <div className="club-skeleton h-72" />;
  }
  if (profile === null) {
    return (
      <p className="font-body text-sm text-ink-muted">
        We do not have this player&apos;s file yet.{' '}
        <Link to="/rankings" className="text-ribbon underline">
          Back to the rankings.
        </Link>
      </p>
    );
  }
  const following = isFavourite(profile.id);
  const nextMatch = matches
    .filter(
      (match) =>
        match.state.status === 'scheduled' && matchInvolvesPlayer(match, [profile.id]),
    )
    .sort((a, b) => Date.parse(a.scheduledUtc) - Date.parse(b.scheduledUtc))[0];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-3xl uppercase tracking-[0.06em]">{profile.fullName}</h1>
          <p className="font-body text-sm text-ink-muted">{profileCareerLine(profile)}</p>
          <p className="font-body text-sm text-ink-muted">{profileStyleLine(profile)}</p>
        </header>
        <button
          type="button"
          aria-pressed={following}
          onClick={(): void => toggleFavourite(profile.id)}
          className="cursor-pointer rounded-plaque border border-ribbon px-3 py-1.5 font-body text-sm text-ribbon transition-colors hover:bg-ribbon hover:text-chalk"
        >
          {following ? '♥ Following' : '♡ Follow'}
        </button>
        {profile.formLastTen.length > 0 ? (
          <section className="space-y-2">
            <h2 className="font-display text-sm uppercase tracking-[0.18em] text-ink-muted">
              Form
            </h2>
            <FormStrip form={profile.formLastTen} />
          </section>
        ) : null}
        <HonoursPanel profile={profile} />
        {hasSurfaceRates(profile.surfaceWinRates) ? (
          <section className="space-y-1">
            <h2 className="font-display text-sm uppercase tracking-[0.18em] text-ink-muted">
              Surfaces
            </h2>
            <p className="font-body text-sm">{surfaceSummaryLine(profile.surfaceWinRates)}</p>
          </section>
        ) : null}
      </div>
      <div className="space-y-3">
        <h2 className="font-display text-sm uppercase tracking-[0.18em] text-ink-muted">
          Next match
        </h2>
        {nextMatch !== undefined ? (
          <NextMatchCard match={nextMatch} nowMs={nowMs} timeZone={timeZone} />
        ) : (
          <p className="font-body text-sm text-ink-muted">
            No match scheduled — the order of play updates each evening.
          </p>
        )}
        {following ? <AlertControls playerId={profile.id} /> : null}
      </div>
      {paywallPlayerId !== null ? (
        <MembershipPanel onContinue={acceptPlusPreview} onDismiss={dismissPaywall} />
      ) : null}
    </div>
  );
}
