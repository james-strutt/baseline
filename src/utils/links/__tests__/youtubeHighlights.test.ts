import { describe, expect, it } from 'vitest';
import type { TennisMatch } from '@/types/matches';
import { youtubeHighlightsSearchUrl } from '@/utils/links/youtubeHighlights';

const FINISHED_MATCH: TennisMatch = {
  fixtureId: 1,
  tournamentName: 'Boss Open - Stuttgart',
  tourLevel: 'atp',
  scheduledUtc: '2026-06-12T10:00:00.000Z',
  isProvisional: false,
  player1: { id: 1, displayName: 'Jannik Sinner', countryCode: 'ITA' },
  player2: { id: 2, displayName: 'Joao Fonseca', countryCode: 'BRA' },
  state: { status: 'finished', winner: 1, finalSets: [{ p1Games: 7, p2Games: 6 }] },
};

describe('youtubeHighlightsSearchUrl', () => {
  it('builds an encoded search deep link — a link out, never embedded video (plan §3.3)', () => {
    const url = youtubeHighlightsSearchUrl(FINISHED_MATCH);
    expect(url.startsWith('https://www.youtube.com/results?search_query=')).toBe(true);
    expect(url).toContain('Jannik%20Sinner%20vs%20Joao%20Fonseca');
    expect(url).toContain('highlights');
    expect(url).not.toContain(' ');
  });
});
