import {
  mapProviderFixture,
  mapProviderLiveEvent,
  mapProviderPlayerProfile,
  mapProviderRankingRow,
} from '@/services/tennisData/providerMappers';
import type {
  ProviderLiveResponse,
  ProviderOrderOfPlayResponse,
  ProviderPlayerResponse,
  ProviderRankingsResponse,
} from '@/services/tennisData/providerShapes';
import type { TennisDataPort } from '@/services/tennisData/tennisDataPort';
import type { MatchCentreData, TennisMatch } from '@/types/matches';
import type { PlayerProfile, RankingEntry, RankingTour } from '@/types/players';
import { currentUtcMs, detectUserTimeZone, formatLocalIsoDate } from '@/utils/time';

const TENNIS_FEED_BASE = '/api/tennis';

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

/*
 * Reads our cached API layer (api/tennis.ts) — never the provider directly.
 * Results history and match-centre detail stay empty until the ingestion
 * service starts archiving (plan §5); the UI copy covers the gap.
 */
export const httpTennisDataPort: TennisDataPort = {
  fetchLiveMatches: fetchLiveTennisMatches,
  async fetchOrderOfPlay(): Promise<TennisMatch[]> {
    const localDate = formatLocalIsoDate(currentUtcMs(), detectUserTimeZone());
    const payload = await fetchFeed<ProviderOrderOfPlayResponse>(
      `feed=order-of-play&date=${localDate}`,
    );
    return payload.fixtures.map(mapProviderFixture);
  },
  async fetchRecentResults(): Promise<TennisMatch[]> {
    return [];
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
    const liveMatches = await fetchLiveTennisMatches();
    const liveMatch = liveMatches.find((match) => match.fixtureId === fixtureId);
    const match =
      liveMatch ??
      (await this.fetchOrderOfPlay()).find((fixture) => fixture.fixtureId === fixtureId);
    if (match === undefined) {
      return null;
    }
    return { match, momentum: [], timeline: [], stats: [] };
  },
};
