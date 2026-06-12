import { describe, expect, it } from 'vitest';
import type { TennisMatch } from '@/types/matches';
import { formatSetLine, matchupLabel, resultLine } from '@/utils/score/formatScoreline';

function finishedMatch(winner: 1 | 2): TennisMatch {
  return {
    fixtureId: 1,
    tournamentName: 'ATP Halle',
    tourLevel: 'atp',
    roundName: 'Quarter-final',
    surface: 'grass',
    scheduledUtc: '2026-06-13T09:00:00.000Z',
    isProvisional: false,
    player1: { id: 1, displayName: 'Sinner', countryCode: 'ITA' },
    player2: { id: 2, displayName: 'Fonseca', countryCode: 'BRA' },
    state: {
      status: 'finished',
      winner,
      finalSets: [
        { p1Games: 7, p2Games: 6 },
        { p1Games: 5, p2Games: 7 },
        { p1Games: 6, p2Games: 4 },
      ],
    },
  };
}

describe('the copy voice of scorelines', () => {
  it('always says "v", never "vs" — the order of play convention (plan §4.3)', () => {
    expect(matchupLabel(finishedMatch(1))).toBe('Sinner v Fonseca');
  });

  it('orients the result line to the winner, the way results are read aloud', () => {
    expect(resultLine(finishedMatch(1))).toBe('Sinner d. Fonseca 7-6 5-7 6-4');
    expect(resultLine(finishedMatch(2))).toBe('Fonseca d. Sinner 6-7 7-5 4-6');
  });

  it('falls back to the matchup for unfinished matches — never fabricate a result', () => {
    const live: TennisMatch = {
      ...finishedMatch(1),
      state: {
        status: 'live',
        score: {
          sets: [{ p1Games: 1, p2Games: 0 }],
          gamePoints: '15–0',
          servingPlayer: 1,
          currentSet: 1,
          elapsedMinutes: 10,
        },
      },
    };
    expect(resultLine(live)).toBe('Sinner v Fonseca');
  });

  it('joins set scores with spaces for the plaque footers', () => {
    expect(formatSetLine([{ p1Games: 7, p2Games: 6 }, { p1Games: 7, p2Games: 5 }])).toBe(
      '7-6 7-5',
    );
  });
});
