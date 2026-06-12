export type TourLevel = 'grand-slam' | 'atp' | 'wta' | 'challenger' | 'itf' | 'utr';

export type Surface = 'grass' | 'clay' | 'hard';

export interface MatchPlayer {
  id: number;
  displayName: string;
  countryCode: string;
  seed?: number;
  ranking?: number;
}

export interface SetScore {
  p1Games: number;
  p2Games: number;
}

export interface LiveScore {
  sets: SetScore[];
  gamePoints: string;
  servingPlayer: 1 | 2;
  currentSet: number;
  elapsedMinutes: number;
}

export type MatchState =
  | { status: 'scheduled' }
  | { status: 'live'; score: LiveScore }
  | { status: 'suspended'; score: LiveScore; lastUpdatedUtc: string }
  | { status: 'finished'; finalSets: SetScore[]; winner: 1 | 2 };

/* roundName and surface are absent from the provider's live feed until the
 * ingestion service enriches events — render them only when known. */
export interface TennisMatch {
  fixtureId: number;
  tournamentName: string;
  tourLevel: TourLevel;
  roundName?: string;
  surface?: Surface;
  scheduledUtc: string;
  isProvisional: boolean;
  player1: MatchPlayer;
  player2: MatchPlayer;
  state: MatchState;
}
