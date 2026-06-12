import type {
  RawEventPlayer,
  RawH2H,
  RawLiveEvent,
  RawMatchExtras,
  RawMatchStats,
  RawPlayerInfo,
  RawRankingRow,
  RawStatPair,
} from '@/services/tennisData/apiShapes';
import type {
  H2HSummary,
  LiveScore,
  MatchCentreData,
  MatchPlayer,
  MatchState,
  MatchStatLine,
  SetScore,
  Surface,
  TennisMatch,
  TourLevel,
} from '@/types/matches';
import type { FormResult, PlayerProfile, RankingEntry } from '@/types/players';

const GRAND_SLAM_NAMES = ['Australian Open', 'Roland Garros', 'Wimbledon', 'US Open'];

function mapTourLevel(leagueName: string): TourLevel {
  if (GRAND_SLAM_NAMES.some((slam) => leagueName.includes(slam))) {
    return 'grand-slam';
  }
  if (leagueName.includes('Challenger')) {
    return 'challenger';
  }
  if (leagueName.includes('ITF')) {
    return 'itf';
  }
  if (leagueName.includes('UTR')) {
    return 'utr';
  }
  return leagueName.includes('WTA') ? 'wta' : 'atp';
}

function mapSurface(rawSurface: string): Surface {
  const lowered = rawSurface.toLowerCase();
  if (lowered.includes('grass')) {
    return 'grass';
  }
  return lowered.includes('clay') ? 'clay' : 'hard';
}

function mapEventPlayer(raw: RawEventPlayer): MatchPlayer {
  return {
    id: raw.id,
    displayName: raw.name,
    countryCode: raw.countryAcr,
    seed: raw.seed,
    ranking: raw.ranking,
  };
}

function mapSetScores(raw: RawLiveEvent): SetScore[] {
  return raw.setScores.map((set) => ({ p1Games: set.home, p2Games: set.away }));
}

function mapLiveScore(raw: RawLiveEvent): LiveScore {
  return {
    sets: mapSetScores(raw),
    gamePoints: (raw.timeGame ?? '0-0').replace('-', '–'),
    servingPlayer: raw.indicator ?? 1,
    currentSet: raw.currentSet ?? raw.setScores.length,
    elapsedMinutes: raw.elapsedMinutes ?? 0,
  };
}

function mapMatchState(raw: RawLiveEvent): MatchState {
  switch (raw.status) {
    case 'notstarted':
      return { status: 'scheduled' };
    case 'inprogress':
      return { status: 'live', score: mapLiveScore(raw) };
    case 'suspended':
      return {
        status: 'suspended',
        score: mapLiveScore(raw),
        lastUpdatedUtc: raw.lastUpdateUtc ?? raw.startUtc,
      };
    case 'finished':
      return { status: 'finished', finalSets: mapSetScores(raw), winner: raw.winner ?? 1 };
  }
}

export function mapLiveEvent(raw: RawLiveEvent): TennisMatch {
  return {
    fixtureId: raw.id,
    tournamentName: raw.leagueName,
    tourLevel: mapTourLevel(raw.leagueName),
    roundName: raw.roundName,
    surface: mapSurface(raw.surface),
    scheduledUtc: raw.startUtc,
    isProvisional: raw.notBefore,
    player1: mapEventPlayer(raw.homePlayer),
    player2: mapEventPlayer(raw.awayPlayer),
    state: mapMatchState(raw),
  };
}

export function mapRankingRow(raw: RawRankingRow): RankingEntry {
  return {
    position: raw.position,
    playerId: raw.playerId,
    playerName: raw.playerName,
    countryCode: raw.countryAcr,
    points: raw.points,
    weeklyMovement: raw.movement,
  };
}

function mapFormString(form: string): FormResult[] {
  return [...form].filter((entry): entry is FormResult => entry === 'W' || entry === 'L');
}

export function mapPlayerInfo(raw: RawPlayerInfo): PlayerProfile {
  return {
    id: raw.id,
    fullName: raw.name,
    country: raw.country,
    plays: raw.plays,
    turnedPro: raw.turnedPro,
    currentRank: raw.currentRank,
    rankingPoints: raw.points,
    formLastTen: mapFormString(raw.form),
    surfaceWinRates: raw.surfaceWins,
    careerTitles: raw.titles,
    grandSlamTitles: raw.grandSlams,
  };
}

function statLine(label: string, pair: RawStatPair, suffix = ''): MatchStatLine {
  return { label, p1: `${pair[0]}${suffix}`, p2: `${pair[1]}${suffix}` };
}

function mapMatchStats(raw: RawMatchStats | undefined): MatchStatLine[] {
  if (raw === undefined) {
    return [];
  }
  return [
    statLine('Aces', raw.aces),
    statLine('Double faults', raw.doubleFaults),
    statLine('First serve', raw.firstServePct, '%'),
    statLine('Break points won', raw.breakPointsWon),
    statLine('Winners', raw.winners),
    statLine('Unforced errors', raw.unforcedErrors),
  ];
}

function mapH2H(raw: RawH2H | undefined, match: TennisMatch): H2HSummary | undefined {
  if (raw === undefined) {
    return undefined;
  }
  return {
    p1Wins: raw.wins[0],
    p2Wins: raw.wins[1],
    meetings: raw.meetings.map((meeting) => ({
      year: meeting.year,
      eventName: meeting.eventName,
      winnerName:
        meeting.winner === 1 ? match.player1.displayName : match.player2.displayName,
      score: meeting.score,
    })),
  };
}

export function mapMatchExtras(
  match: TennisMatch,
  extras: RawMatchExtras | undefined,
): MatchCentreData {
  return {
    match,
    momentum: extras?.momentum ?? [],
    timeline:
      extras?.timeline.map((point) => ({
        games: point.games,
        points: point.points.replace('-', '–'),
        description: point.note,
      })) ?? [],
    stats: mapMatchStats(extras?.stats),
    h2h: mapH2H(extras?.h2h, match),
    storyline: extras?.storyline,
  };
}
