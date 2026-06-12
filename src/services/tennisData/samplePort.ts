import type {
  RawEventStatus,
  RawLiveEvent,
  RawMatchExtras,
  RawPlayerInfo,
} from '@/services/tennisData/apiShapes';
import {
  mapLiveEvent,
  mapMatchExtras,
  mapPlayerInfo,
  mapRankingRow,
} from '@/services/tennisData/mappers';
import {
  SAMPLE_ATP_RANKINGS,
  SAMPLE_EVENTS,
  SAMPLE_MATCH_EXTRAS,
  SAMPLE_PLAYER_PROFILES,
  SAMPLE_WTA_RANKINGS,
} from '@/services/tennisData/sampleData';
import type { TennisDataPort } from '@/services/tennisData/tennisDataPort';
import type { MatchCentreData, TennisMatch } from '@/types/matches';
import type { PlayerProfile, RankingEntry, RankingTour } from '@/types/players';

function eventsWithStatus(statuses: RawEventStatus[]): TennisMatch[] {
  return SAMPLE_EVENTS.filter((event) => statuses.includes(event.status)).map(mapLiveEvent);
}

/* Deterministic stand-in profile derived from the player's id, so every
 * linked player page has a file until the real back-fill job exists. */
function buildDerivedProfile(
  id: number,
  name: string,
  country: string,
  rank: number,
  points: number,
): RawPlayerInfo {
  const formCycle = 'WWLWWLWWWLWLWW';
  const formStart = id % 5;
  return {
    id,
    name,
    country,
    plays: id % 4 === 0 ? 'Left-handed' : 'Right-handed',
    turnedPro: 2006 + (id % 18),
    currentRank: rank,
    points,
    form: formCycle.slice(formStart, formStart + 10),
    surfaceWins: {
      hard: 58 + ((id * 7) % 25),
      clay: 55 + ((id * 11) % 27),
      grass: 52 + ((id * 13) % 29),
    },
    titles: (id * 3) % 9,
    grandSlams: 0,
  };
}

function derivedProfileFor(playerId: number): RawPlayerInfo | null {
  const ranked = [...SAMPLE_ATP_RANKINGS, ...SAMPLE_WTA_RANKINGS].find(
    (row) => row.playerId === playerId,
  );
  if (ranked !== undefined) {
    return buildDerivedProfile(
      playerId,
      ranked.playerName,
      ranked.countryAcr,
      ranked.position,
      ranked.points,
    );
  }
  for (const event of SAMPLE_EVENTS) {
    for (const player of [event.homePlayer, event.awayPlayer]) {
      if (player.id === playerId) {
        return buildDerivedProfile(
          playerId,
          player.name,
          player.countryAcr,
          player.ranking ?? 0,
          0,
        );
      }
    }
  }
  return null;
}

const FALLBACK_POINT_NOTES = [
  'Ace out wide',
  'Forehand winner',
  'Double fault',
  'Backhand long',
  'Drop shot winner',
  'Service winner',
];
const FALLBACK_POINT_SEQUENCE = ['0-15', '15-15', '30-15', '40-15'];

/* Deterministic detail for matches without hand-written extras. */
function buildDerivedExtras(event: RawLiveEvent): RawMatchExtras {
  return {
    momentum: Array.from({ length: 14 }, (_, gameIndex) => 1 + ((event.id * (gameIndex + 3)) % 7)),
    timeline: FALLBACK_POINT_SEQUENCE.map((points, pointIndex) => ({
      games: '4-3',
      points,
      note: FALLBACK_POINT_NOTES[(event.id + pointIndex) % FALLBACK_POINT_NOTES.length] ?? '',
    })),
    stats: {
      aces: [(event.id * 3) % 12, (event.id * 5) % 12],
      doubleFaults: [event.id % 5, (event.id * 2) % 5],
      firstServePct: [55 + ((event.id * 7) % 30), 55 + ((event.id * 11) % 30)],
      breakPointsWon: [event.id % 6, (event.id * 3) % 6],
      winners: [10 + ((event.id * 3) % 25), 10 + ((event.id * 7) % 25)],
      unforcedErrors: [10 + ((event.id * 5) % 20), 10 + ((event.id * 13) % 20)],
    },
  };
}

function extrasFor(event: RawLiveEvent): RawMatchExtras | undefined {
  const explicit = SAMPLE_MATCH_EXTRAS[event.id];
  if (explicit !== undefined) {
    return explicit;
  }
  return event.status === 'notstarted' ? undefined : buildDerivedExtras(event);
}

export const sampleTennisDataPort: TennisDataPort = {
  async fetchLiveMatches(): Promise<TennisMatch[]> {
    return eventsWithStatus(['inprogress', 'suspended']);
  },
  async fetchOrderOfPlay(): Promise<TennisMatch[]> {
    return eventsWithStatus(['inprogress', 'suspended', 'notstarted']);
  },
  async fetchRecentResults(): Promise<TennisMatch[]> {
    return eventsWithStatus(['finished']);
  },
  async fetchRankings(tour: RankingTour): Promise<RankingEntry[]> {
    const rows = tour === 'atp' ? SAMPLE_ATP_RANKINGS : SAMPLE_WTA_RANKINGS;
    return rows.map(mapRankingRow);
  },
  async fetchPlayerProfile(playerId: number): Promise<PlayerProfile | null> {
    const raw =
      SAMPLE_PLAYER_PROFILES.find((profile) => profile.id === playerId) ??
      derivedProfileFor(playerId);
    return raw !== null ? mapPlayerInfo(raw) : null;
  },
  async fetchMatchCentre(fixtureId: number): Promise<MatchCentreData | null> {
    const raw = SAMPLE_EVENTS.find((event) => event.id === fixtureId);
    if (raw === undefined) {
      return null;
    }
    return mapMatchExtras(mapLiveEvent(raw), extrasFor(raw));
  },
};
