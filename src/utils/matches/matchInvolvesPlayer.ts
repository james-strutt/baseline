import type { TennisMatch } from '@/types/matches';

export function matchInvolvesPlayer(match: TennisMatch, playerIds: number[]): boolean {
  return playerIds.includes(match.player1.id) || playerIds.includes(match.player2.id);
}
