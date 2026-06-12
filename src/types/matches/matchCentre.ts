import type { TennisMatch } from '@/types/matches/match';

export interface TimelinePoint {
  games: string;
  points: string;
  description: string;
}

export interface MatchStatLine {
  label: string;
  p1: string;
  p2: string;
}

interface H2HMeeting {
  year: number;
  eventName: string;
  winnerName: string;
  score: string;
}

export interface H2HSummary {
  p1Wins: number;
  p2Wins: number;
  meetings: H2HMeeting[];
}

export interface MatchCentreData {
  match: TennisMatch;
  momentum: number[];
  timeline: TimelinePoint[];
  stats: MatchStatLine[];
  storyline?: string;
  h2h?: H2HSummary;
}
