import type { MatchPlayer, SetScore, TennisMatch } from '@/types/matches';

export function formatSetLine(sets: SetScore[]): string {
  return sets.map((set) => `${set.p1Games}-${set.p2Games}`).join(' ');
}

/* The order of play always says "v", never "vs" (plan §4.3). */
export function matchupLabel(match: TennisMatch): string {
  return `${match.player1.displayName} v ${match.player2.displayName}`;
}

/* Live-view name with current ranking: "Bellucci (68)". */
export function playerLabelWithRank(player: MatchPlayer): string {
  return player.ranking !== undefined
    ? `${player.displayName} (${player.ranking})`
    : player.displayName;
}

export function resultLine(match: TennisMatch): string {
  if (match.state.status !== 'finished') {
    return matchupLabel(match);
  }
  const { winner, finalSets } = match.state;
  const winnerName = winner === 1 ? match.player1.displayName : match.player2.displayName;
  const loserName = winner === 1 ? match.player2.displayName : match.player1.displayName;
  const orientedSets = finalSets.map((set) =>
    winner === 1 ? set : { p1Games: set.p2Games, p2Games: set.p1Games },
  );
  return `${winnerName} d. ${loserName} ${formatSetLine(orientedSets)}`;
}
