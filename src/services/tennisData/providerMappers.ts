import { mapSurface, mapTourLevel } from '@/services/tennisData/mappers';
import type {
  ProviderFixture,
  ProviderLiveEvent,
  ProviderPlayerProfile,
  ProviderRankingRow,
} from '@/services/tennisData/providerShapes';
import type { MatchState, SetScore, TennisMatch } from '@/types/matches';
import type { PlayerProfile, RankingEntry } from '@/types/players';

function toGames(text: string | undefined): number {
  const value = Number(text);
  return Number.isFinite(value) ? value : 0;
}

function parseSetScores(score: string): SetScore[] {
  if (score.trim() === '') {
    return [];
  }
  return score.split(',').map((setText) => {
    const games = setText.split('-');
    return { p1Games: toGames(games[0]), p2Games: toGames(games[1]) };
  });
}

function liveEventState(raw: ProviderLiveEvent, retrievedAtIso: string): MatchState {
  const sets = parseSetScores(raw.score);
  const score = {
    sets,
    gamePoints: raw.points.replace('-', '–'),
    servingPlayer: raw.indicator.startsWith('1') ? (1 as const) : (2 as const),
    currentSet: Math.max(sets.length, 1),
    elapsedMinutes: 0,
  };
  if (raw.status === 'Suspended') {
    return { status: 'suspended', score, lastUpdatedUtc: retrievedAtIso };
  }
  return { status: 'live', score };
}

/* The live feed names matches "A vs B" with no player ids or countries —
 * enrichment joins arrive with the ingestion service. */
export function mapProviderLiveEvent(
  raw: ProviderLiveEvent,
  retrievedAtIso: string,
): TennisMatch {
  const [name1, name2] = raw.name.split(' vs ');
  return {
    fixtureId: Number(raw.id),
    tournamentName: raw.league,
    tourLevel: mapTourLevel(raw.league),
    scheduledUtc: retrievedAtIso,
    isProvisional: false,
    player1: { id: 0, displayName: name1 ?? raw.name, countryCode: '' },
    player2: { id: 0, displayName: name2 ?? '', countryCode: '' },
    state: liveEventState(raw, retrievedAtIso),
  };
}

function parseSeed(seed: string | null): number | undefined {
  return seed !== null && /^\d+$/.test(seed) ? Number(seed) : undefined;
}

export function mapProviderFixture(raw: ProviderFixture): TennisMatch {
  const tourLabel = `${raw.tournamentTier ?? ''} ${raw.tournamentName ?? ''}`;
  const derivedLevel = mapTourLevel(tourLabel);
  return {
    fixtureId: raw.id,
    tournamentName: raw.tournamentName ?? `${raw.tour.toUpperCase()} fixture`,
    tourLevel: derivedLevel === 'atp' && raw.tour === 'wta' ? 'wta' : derivedLevel,
    surface: raw.surface !== null ? mapSurface(raw.surface) : undefined,
    scheduledUtc: raw.date,
    isProvisional: false,
    player1: {
      id: raw.player1.id,
      displayName: raw.player1.name,
      countryCode: raw.player1.countryAcr,
      seed: parseSeed(raw.seed1),
    },
    player2: {
      id: raw.player2.id,
      displayName: raw.player2.name,
      countryCode: raw.player2.countryAcr,
      seed: parseSeed(raw.seed2),
    },
    state: { status: 'scheduled' },
  };
}

export function mapProviderRankingRow(raw: ProviderRankingRow): RankingEntry {
  return {
    position: raw.position,
    playerId: raw.player.id,
    playerName: raw.player.name,
    countryCode: raw.player.countryAcr,
    points: raw.rankingPoints,
    weeklyMovement: 0,
  };
}

export function mapProviderPlayerProfile(raw: ProviderPlayerProfile): PlayerProfile {
  const turnedPro = Number(raw.information?.turnedPro ?? '');
  return {
    id: raw.id,
    fullName: raw.name,
    country: raw.country?.name ?? raw.countryAcr,
    plays: (raw.information?.plays ?? '').split(',')[0]?.trim() ?? '',
    turnedPro: Number.isFinite(turnedPro) ? turnedPro : 0,
    currentRank: raw.currentRank ?? 0,
    rankingPoints: raw.points ?? 0,
    formLastTen: [],
    surfaceWinRates: { hard: 0, clay: 0, grass: 0 },
    careerTitles: 0,
    grandSlamTitles: 0,
  };
}
