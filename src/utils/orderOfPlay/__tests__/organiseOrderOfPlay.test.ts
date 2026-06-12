import { describe, expect, it } from 'vitest';
import type { TennisMatch } from '@/types/matches';
import { organiseOrderOfPlay } from '@/utils/orderOfPlay/organiseOrderOfPlay';

/*
 * The order of play reorganising around the user's clock — not the venue's —
 * is the product's signature screen (plan W6). The same UTC fixtures must
 * segment differently for Sydney and London users.
 */
function scheduledMatch(fixtureId: number, scheduledUtc: string): TennisMatch {
  return {
    fixtureId,
    tournamentName: 'ATP Halle',
    tourLevel: 'atp',
    roundName: 'Quarter-final',
    surface: 'grass',
    scheduledUtc,
    isProvisional: false,
    player1: { id: 1, displayName: 'Home', countryCode: 'AUS' },
    player2: { id: 2, displayName: 'Away', countryCode: 'GBR' },
    state: { status: 'scheduled' },
  };
}

const FIXTURES = [
  scheduledMatch(3, '2026-06-14T20:00:00.000Z'),
  scheduledMatch(1, '2026-06-14T09:00:00.000Z'),
  scheduledMatch(2, '2026-06-14T15:00:00.000Z'),
];

describe('organiseOrderOfPlay', () => {
  it('sorts chronologically and segments by the Sydney user clock (winter, UTC+10)', () => {
    const segments = organiseOrderOfPlay(FIXTURES, 'Australia/Sydney');
    expect(segments.map((segment) => segment.label)).toEqual([
      'Your evening',
      'Overnight',
      'Your morning',
    ]);
    expect(segments.map((segment) => segment.matches[0]?.fixtureId)).toEqual([1, 2, 3]);
  });

  it('segments the same UTC fixtures differently for a London user — the venue clock never leaks', () => {
    const segments = organiseOrderOfPlay(FIXTURES, 'Europe/London');
    expect(segments.map((segment) => segment.label)).toEqual([
      'Your morning',
      'Your afternoon',
      'Your evening',
    ]);
  });

  it('groups consecutive same-period matches into one segment', () => {
    const segments = organiseOrderOfPlay(
      [
        scheduledMatch(1, '2026-06-14T09:00:00.000Z'),
        scheduledMatch(2, '2026-06-14T10:30:00.000Z'),
      ],
      'Australia/Sydney',
    );
    expect(segments).toHaveLength(1);
    expect(segments[0]?.matches).toHaveLength(2);
  });

  it('returns no segments for an empty day rather than inventing one', () => {
    expect(organiseOrderOfPlay([], 'Australia/Sydney')).toEqual([]);
  });
});
