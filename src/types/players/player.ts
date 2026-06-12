export type FormResult = 'W' | 'L';

export interface SurfaceWinRates {
  hard: number;
  clay: number;
  grass: number;
}

export interface PlayerProfile {
  id: number;
  fullName: string;
  country: string;
  plays: string;
  turnedPro: number;
  currentRank: number;
  rankingPoints: number;
  formLastTen: FormResult[];
  surfaceWinRates: SurfaceWinRates;
  careerTitles: number;
  grandSlamTitles: number;
}
