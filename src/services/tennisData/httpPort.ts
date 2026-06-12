import {
  mapProviderFixture,
  mapProviderH2H,
  mapProviderLiveEvent,
  mapProviderPlayerProfile,
  mapProviderRankingRow,
  mapProviderTimeline,
} from '@/services/tennisData/providerMappers';
import type {
  ProviderH2HResponse,
  ProviderLiveResponse,
  ProviderOrderOfPlayResponse,
  ProviderPlayerResponse,
  ProviderRankingsResponse,
  ProviderTimelineResponse,
} from '@/services/tennisData/providerShapes';
import type { TennisDataPort } from '@/services/tennisData/tennisDataPort';
import type { H2HSummary, MatchCentreData, TennisMatch, TimelinePoint } from '@/types/matches';
import type { PlayerProfile, RankingEntry, RankingTour } from '@/types/players';
import { currentUtcMs, detectUserTimeZone, formatLocalIsoDate } from '@/utils/time';

const TENNIS_FEED_BASE = '/api/tennis';
const DAY_MS = 86_400_000;

async function fetchFeed<T>(query: string): Promise<T> {
  const response = await fetch(`${TENNIS_FEED_BASE}?${query}`);
  if (!response.ok) {
    throw new Error(`Tennis feed "${query}" responded ${response.status}`);
  }
  return (await response.json()) as T;
}

function isSinglesEventName(name: string): boolean {
  return !name.includes('/');
}

async function fetchLiveTennisMatches(): Promise<TennisMatch[]> {
  const payload = await fetchFeed<ProviderLiveResponse>('feed=live');
  return payload.results
    .filter((event) => isSinglesEventName(event.name))
    .map((event) => mapProviderLiveEvent(event, payload.retrievedAt));
}

async function fetchOrderOfPlayFor(dateIso: string): Promise<TennisMatch[]> {
  const payload = await fetchFeed<ProviderOrderOfPlayResponse>(
    `feed=order-of-play&date=${dateIso}`,
  );
  return payload.fixtures.map(mapProviderFixture);
}

interface ResolvedPlayerIds {
  player1Id: number;
  player2Id: number;
}

function fixtureIdsForLiveMatch(
  liveMatch: TennisMatch,
  fixtures: TennisMatch[],
): ResolvedPlayerIds | null {
  for (const fixture of fixtures) {
    const names = [fixture.player1.displayName, fixture.player2.displayName];
    if (names[0] === liveMatch.player1.displayName && names[1] === liveMatch.player2.displayName) {
      return { player1Id: fixture.player1.id, player2Id: fixture.player2.id };
    }
    if (names[0] === liveMatch.player2.displayName && names[1] === liveMatch.player1.displayName) {
      return { player1Id: fixture.player2.id, player2Id: fixture.player1.id };
    }
  }
  return null;
}

/* The live feed has no player ids; the day's fixtures do, under the same
 * full names — late matches sit on yesterday's UTC fixture date. */
async function resolvePlayerIds(match: TennisMatch): Promise<ResolvedPlayerIds | null> {
  if (match.player1.id > 0 && match.player2.id > 0) {
    return { player1Id: match.player1.id, player2Id: match.player2.id };
  }
  const timeZone = detectUserTimeZone();
  for (const offsetDays of [0, 1]) {
    const dateIso = formatLocalIsoDate(currentUtcMs() - offsetDays * DAY_MS, timeZone);
    const resolved = fixtureIdsForLiveMatch(match, await fetchOrderOfPlayFor(dateIso));
    if (resolved !== null) {
      return resolved;
    }
  }
  return null;
}

async function fetchH2HSummary(match: TennisMatch): Promise<H2HSummary | undefined> {
  try {
    const resolved = await resolvePlayerIds(match);
    if (resolved === null) {
      return undefined;
    }
    const tour = match.tourLevel === 'wta' ? 'wta' : 'atp';
    const payload = await fetchFeed<ProviderH2HResponse>(
      `feed=h2h&tour=${tour}&p1=${resolved.player1Id}&p2=${resolved.player2Id}`,
    );
    return mapProviderH2H(payload.matches, resolved.player1Id, resolved.player2Id);
  } catch {
    return undefined;
  }
}

async function fetchLiveTimeline(
  match: TennisMatch,
): Promise<{ timeline: TimelinePoint[]; momentum: number[] }> {
  try {
    const payload = await fetchFeed<ProviderTimelineResponse>(
      `feed=timeline&id=${match.fixtureId}`,
    );
    return mapProviderTimeline(payload.results, match);
  } catch {
    return { timeline: [], momentum: [] };
  }
}

/*
 * Reads our cached API layer (api/tennis.ts) — never the provider directly.
 * Results history stays empty until the ingestion service starts archiving
 * (plan §5); the UI copy covers the gap.
 */
export const httpTennisDataPort: TennisDataPort = {
  fetchLiveMatches: fetchLiveTennisMatches,
  async fetchOrderOfPlay(): Promise<TennisMatch[]> {
    return fetchOrderOfPlayFor(formatLocalIsoDate(currentUtcMs(), detectUserTimeZone()));
  },
  /* Just-finished matches surface transiently in the live feed; durable
   * results history arrives with the ingestion archive (plan §6). */
  async fetchRecentResults(): Promise<TennisMatch[]> {
    const matches = await fetchLiveTennisMatches();
    return matches.filter((match) => match.state.status === 'finished');
  },
  async fetchRankings(tour: RankingTour): Promise<RankingEntry[]> {
    const payload = await fetchFeed<ProviderRankingsResponse>(`feed=rankings&tour=${tour}`);
    return payload.data.map(mapProviderRankingRow);
  },
  async fetchPlayerProfile(playerId: number): Promise<PlayerProfile | null> {
    const payload = await fetchFeed<ProviderPlayerResponse>(`feed=player&id=${playerId}`);
    return payload.data !== null ? mapProviderPlayerProfile(payload.data) : null;
  },
  async fetchMatchCentre(fixtureId: number): Promise<MatchCentreData | null> {
    const liveMatch = (await fetchLiveTennisMatches()).find(
      (match) => match.fixtureId === fixtureId,
    );
    if (liveMatch !== undefined) {
      const [detail, h2h] = await Promise.all([
        fetchLiveTimeline(liveMatch),
        fetchH2HSummary(liveMatch),
      ]);
      return { match: liveMatch, ...detail, stats: [], h2h };
    }
    const fixture = (await this.fetchOrderOfPlay()).find(
      (match) => match.fixtureId === fixtureId,
    );
    if (fixture === undefined) {
      return null;
    }
    return {
      match: fixture,
      momentum: [],
      timeline: [],
      stats: [],
      h2h: await fetchH2HSummary(fixture),
    };
  },
};
