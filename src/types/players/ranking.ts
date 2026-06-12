export type RankingTour = 'atp' | 'wta';

export interface RankingEntry {
  position: number;
  playerId: number;
  playerName: string;
  countryCode: string;
  points: number;
  weeklyMovement: number;
}
