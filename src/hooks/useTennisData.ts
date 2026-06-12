import { useQuery } from '@tanstack/react-query';
import { tennisData } from '@/services/tennisData';
import type { MatchCentreData, TennisMatch } from '@/types/matches';
import type { PlayerProfile, RankingEntry, RankingTour } from '@/types/players';

/* Clients poll only our cached API layer — the edge cache means one
 * upstream call serves every user (plan §5/§8). */
const LIVE_REFETCH_MS = 15_000;
const ORDER_OF_PLAY_REFETCH_MS = 300_000;
const RANKINGS_STALE_MS = 3_600_000;

export interface UseLiveMatchesReturn {
  matches: TennisMatch[];
  isLoading: boolean;
  isError: boolean;
  lastUpdatedMs: number;
}

export function useLiveMatches(): UseLiveMatchesReturn {
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['matches', 'live'],
    queryFn: (): Promise<TennisMatch[]> => tennisData.fetchLiveMatches(),
    refetchInterval: LIVE_REFETCH_MS,
  });
  return { matches: data ?? [], isLoading, isError, lastUpdatedMs: dataUpdatedAt };
}

export interface UseOrderOfPlayReturn {
  matches: TennisMatch[];
  isLoading: boolean;
  isError: boolean;
}

export function useOrderOfPlay(): UseOrderOfPlayReturn {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['matches', 'order-of-play'],
    queryFn: (): Promise<TennisMatch[]> => tennisData.fetchOrderOfPlay(),
    refetchInterval: ORDER_OF_PLAY_REFETCH_MS,
  });
  return { matches: data ?? [], isLoading, isError };
}

export interface UseRecentResultsReturn {
  results: TennisMatch[];
  isLoading: boolean;
}

export function useRecentResults(): UseRecentResultsReturn {
  const { data, isLoading } = useQuery({
    queryKey: ['matches', 'recent-results'],
    queryFn: (): Promise<TennisMatch[]> => tennisData.fetchRecentResults(),
  });
  return { results: data ?? [], isLoading };
}

export interface UseRankingsReturn {
  rankings: RankingEntry[];
  isLoading: boolean;
  isError: boolean;
}

export function useRankings(tour: RankingTour): UseRankingsReturn {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['rankings', tour],
    queryFn: (): Promise<RankingEntry[]> => tennisData.fetchRankings(tour),
    staleTime: RANKINGS_STALE_MS,
  });
  return { rankings: data ?? [], isLoading, isError };
}

export interface UsePlayerProfileReturn {
  profile: PlayerProfile | null;
  isLoading: boolean;
}

export function usePlayerProfile(playerId: number): UsePlayerProfileReturn {
  const { data, isLoading } = useQuery({
    queryKey: ['players', playerId],
    queryFn: (): Promise<PlayerProfile | null> => tennisData.fetchPlayerProfile(playerId),
  });
  return { profile: data ?? null, isLoading };
}

export interface UseMatchCentreReturn {
  matchCentre: MatchCentreData | null;
  isLoading: boolean;
}

export function useMatchCentre(fixtureId: number): UseMatchCentreReturn {
  const { data, isLoading } = useQuery({
    queryKey: ['matches', 'centre', fixtureId],
    queryFn: (): Promise<MatchCentreData | null> => tennisData.fetchMatchCentre(fixtureId),
  });
  return { matchCentre: data ?? null, isLoading };
}
