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
            result === 'W' ? 'bg-centre-court text-chalk' : 'bg-centre-court/15 text-centre-court/60'
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
      <p className="font-body text-sm text-centre-court/70">
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
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-3xl uppercase tracking-[0.06em]">{profile.fullName}</h1>
          <p className="font-body text-sm text-centre-court/70">
            {profile.country} · No. {profile.currentRank} ·{' '}
            {profile.rankingPoints.toLocaleString('en-AU')} pts
          </p>
          <p className="font-body text-sm text-centre-court/70">
            {profile.plays} · Turned pro {profile.turnedPro}
          </p>
        </header>
        <button
          type="button"
          aria-pressed={following}
          onClick={(): void => toggleFavourite(profile.id)}
          className="cursor-pointer rounded-plaque border border-ribbon px-3 py-1.5 font-body text-sm text-ribbon transition-colors hover:bg-ribbon hover:text-chalk"
        >
          {following ? '♥ Following' : '♡ Follow'}
        </button>
        <section className="space-y-2">
          <h2 className="font-display text-sm uppercase tracking-[0.18em] text-centre-court/80">
            Form
          </h2>
          <FormStrip form={profile.formLastTen} />
        </section>
        <HonoursPanel profile={profile} />
        <section className="space-y-1">
          <h2 className="font-display text-sm uppercase tracking-[0.18em] text-centre-court/80">
            Surfaces
          </h2>
          <p className="font-body text-sm">{surfaceSummaryLine(profile.surfaceWinRates)}</p>
        </section>
      </div>
      <div className="space-y-3">
        <h2 className="font-display text-sm uppercase tracking-[0.18em] text-centre-court/80">
          Next match
        </h2>
        {nextMatch !== undefined ? (
          <NextMatchCard match={nextMatch} nowMs={nowMs} timeZone={timeZone} />
        ) : (
          <p className="font-body text-sm text-centre-court/70">
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
