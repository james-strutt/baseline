import type { TennisMatch } from '@/types/matches';

/*
 * Deep link to a YouTube search rather than a resolved video: no API key, no
 * embedding (plan §3.3 — no video rights), and official tour uploads rank
 * first. "vs" is YouTube's search convention, not our copy voice.
 */
export function youtubeHighlightsSearchUrl(match: TennisMatch): string {
  const query = `${match.player1.displayName} vs ${match.player2.displayName} ${match.tournamentName} highlights`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
