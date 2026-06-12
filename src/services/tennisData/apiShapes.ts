/*
 * Raw provider payload shapes (RapidAPI Tennis API field names: countryAcr,
 * timeGame, indicator). These types never leave the mapping layer — the rest
 * of the codebase consumes domain types from @/types (CLAUDE.md: Domain
 * Constants; plan §13: TennisDataPort).
 */
export interface RawEventPlayer {
  id: number;
  name: string;
  countryAcr: string;
  seed?: number;
  ranking?: number;
}

export interface RawSetScore {
  home: number;
  away: number;
}

export type RawEventStatus = 'notstarted' | 'inprogress' | 'suspended' | 'finished';

export interface RawLiveEvent {
  id: number;
  leagueName: string;
  tournamentName: string;
  roundName: string;
  surface: string;
  startUtc: string;
  notBefore: boolean;
  homePlayer: RawEventPlayer;
  awayPlayer: RawEventPlayer;
  status: RawEventStatus;
  setScores: RawSetScore[];
  timeGame?: string;
  indicator?: 1 | 2;
  currentSet?: number;
  elapsedMinutes?: number;
  lastUpdateUtc?: string;
  winner?: 1 | 2;
}

export interface RawRankingRow {
  position: number;
  playerId: number;
  playerName: string;
  countryAcr: string;
  points: number;
  movement: number;
}

export interface RawPlayerInfo {
  id: number;
  name: string;
  country: string;
  plays: string;
  turnedPro: number;
  currentRank: number;
  points: number;
  form: string;
  surfaceWins: {
    hard: number;
    clay: number;
    grass: number;
  };
  titles: number;
  grandSlams: number;
}

export interface RawTimelinePoint {
  games: string;
  points: string;
  note: string;
}

export type RawStatPair = [number, number];

export interface RawMatchStats {
  aces: RawStatPair;
  doubleFaults: RawStatPair;
  firstServePct: RawStatPair;
  breakPointsWon: RawStatPair;
  winners: RawStatPair;
  unforcedErrors: RawStatPair;
}

export interface RawH2HMeeting {
  year: number;
  eventName: string;
  winner: 1 | 2;
  score: string;
}

export interface RawH2H {
  wins: RawStatPair;
  meetings: RawH2HMeeting[];
}

export interface RawMatchExtras {
  momentum: number[];
  timeline: RawTimelinePoint[];
  stats?: RawMatchStats;
  h2h?: RawH2H;
  storyline?: string;
}
