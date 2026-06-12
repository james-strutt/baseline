import { describe, expect, it } from 'vitest';
import {
  mapProviderFixture,
  mapProviderLiveEvent,
  mapProviderPlayerProfile,
  mapProviderRankingRow,
  mapProviderTimeline,
} from '@/services/tennisData/providerMappers';

/*
 * Payloads below were captured from the live provider on 13 June 2026 —
 * these tests pin the real API contract so a provider change breaks here,
 * not on the live hub.
 */
const RETRIEVED_AT = '2026-06-12T19:50:00.000Z';

describe('mapProviderLiveEvent', () => {
  it('parses the real live-event shape: comma sets, hyphen points, paired serve indicator', () => {
    const match = mapProviderLiveEvent(
      {
        id: '2939906',
        name: 'Daniil Medvedev vs Marin Cilic',
        league: 'ATP Hertogenbosch',
        score: '6-2,3-6,0-0',
        status: 'InPlay',
        points: '0-0',
        indicator: '1,0',
      },
      RETRIEVED_AT,
    );
    expect(match.fixtureId).toBe(2939906);
    expect(match.player1.displayName).toBe('Daniil Medvedev');
    expect(match.player2.displayName).toBe('Marin Cilic');
    if (match.state.status !== 'live') {
      throw new Error('expected a live state');
    }
    expect(match.state.score.sets).toEqual([
      { p1Games: 6, p2Games: 2 },
      { p1Games: 3, p2Games: 6 },
      { p1Games: 0, p2Games: 0 },
    ]);
    expect(match.state.score.servingPlayer).toBe(1);
    expect(match.tourLevel).toBe('atp');
  });

  it('classifies W-prefixed ITF events and away-side servers, keeping advantage points intact', () => {
    const match = mapProviderLiveEvent(
      {
        id: '3007180',
        name: 'Martina Capurro Taborda vs Gabriella Price',
        league: 'W35 Cuiaba',
        score: '4-2',
        status: 'InPlay',
        points: '40-A',
        indicator: '0,1',
      },
      RETRIEVED_AT,
    );
    expect(match.tourLevel).toBe('itf');
    if (match.state.status !== 'live') {
      throw new Error('expected a live state');
    }
    expect(match.state.score.servingPlayer).toBe(2);
    expect(match.state.score.gamePoints).toBe('40–A');
  });
});

describe('mapProviderFixture', () => {
  it('maps the joined fixture shape with numeric seeds only and tournament metadata', () => {
    const match = mapProviderFixture({
      id: 1204,
      date: '2026-06-13T16:00:00.000Z',
      seed1: 'WC',
      seed2: '2',
      player1: { id: 7806, name: 'Adrian Mannarino', countryAcr: 'FRA' },
      player2: { id: 39309, name: 'Alex De Minaur', countryAcr: 'AUS' },
      tour: 'atp',
      tournamentName: 'Libema Open - Hertogenbosch',
      tournamentTier: 'ATP 250',
      surface: 'Grass',
    });
    expect(match.scheduledUtc).toBe('2026-06-13T16:00:00.000Z');
    expect(match.player1.seed).toBeUndefined();
    expect(match.player2.seed).toBe(2);
    expect(match.surface).toBe('grass');
    expect(match.state.status).toBe('scheduled');
  });

  it('falls back to the tour for level when the tier does not name one', () => {
    const match = mapProviderFixture({
      id: 9,
      date: '2026-06-13T10:00:00.000Z',
      seed1: null,
      seed2: null,
      player1: { id: 1, name: 'A', countryAcr: 'AUS' },
      player2: { id: 2, name: 'B', countryAcr: 'GBR' },
      tour: 'wta',
      tournamentName: 'Libema Open',
      tournamentTier: null,
      surface: null,
    });
    expect(match.tourLevel).toBe('wta');
    expect(match.surface).toBeUndefined();
  });
});

describe('mapProviderRankingRow and mapProviderPlayerProfile', () => {
  it('maps the nested ranking row', () => {
    const entry = mapProviderRankingRow({
      position: 7,
      rankingPoints: 3760,
      player: { id: 5992, name: 'Novak Djokovic', countryAcr: 'SRB' },
    });
    expect(entry.playerId).toBe(5992);
    expect(entry.points).toBe(3760);
  });

  it('maps the real profile shape, trimming the playing-style list to its first entry', () => {
    const profile = mapProviderPlayerProfile({
      id: 5992,
      name: 'Novak Djokovic',
      countryAcr: 'SRB',
      currentRank: 7,
      points: 11540,
      form: ['w', 'w', 'l', 'w'],
      country: { name: 'Serbia' },
      information: { turnedPro: '2003', plays: 'Right-Handed, Two-Handed Backhand' },
    });
    expect(profile.country).toBe('Serbia');
    expect(profile.plays).toBe('Right-Handed');
    expect(profile.turnedPro).toBe(2003);
    expect(profile.formLastTen).toEqual(['W', 'W', 'L', 'W']);
  });

  it('narrates the game timeline and scores momentum by holds and breaks', () => {
    const match = mapProviderLiveEvent(
      {
        id: '2939906',
        name: 'Daniil Medvedev vs Marin Cilic',
        league: 'ATP Hertogenbosch',
        score: '6-2',
        status: 'InPlay',
        points: '0-0',
        indicator: '1,0',
      },
      RETRIEVED_AT,
    );
    const { timeline, momentum } = mapProviderTimeline(
      [
        { id: '1', text: 'Game 1 - Daniil Medvedev - breaks to 15' },
        { id: '2', text: 'Game 2 - Marin Cilic - holds to 40' },
        { id: '3', text: 'Rain delay' },
      ],
      match,
    );
    expect(timeline[0]?.description).toBe('Daniil Medvedev breaks to 15');
    expect(timeline[0]?.games).toBe('1');
    expect(momentum).toEqual([7, 3, 4]);
    expect(timeline[2]?.description).toBe('Rain delay');
  });

  it('degrades gracefully when optional profile sections are missing', () => {
    const profile = mapProviderPlayerProfile({
      id: 1,
      name: 'Qualifier',
      countryAcr: 'AUS',
      currentRank: null,
      points: null,
      country: null,
      information: null,
    });
    expect(profile.currentRank).toBe(0);
    expect(profile.country).toBe('AUS');
    expect(profile.formLastTen).toEqual([]);
  });
});
