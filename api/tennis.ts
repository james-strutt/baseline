import type { VercelRequest, VercelResponse } from '@vercel/node';

/*
 * The cached API layer (plan §5): the only place the RapidAPI key is used.
 * Clients call this function; Vercel's edge cache serves repeat reads, so
 * upstream cost scales with cache TTLs, not users (§8: poll once, fan out).
 * Page 1 per tour covers the day's singles main draws; full pagination and
 * results history arrive with the ingestion service.
 */
const RAPIDAPI_HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com';
const TOURS = ['atp', 'wta'] as const;

type Tour = (typeof TOURS)[number];

interface UpstreamFixturePlayer {
  id: number;
  name: string;
  countryAcr: string;
}

interface UpstreamFixture {
  id: number;
  date: string;
  tournamentId: number;
  seed1: string | null;
  seed2: string | null;
  player1: UpstreamFixturePlayer;
  player2: UpstreamFixturePlayer;
}

interface UpstreamCalendarEntry {
  id: number;
  name: string;
  tier: string | null;
  court: { name: string } | null;
}

async function callUpstream<T>(path: string): Promise<T> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (apiKey === undefined) {
    throw new Error('RAPIDAPI_KEY is not configured');
  }
  const response = await fetch(`https://${RAPIDAPI_HOST}${path}`, {
    headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': RAPIDAPI_HOST },
  });
  if (!response.ok) {
    throw new Error(`Upstream ${path} responded ${response.status}`);
  }
  return (await response.json()) as T;
}

async function liveFeed(): Promise<unknown> {
  const payload = await callUpstream<{ results: unknown[] }>(
    '/tennis/v2/extend/api/events/live/tennis/',
  );
  return { retrievedAt: new Date().toISOString(), results: payload.results };
}

async function rankingsFeed(tour: Tour): Promise<unknown> {
  return callUpstream(`/tennis/v2/${tour}/ranking/singles/`);
}

async function tourPlayerProfile(tour: Tour, playerId: string): Promise<unknown> {
  try {
    const payload = await callUpstream<{ data: unknown }>(
      `/tennis/v2/${tour}/player/profile/${playerId}?include=form`,
    );
    return payload.data ?? null;
  } catch {
    return null;
  }
}

/* One call returns score, live stats, and the game timeline; the event is
 * keyed by player names and may sit on yesterday's UTC date. */
async function matchDetailFeed(home: string, away: string): Promise<unknown> {
  for (const offsetDays of [0, 1]) {
    const date = new Date(Date.now() - offsetDays * 86_400_000).toISOString().slice(0, 10);
    try {
      const payload = await callUpstream<{ result: unknown }>(
        `/tennis/v2/extend/api/event/live/${encodeURIComponent(home)}/${encodeURIComponent(away)}/${date}`,
      );
      if (payload.result !== null && payload.result !== undefined) {
        return payload;
      }
    } catch {
      // Try the previous UTC date before giving up.
    }
  }
  return { result: null };
}

interface UpstreamH2HMatch {
  date: string;
  match_winner: number;
  result: string;
  tournamentId: number;
  player1: UpstreamFixturePlayer;
  player2: UpstreamFixturePlayer;
}

const H2H_MEETING_LIMIT = 6;

async function h2hFeed(tour: Tour, player1: string, player2: string): Promise<unknown> {
  const payload = await callUpstream<{ data: UpstreamH2HMatch[] }>(
    `/tennis/v2/${tour}/h2h/matches/${player1}/${player2}/`,
  );
  const meetings = payload.data.slice(0, H2H_MEETING_LIMIT);
  const tournaments = await tournamentMapFor(
    tour,
    meetings.map((meeting) => meeting.tournamentId),
  );
  return {
    matches: meetings.map((meeting) => ({
      ...meeting,
      tournamentName: tournaments.get(meeting.tournamentId)?.name ?? null,
    })),
  };
}

async function playerFeed(playerId: string): Promise<unknown> {
  for (const tour of TOURS) {
    const data = await tourPlayerProfile(tour, playerId);
    if (data !== null) {
      return { data };
    }
  }
  return { data: null };
}

/* The season calendar only lists not-yet-started tournaments, so running
 * events resolve through per-tournament info lookups instead. */
async function tournamentInfoFor(
  tour: Tour,
  tournamentId: number,
): Promise<UpstreamCalendarEntry | undefined> {
  try {
    const payload = await callUpstream<{ data: UpstreamCalendarEntry }>(
      `/tennis/v2/${tour}/tournament/info/${tournamentId}`,
    );
    return payload.data;
  } catch {
    return undefined;
  }
}

const TOURNAMENT_LOOKUP_LIMIT = 25;

async function tournamentMapFor(
  tour: Tour,
  tournamentIds: number[],
): Promise<Map<number, UpstreamCalendarEntry>> {
  const distinctIds = [...new Set(tournamentIds)].slice(0, TOURNAMENT_LOOKUP_LIMIT);
  const entries = await Promise.all(distinctIds.map((id) => tournamentInfoFor(tour, id)));
  const tournamentMap = new Map<number, UpstreamCalendarEntry>();
  for (const entry of entries) {
    if (entry !== undefined) {
      tournamentMap.set(entry.id, entry);
    }
  }
  return tournamentMap;
}

function isSinglesFixture(fixture: UpstreamFixture): boolean {
  return !fixture.player1.name.includes('/') && !fixture.player2.name.includes('/');
}

interface JoinedTournamentFields {
  tournamentName: string | null;
  tournamentTier: string | null;
  surface: string | null;
}

function joinedTournamentFields(entry: UpstreamCalendarEntry | undefined): JoinedTournamentFields {
  if (entry === undefined) {
    return { tournamentName: null, tournamentTier: null, surface: null };
  }
  return {
    tournamentName: entry.name,
    tournamentTier: entry.tier,
    surface: entry.court?.name ?? null,
  };
}

async function tourOrderOfPlay(tour: Tour, date: string): Promise<unknown[]> {
  const fixtures = await callUpstream<{ data: UpstreamFixture[] }>(
    `/tennis/v2/${tour}/fixtures/${date}`,
  );
  const singles = fixtures.data.filter(isSinglesFixture);
  const tournaments = await tournamentMapFor(
    tour,
    singles.map((fixture) => fixture.tournamentId),
  );
  return singles.map((fixture) => ({
    ...fixture,
    tour,
    ...joinedTournamentFields(tournaments.get(fixture.tournamentId)),
  }));
}

async function orderOfPlayFeed(date: string): Promise<unknown> {
  const perTour = await Promise.all(TOURS.map((tour) => tourOrderOfPlay(tour, date)));
  return { fixtures: perTour.flat() };
}

/* Short revalidation windows on live feeds: a long stale-while-revalidate
 * leaves a lone viewer perpetually one interval behind. */
const FEED_CACHE_HEADERS: Record<string, string> = {
  live: 's-maxage=12, stale-while-revalidate=8',
  matchdetail: 's-maxage=30, stale-while-revalidate=15',
  rankings: 's-maxage=3600, stale-while-revalidate=3600',
  'order-of-play': 's-maxage=300, stale-while-revalidate=600',
  player: 's-maxage=3600, stale-while-revalidate=3600',
  h2h: 's-maxage=3600, stale-while-revalidate=3600',
};

function feedParam(req: VercelRequest, name: string): string {
  const value = req.query[name];
  return typeof value === 'string' ? value : '';
}

function requireParam(req: VercelRequest, name: string, pattern: RegExp): string {
  const value = feedParam(req, name);
  if (!pattern.test(value)) {
    throw new Error(`"${name}" parameter is missing or malformed`);
  }
  return value;
}

const FEED_HANDLERS: Record<string, (req: VercelRequest) => Promise<unknown>> = {
  live: () => liveFeed(),
  rankings: (req) => rankingsFeed(feedParam(req, 'tour') === 'wta' ? 'wta' : 'atp'),
  'order-of-play': (req) => orderOfPlayFeed(requireParam(req, 'date', /^\d{4}-\d{2}-\d{2}$/)),
  player: (req) => playerFeed(requireParam(req, 'id', /^\d+$/)),
  matchdetail: (req) =>
    matchDetailFeed(requireParam(req, 'home', /^.{2,80}$/), requireParam(req, 'away', /^.{2,80}$/)),
  h2h: (req) =>
    h2hFeed(
      feedParam(req, 'tour') === 'wta' ? 'wta' : 'atp',
      requireParam(req, 'p1', /^\d+$/),
      requireParam(req, 'p2', /^\d+$/),
    ),
};

async function resolveFeed(req: VercelRequest, feed: string): Promise<unknown> {
  const feedHandler = FEED_HANDLERS[feed];
  if (feedHandler === undefined) {
    throw new Error(`Unknown feed "${feed}"`);
  }
  return feedHandler(req);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const feed = feedParam(req, 'feed');
  try {
    const payload = await resolveFeed(req, feed);
    res.setHeader('Cache-Control', FEED_CACHE_HEADERS[feed] ?? 's-maxage=60');
    res.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected failure';
    res.status(502).json({ error: true, message });
  }
}
