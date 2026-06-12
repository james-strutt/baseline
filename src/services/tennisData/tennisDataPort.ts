import type { MatchCentreData, TennisMatch } from '@/types/matches';
import type { PlayerProfile, RankingEntry, RankingTour } from '@/types/players';

/*
 * The provider seam (plan §13): everything downstream consumes this port, so
 * swapping RapidAPI for a second source — or the ingestion-backed cached API
 * layer — is a swap, not a rewrite. Clients never call RapidAPI directly.
 */
export interface TennisDataPort {
  fetchLiveMatches(): Promise<TennisMatch[]>;
  fetchOrderOfPlay(): Promise<TennisMatch[]>;
  fetchRecentResults(): Promise<TennisMatch[]>;
  fetchRankings(tour: RankingTour): Promise<RankingEntry[]>;
  fetchPlayerProfile(playerId: number): Promise<PlayerProfile | null>;
  fetchMatchCentre(fixtureId: number): Promise<MatchCentreData | null>;
}
