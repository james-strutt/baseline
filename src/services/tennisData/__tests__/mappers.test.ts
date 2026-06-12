import { describe, expect, it } from 'vitest';
import type { RawLiveEvent } from '@/services/tennisData/apiShapes';
import {
  mapLiveEvent,
  mapMatchExtras,
  mapPlayerInfo,
  mapRankingRow,
} from '@/services/tennisData/mappers';

/*
 * The mapping layer is the only place raw provider field names (countryAcr,
 * timeGame, indicator) may exist — components consume domain types only
 * (CLAUDE.md: Domain Constants). These tests pin the seam so a provider
 * change is a one-file fix, not a hunt through the UI.
 */
function rawEvent(overrides: Partial<RawLiveEvent>): RawLiveEvent {
  return {
    id: 1,
    leagueName: 'ATP Halle',
    tournamentName: 'Halle Open',
    roundName: 'Quarter-final',
    surface: 'Grass',
    startUtc: '2026-06-13T11:00:00.000Z',
    notBefore: false,
    homePlayer: { id: 10, name: 'Home', countryAcr: 'AUS' },
    awayPlayer: { id: 11, name: 'Away', countryAcr: 'GBR', ranking: 23 },
    status: 'notstarted',
    setScores: [],
    ...overrides,
  };
}

describe('mapLiveEvent translates provider fields into domain language', () => {
  it('maps countryAcr, timeGame, and indicator into domain names with typographic game points', () => {
    const match = mapLiveEvent(
      rawEvent({
        status: 'inprogress',
        setScores: [{ home: 7, away: 5 }],
        timeGame: '15-40',
        indicator: 2,
        currentSet: 1,
        elapsedMinutes: 41,
      }),
    );
    expect(match.player1.countryCode).toBe('AUS');
    expect(match.player2.ranking).toBe(23);
    if (match.state.status !== 'live') {
      throw new Error('expected a live state');
    }
    expect(match.state.score.gamePoints).toBe('15–40');
    expect(match.state.score.servingPlayer).toBe(2);
    expect(match.state.score.sets).toEqual([{ p1Games: 7, p2Games: 5 }]);
  });

  it('derives tour level from league names so cross-tour following works (the differentiator)', () => {
    const levels = [
      ['Wimbledon', 'grand-slam'],
      ['ATP Halle', 'atp'],
      ['WTA Queens', 'wta'],
      ['Challenger Ilkley', 'challenger'],
      ['ITF W35 Madrid', 'itf'],
      ['UTR Pro Sydney', 'utr'],
    ] as const;
    for (const [leagueName, expected] of levels) {
      expect(mapLiveEvent(rawEvent({ leagueName })).tourLevel).toBe(expected);
    }
  });

  it('produces a discriminated state for every provider status, never optional flags', () => {
    expect(mapLiveEvent(rawEvent({ status: 'notstarted' })).state.status).toBe('scheduled');
    expect(
      mapLiveEvent(rawEvent({ status: 'inprogress', setScores: [{ home: 1, away: 0 }] })).state
        .status,
    ).toBe('live');
    expect(
      mapLiveEvent(rawEvent({ status: 'suspended', setScores: [{ home: 1, away: 0 }] })).state
        .status,
    ).toBe('suspended');
    expect(
      mapLiveEvent(rawEvent({ status: 'finished', setScores: [{ home: 6, away: 4 }], winner: 1 }))
        .state.status,
    ).toBe('finished');
  });

  it('defaults missing live fields rather than crashing mid-rally', () => {
    const match = mapLiveEvent(
      rawEvent({ status: 'inprogress', setScores: [{ home: 2, away: 2 }] }),
    );
    if (match.state.status !== 'live') {
      throw new Error('expected a live state');
    }
    expect(match.state.score.gamePoints).toBe('0–0');
    expect(match.state.score.currentSet).toBe(1);
  });

  it('carries the not-before flag so provisional times are never presented as precise', () => {
    expect(mapLiveEvent(rawEvent({ notBefore: true })).isProvisional).toBe(true);
  });

  it('normalises surfaces, defaulting unknown strings to hard', () => {
    expect(mapLiveEvent(rawEvent({ surface: 'Red Clay' })).surface).toBe('clay');
    expect(mapLiveEvent(rawEvent({ surface: 'Carpet' })).surface).toBe('hard');
  });
});

describe('mapRankingRow and mapPlayerInfo', () => {
  it('maps ranking rows including weekly movement for the honours board arrows', () => {
    const entry = mapRankingRow({
      position: 4,
      playerId: 4,
      playerName: 'Felix Auger-Aliassime',
      countryAcr: 'CAN',
      points: 4440,
      movement: 2,
    });
    expect(entry.weeklyMovement).toBe(2);
    expect(entry.countryCode).toBe('CAN');
  });

  it('parses the form string defensively — junk characters must not reach the form strip', () => {
    const profile = mapPlayerInfo({
      id: 7,
      name: 'Novak Djokovic',
      country: 'Serbia',
      plays: 'Right-handed',
      turnedPro: 2003,
      currentRank: 7,
      points: 3760,
      form: 'WW-L?WX',
      surfaceWins: { hard: 84, clay: 80, grass: 86 },
      titles: 100,
      grandSlams: 24,
    });
    expect(profile.formLastTen).toEqual(['W', 'W', 'L', 'W']);
  });
});

describe('mapMatchExtras', () => {
  it('returns an empty match centre rather than failing when the provider has no detail yet', () => {
    const centre = mapMatchExtras(mapLiveEvent(rawEvent({})), undefined);
    expect(centre.momentum).toEqual([]);
    expect(centre.timeline).toEqual([]);
    expect(centre.storyline).toBeUndefined();
  });

  it('normalises timeline point scores to typographic dashes', () => {
    const centre = mapMatchExtras(mapLiveEvent(rawEvent({})), {
      momentum: [1, 2],
      timeline: [{ games: '5-6', points: '15-30', note: 'Forehand winner' }],
      storyline: 'A storyline.',
    });
    expect(centre.timeline[0]?.points).toBe('15–30');
    expect(centre.storyline).toBe('A storyline.');
  });
});
