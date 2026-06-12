import { mapSurface, mapTourLevel } from '@/services/tennisData/mappers';
import type {
  ProviderFixture,
  ProviderH2HMatch,
  ProviderLiveEvent,
  ProviderPlayerProfile,
  ProviderRankingRow,
  ProviderTimelineEntry,
} from '@/services/tennisData/providerShapes';
import type {
  H2HSummary,
  MatchState,
  SetScore,
  TennisMatch,
  TimelinePoint,
} from '@/types/matches';
import type { FormResult, PlayerProfile, RankingEntry } from '@/types/players';

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

function winnerFromSets(sets: SetScore[]): 1 | 2 {
  const player1Sets = sets.filter((set) => set.p1Games > set.p2Games).length;
  const player2Sets = sets.filter((set) => set.p2Games > set.p1Games).length;
  return player1Sets >= player2Sets ? 1 : 2;
}

function liveEventState(raw: ProviderLiveEvent, retrievedAtIso: string): MatchState {
  const sets = parseSetScores(raw.score);
  if (raw.status === 'Finished') {
    return { status: 'finished', finalSets: sets, winner: winnerFromSets(sets) };
  }
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

function mapProviderForm(form: string[] | null | undefined): FormResult[] {
  return (form ?? [])
    .map((entry) => entry.toUpperCase())
    .filter((entry): entry is FormResult => entry === 'W' || entry === 'L')
    .slice(0, 10);
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
    formLastTen: mapProviderForm(raw.form),
    surfaceWinRates: { hard: 0, clay: 0, grass: 0 },
    careerTitles: 0,
    grandSlamTitles: 0,
  };
}

export function mapProviderH2H(
  matches: ProviderH2HMatch[],
  ourPlayer1Id: number,
  ourPlayer2Id: number,
): H2HSummary {
  return {
    p1Wins: matches.filter((meeting) => meeting.match_winner === ourPlayer1Id).length,
    p2Wins: matches.filter((meeting) => meeting.match_winner === ourPlayer2Id).length,
    meetings: matches.map((meeting) => ({
      year: Number(meeting.date.slice(0, 4)),
      eventName: meeting.tournamentName ?? 'Tour meeting',
      winnerName:
        meeting.match_winner === meeting.player1.id
          ? meeting.player1.name
          : meeting.player2.name,
      score: meeting.result,
    })),
  };
}

const TIMELINE_ENTRY_PATTERN = /^Game (\d+) - (.+?) - (.+)$/;

export interface MappedTimeline {
  timeline: TimelinePoint[];
  momentum: number[];
}

function timelineMomentumValue(winnerName: string, wasBreak: boolean, match: TennisMatch): number {
  const wonByPlayer1 = winnerName === match.player1.displayName;
  if (wonByPlayer1) {
    return wasBreak ? 7 : 5;
  }
  return wasBreak ? 1 : 3;
}

/* The provider narrates each game ("Game 12 - Marin Cilic - breaks to 30");
 * holds and breaks also drive the momentum strip. */
export function mapProviderTimeline(
  entries: ProviderTimelineEntry[],
  match: TennisMatch,
): MappedTimeline {
  const timeline: TimelinePoint[] = [];
  const momentum: number[] = [];
  for (const entry of entries) {
    const parsed = TIMELINE_ENTRY_PATTERN.exec(entry.text);
    if (parsed === null) {
      timeline.push({ games: '', points: '', description: entry.text });
      momentum.push(4);
      continue;
    }
    const [, gameNumber, winnerName, outcome] = parsed;
    timeline.push({
      games: gameNumber ?? '',
      points: '',
      description: `${winnerName ?? ''} ${outcome ?? ''}`.trim(),
    });
    momentum.push(
      timelineMomentumValue(winnerName ?? '', (outcome ?? '').includes('break'), match),
    );
  }
  return { timeline, momentum };
}
