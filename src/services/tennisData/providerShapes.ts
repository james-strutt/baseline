/*
 * Payload shapes returned by our cached API layer (api/tennis.ts), verified
 * against the live provider on 13 June 2026. Like apiShapes.ts, these never
 * leave the mapping layer.
 */
export interface ProviderLiveEvent {
  id: string;
  name: string;
  league: string;
  score: string;
  status: string;
  points: string;
  indicator: string;
}

export interface ProviderLiveResponse {
  retrievedAt: string;
  results: ProviderLiveEvent[];
}

export interface ProviderRankingPlayer {
  id: number;
  name: string;
  countryAcr: string;
}

export interface ProviderRankingRow {
  position: number;
  rankingPoints: number;
  player: ProviderRankingPlayer;
}

export interface ProviderRankingsResponse {
  data: ProviderRankingRow[];
}

export interface ProviderFixturePlayer {
  id: number;
  name: string;
  countryAcr: string;
}

export interface ProviderFixture {
  id: number;
  date: string;
  seed1: string | null;
  seed2: string | null;
  player1: ProviderFixturePlayer;
  player2: ProviderFixturePlayer;
  tour: 'atp' | 'wta';
  tournamentName: string | null;
  tournamentTier: string | null;
  surface: string | null;
}

export interface ProviderOrderOfPlayResponse {
  fixtures: ProviderFixture[];
}

export interface ProviderPlayerInformation {
  turnedPro: string | null;
  plays: string | null;
}

export interface ProviderPlayerProfile {
  id: number;
  name: string;
  countryAcr: string;
  currentRank: number | null;
  points: number | null;
  form?: string[] | null;
  country: { name: string } | null;
  information: ProviderPlayerInformation | null;
}

export interface ProviderPlayerResponse {
  data: ProviderPlayerProfile | null;
}

export interface ProviderH2HMatch {
  date: string;
  match_winner: number;
  result: string;
  tournamentName: string | null;
  player1: ProviderFixturePlayer;
  player2: ProviderFixturePlayer;
}

export interface ProviderH2HResponse {
  matches: ProviderH2HMatch[];
}

export interface ProviderTimelineEntry {
  id: string;
  text: string;
}

export type ProviderStatPair = [string, string];

export interface ProviderLiveStats {
  aces?: ProviderStatPair;
  double_faults?: ProviderStatPair;
  win_1st_serve?: ProviderStatPair;
  break_point_conversions?: ProviderStatPair;
}

export interface ProviderMatchDetailResponse {
  result: {
    stats?: ProviderLiveStats | null;
    timeline?: ProviderTimelineEntry[] | null;
  } | null;
}
