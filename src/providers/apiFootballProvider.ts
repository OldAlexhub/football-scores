import { API_FOOTBALL_KEY } from '../config/providerKeys';
import type {
  Competition,
  LineupPlayer,
  Match,
  MatchAnalysis,
  MatchEvent,
  MatchEventType,
  MatchLineup,
  MatchPrediction,
  MatchStatistic,
  PlayerMatchPerformance,
  MatchStatus,
  StandingRow,
  Team,
} from '../types/domain';
import { API_FOOTBALL_CAPABILITIES } from './capabilities';
import { fetchJson } from './httpClient';
import type { FootballDataProvider, FormResult, HeadToHeadResult, MatchesQuery } from './types';

const BASE_URL = 'https://v3.football.api-sports.io';
const POPULAR_LEAGUE_IDS = [2, 39, 140, 78, 135, 61, 3, 848, 253, 71, 128, 262, 307, 1, 4];

function statusFromApi(short: string): MatchStatus {
  switch (short) {
    case 'NS':
    case 'TBD':
      return 'scheduled';
    case '1H':
    case '2H':
    case 'ET':
    case 'BT':
    case 'P':
    case 'LIVE':
      return 'live';
    case 'HT':
      return 'half_time';
    case 'FT':
    case 'AET':
    case 'PEN':
    case 'AWD':
    case 'WO':
      return 'finished';
    case 'PST':
      return 'postponed';
    case 'CANC':
      return 'cancelled';
    case 'SUSP':
    case 'INT':
      return 'suspended';
    case 'ABD':
      return 'abandoned';
    default:
      return 'scheduled';
  }
}

function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

function mapMatch(raw: any): Match {
  const homeName = raw.teams?.home?.name ?? 'Unknown';
  const awayName = raw.teams?.away?.name ?? 'Unknown';
  const status = statusFromApi(raw.fixture?.status?.short);
  const statusShort = raw.fixture?.status?.short;
  const isKnockout = !!raw.league?.round && /final|semi|quarter|knockout|leg/i.test(raw.league.round);

  return {
    id: `api-football:${raw.fixture?.id}`,
    providerId: 'api-football',
    providerMatchId: String(raw.fixture?.id),
    competitionId: `api-football:${raw.league?.id}`,
    competitionName: raw.league?.name ?? 'Unknown competition',
    competitionEmblemUrl: raw.league?.logo ?? null,
    country: raw.league?.country ?? null,
    season: raw.league?.season ? String(raw.league.season) : null,
    stage: raw.league?.round ?? null,
    round: raw.league?.round ?? null,
    matchweek: null,
    homeTeamId: `api-football:${raw.teams?.home?.id}`,
    homeTeamName: homeName,
    homeTeamInitials: initialsFromName(homeName),
    homeTeamCrestUrl: raw.teams?.home?.logo ?? null,
    awayTeamId: `api-football:${raw.teams?.away?.id}`,
    awayTeamName: awayName,
    awayTeamInitials: initialsFromName(awayName),
    awayTeamCrestUrl: raw.teams?.away?.logo ?? null,
    kickoffUtc: raw.fixture?.date ?? null,
    kickoffUnknown: !raw.fixture?.date || statusShort === 'TBD',
    status,
    statusDetail: raw.fixture?.status?.long ?? null,
    elapsedMinutes: numberValue(raw.fixture?.status?.elapsed),
    injuryTimeMinutes: numberValue(raw.fixture?.status?.extra),
    halfTimeScore: raw.score?.halftime && (raw.score.halftime.home != null || raw.score.halftime.away != null)
      ? { home: raw.score.halftime.home ?? null, away: raw.score.halftime.away ?? null }
      : null,
    fullTimeScore: raw.score?.fulltime && (raw.score.fulltime.home != null || raw.score.fulltime.away != null)
      ? { home: raw.score.fulltime.home ?? null, away: raw.score.fulltime.away ?? null }
      : null,
    extraTimeScore: raw.score?.extratime && (raw.score.extratime.home != null || raw.score.extratime.away != null)
      ? { home: raw.score.extratime.home ?? null, away: raw.score.extratime.away ?? null }
      : null,
    penaltyScore: raw.score?.penalty && (raw.score.penalty.home != null || raw.score.penalty.away != null)
      ? { home: raw.score.penalty.home ?? null, away: raw.score.penalty.away ?? null }
      : null,
    currentScore: raw.goals && (raw.goals.home != null || raw.goals.away != null)
      ? { home: raw.goals.home ?? null, away: raw.goals.away ?? null }
      : null,
    winner: raw.teams?.home?.winner === true
      ? 'home'
      : raw.teams?.away?.winner === true
        ? 'away'
        : raw.teams?.home?.winner === false && raw.teams?.away?.winner === false
          ? 'draw'
          : null,
    venue: raw.fixture?.venue?.name ?? null,
    referee: raw.fixture?.referee ?? null,
    attendance: numberValue(raw.fixture?.attendance),
    lastProviderUpdateUtc: new Date().toISOString(),
    isKnockout,
    extraTimePossible: isKnockout,
    attribution: 'API-Football',
  };
}

function numberValue(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace('%', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function percentValue(value: unknown): number {
  return Math.max(0, Math.min(100, numberValue(value) ?? 0));
}

function mapPrediction(raw: any, providerMatchId: string): MatchPrediction | null {
  const prediction = raw?.predictions;
  if (!prediction) return null;
  const homeWinPercent = percentValue(prediction.percent?.home);
  const drawPercent = percentValue(prediction.percent?.draw);
  const awayWinPercent = percentValue(prediction.percent?.away);
  const homeExpected = numberValue(prediction.goals?.home);
  const awayExpected = numberValue(prediction.goals?.away);
  const predictedHomeGoals = Math.max(0, Math.min(9, Math.round(homeExpected ?? (homeWinPercent > awayWinPercent ? 2 : 1))));
  const predictedAwayGoals = Math.max(0, Math.min(9, Math.round(awayExpected ?? (awayWinPercent > homeWinPercent ? 2 : 1))));
  return {
    matchId: `api-football:${providerMatchId}`,
    predictedHomeGoals,
    predictedAwayGoals,
    homeWinPercent,
    drawPercent,
    awayWinPercent,
    confidencePercent: Math.max(homeWinPercent, drawPercent, awayWinPercent),
    advice: prediction.advice ?? prediction.winner?.comment ?? null,
    goalRange: prediction.under_over ?? null,
    source: 'provider_model',
    sampleSize: 0,
    generatedAtUtc: new Date().toISOString(),
  };
}

function eventType(value: unknown): MatchEventType {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'goal') return 'goal';
  if (normalized === 'card') return 'card';
  if (normalized === 'subst') return 'substitution';
  if (normalized === 'var') return 'var';
  return 'other';
}

function mapEvents(rawEvents: any[], providerMatchId: string): MatchEvent[] {
  return rawEvents.map((event, index) => ({
    id: `api-football:${providerMatchId}:event:${index}`,
    minute: numberValue(event.time?.elapsed) ?? 0,
    extraMinute: numberValue(event.time?.extra),
    teamId: `api-football:${event.team?.id}`,
    teamName: event.team?.name ?? 'Unknown',
    playerName: event.player?.name ?? null,
    assistName: event.assist?.name ?? null,
    type: eventType(event.type),
    detail: event.detail ?? event.comments ?? event.type ?? '',
  }));
}

function mapLineupPlayer(raw: any): LineupPlayer {
  const player = raw?.player ?? raw;
  return {
    id: `api-football:${player?.id}`,
    name: player?.name ?? 'Unknown',
    number: numberValue(player?.number),
    position: player?.pos ?? null,
    grid: player?.grid ?? null,
  };
}

function mapLineups(rawLineups: any[]): MatchLineup[] {
  return rawLineups.map(lineup => ({
    teamId: `api-football:${lineup.team?.id}`,
    teamName: lineup.team?.name ?? 'Unknown',
    teamCrestUrl: lineup.team?.logo ?? null,
    formation: lineup.formation ?? null,
    coachName: lineup.coach?.name ?? null,
    starters: (lineup.startXI ?? []).map(mapLineupPlayer),
    substitutes: (lineup.substitutes ?? []).map(mapLineupPlayer),
  }));
}

const STATISTIC_ORDER = [
  'Ball Possession',
  'Total Shots',
  'Shots on Goal',
  'Shots off Goal',
  'Blocked Shots',
  'Corner Kicks',
  'Offsides',
  'Fouls',
  'Yellow Cards',
  'Red Cards',
  'Goalkeeper Saves',
  'Total passes',
  'Passes accurate',
  'Passes %',
];

function mapStatistics(rawStatistics: any[]): MatchStatistic[] {
  const home = rawStatistics[0]?.statistics ?? [];
  const away = rawStatistics[1]?.statistics ?? [];
  const valueFor = (list: any[], key: string) => list.find(item => item.type === key)?.value ?? null;
  return STATISTIC_ORDER.map((label, index) => ({
    key: `${index}:${label}`,
    label,
    homeValue: valueFor(home, label),
    awayValue: valueFor(away, label),
  })).filter(stat => stat.homeValue != null || stat.awayValue != null);
}

function mapPerformers(rawTeams: any[]): PlayerMatchPerformance[] {
  const performers: PlayerMatchPerformance[] = [];
  for (const teamBlock of rawTeams) {
    for (const item of teamBlock.players ?? []) {
      const stats = item.statistics?.[0] ?? {};
      performers.push({
        playerId: `api-football:${item.player?.id}`,
        playerName: item.player?.name ?? 'Unknown',
        playerPhotoUrl: item.player?.photo ?? null,
        teamId: `api-football:${teamBlock.team?.id}`,
        teamName: teamBlock.team?.name ?? 'Unknown',
        rating: numberValue(stats.games?.rating),
        minutes: numberValue(stats.games?.minutes),
        goals: numberValue(stats.goals?.total) ?? 0,
        assists: numberValue(stats.goals?.assists) ?? 0,
        shotsOnTarget: numberValue(stats.shots?.on) ?? 0,
        keyPasses: numberValue(stats.passes?.key) ?? 0,
        tackles: numberValue(stats.tackles?.total) ?? 0,
      });
    }
  }
  return performers
    .filter(player => player.rating != null || player.goals > 0 || player.assists > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6);
}

function statisticNumber(statistics: MatchStatistic[], label: string, side: 'home' | 'away'): number | null {
  const stat = statistics.find(item => item.label === label);
  return numberValue(side === 'home' ? stat?.homeValue : stat?.awayValue);
}

function buildSummary(match: Match, statistics: MatchStatistic[]): string[] {
  const summary: string[] = [];
  const score = match.fullTimeScore ?? match.currentScore;
  if (score?.home != null && score.away != null) {
    if (score.home === score.away) summary.push(`${match.homeTeamName} and ${match.awayTeamName} finished level at ${score.home}-${score.away}.`);
    else {
      const winner = score.home > score.away ? match.homeTeamName : match.awayTeamName;
      summary.push(`${winner} won ${score.home}-${score.away}.`);
    }
  }
  const homePossession = statisticNumber(statistics, 'Ball Possession', 'home');
  const awayPossession = statisticNumber(statistics, 'Ball Possession', 'away');
  if (homePossession != null && awayPossession != null) {
    const leader = homePossession >= awayPossession ? match.homeTeamName : match.awayTeamName;
    summary.push(`${leader} had more of the ball (${Math.max(homePossession, awayPossession)}% possession).`);
  }
  const homeOnTarget = statisticNumber(statistics, 'Shots on Goal', 'home');
  const awayOnTarget = statisticNumber(statistics, 'Shots on Goal', 'away');
  if (homeOnTarget != null && awayOnTarget != null) {
    summary.push(`Shots on target: ${match.homeTeamName} ${homeOnTarget}, ${match.awayTeamName} ${awayOnTarget}.`);
  }
  const homeCards = (statisticNumber(statistics, 'Yellow Cards', 'home') ?? 0) + (statisticNumber(statistics, 'Red Cards', 'home') ?? 0);
  const awayCards = (statisticNumber(statistics, 'Yellow Cards', 'away') ?? 0) + (statisticNumber(statistics, 'Red Cards', 'away') ?? 0);
  if (homeCards + awayCards > 0) summary.push(`The match produced ${homeCards + awayCards} card${homeCards + awayCards === 1 ? '' : 's'}.`);
  return summary;
}

function mapAnalysis(raw: any, providerMatchId: string): MatchAnalysis {
  const match = mapMatch(raw);
  const events = mapEvents(raw.events ?? [], providerMatchId);
  const statistics = mapStatistics(raw.statistics ?? []);
  const lineups = mapLineups(raw.lineups ?? []);
  const topPerformers = mapPerformers(raw.players ?? []);
  return {
    matchId: match.id,
    providerId: 'api-football',
    events,
    statistics,
    lineups,
    topPerformers,
    summary: buildSummary(match, statistics),
    hasExtendedData: events.length > 0 || statistics.length > 0 || lineups.length > 0 || topPerformers.length > 0,
    generatedAtUtc: new Date().toISOString(),
  };
}

class ApiFootballProvider implements FootballDataProvider {
  readonly id = 'api-football' as const;
  readonly displayName = 'API-Football';
  readonly capabilities = API_FOOTBALL_CAPABILITIES;

  isConfigured(): boolean {
    return API_FOOTBALL_KEY.trim().length > 0;
  }

  private headers(): Record<string, string> {
    return { 'x-apisports-key': API_FOOTBALL_KEY };
  }

  async getCompetitions(): Promise<Competition[]> {
    if (!this.isConfigured()) return [];
    const data = await fetchJson<any>(this.id, `${BASE_URL}/leagues`, { headers: this.headers() });
    return (data.response ?? []).map((entry: any) => ({
      id: `api-football:${entry.league?.id}`,
      providerId: this.id,
      providerCompetitionId: String(entry.league?.id),
      name: entry.league?.name,
      country: entry.country?.name ?? null,
      countryCode: entry.country?.code ?? null,
      type: entry.league?.type === 'Cup' ? 'knockout' : 'league',
      currentSeason: entry.seasons?.find((s: any) => s.current)?.year?.toString() ?? null,
      emblemUrl: entry.league?.logo ?? null,
      isFavorite: false,
      favoriteOrder: null,
      lastRefreshedAt: new Date().toISOString(),
      attribution: 'API-Football',
    })).sort((a: Competition, b: Competition) => {
      const aPopular = POPULAR_LEAGUE_IDS.indexOf(Number(a.providerCompetitionId));
      const bPopular = POPULAR_LEAGUE_IDS.indexOf(Number(b.providerCompetitionId));
      if (aPopular !== -1 || bPopular !== -1) {
        if (aPopular === -1) return 1;
        if (bPopular === -1) return -1;
        return aPopular - bPopular;
      }
      return `${a.country ?? ''}:${a.name}`.localeCompare(`${b.country ?? ''}:${b.name}`);
    });
  }

  async getMatches(query: MatchesQuery): Promise<Match[]> {
    if (!this.isConfigured()) return [];
    const from = query.dateFromUtc.slice(0, 10);
    const to = query.dateToUtc.slice(0, 10);
    if (query.competitionProviderIds?.length === 1) {
      const start = new Date(`${from}T00:00:00Z`);
      const season = start.getUTCMonth() < 6 ? start.getUTCFullYear() - 1 : start.getUTCFullYear();
      const leagueId = query.competitionProviderIds[0];
      const data = await fetchJson<any>(
        this.id,
        `${BASE_URL}/fixtures?league=${leagueId}&season=${season}&from=${from}&to=${to}`,
        { headers: this.headers() },
      );
      return (data.response ?? []).map(mapMatch);
    }
    const results: Match[] = [];
    let cursor = new Date(from);
    const end = new Date(to);
    while (cursor <= end) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const data = await fetchJson<any>(this.id, `${BASE_URL}/fixtures?date=${dateStr}`, {
        headers: this.headers(),
      });
      results.push(...(data.response ?? []).map(mapMatch));
      cursor = new Date(cursor.getTime() + 86400000);
    }
    return results;
  }

  async getMatch(providerMatchId: string): Promise<Match | null> {
    if (!this.isConfigured()) return null;
    const data = await fetchJson<any>(this.id, `${BASE_URL}/fixtures?id=${providerMatchId}`, {
      headers: this.headers(),
    });
    const first = data.response?.[0];
    return first ? mapMatch(first) : null;
  }

  async getStandings(competitionProviderId: string, season?: string): Promise<StandingRow[]> {
    if (!this.isConfigured()) return [];
    const year = season ?? String(new Date().getFullYear());
    const data = await fetchJson<any>(
      this.id,
      `${BASE_URL}/standings?league=${competitionProviderId}&season=${year}`,
      { headers: this.headers() },
    );
    const groups = data.response?.[0]?.league?.standings ?? [];
    const rows: StandingRow[] = [];
    for (const group of groups) {
      for (const row of group) {
        rows.push({
          competitionId: `api-football:${competitionProviderId}`,
          season: year,
          tableType: 'overall',
          position: row.rank,
          teamId: `api-football:${row.team?.id}`,
          teamName: row.team?.name ?? 'Unknown',
          teamCrestUrl: row.team?.logo ?? null,
          played: row.all?.played ?? 0,
          wins: row.all?.win ?? 0,
          draws: row.all?.draw ?? 0,
          losses: row.all?.lose ?? 0,
          goalsFor: row.all?.goals?.for ?? 0,
          goalsAgainst: row.all?.goals?.against ?? 0,
          goalDifference: row.goalsDiff ?? 0,
          points: row.points ?? 0,
          form: row.form ? String(row.form).split('') : null,
          isProvisional: false,
        });
      }
    }
    return rows;
  }

  async getTeams(competitionProviderId: string): Promise<Team[]> {
    if (!this.isConfigured()) return [];
    const year = String(new Date().getFullYear());
    const data = await fetchJson<any>(
      this.id,
      `${BASE_URL}/teams?league=${competitionProviderId}&season=${year}`,
      { headers: this.headers() },
    );
    return (data.response ?? []).map((entry: any) => ({
      id: `api-football:${entry.team?.id}`,
      providerId: this.id,
      providerTeamId: String(entry.team?.id),
      name: entry.team?.name,
      shortName: entry.team?.code ?? null,
      initials: entry.team?.code ?? initialsFromName(entry.team?.name ?? ''),
      crestUrl: entry.team?.logo ?? null,
      competitionIds: [`api-football:${competitionProviderId}`],
      isFavorite: false,
      favoriteOrder: null,
    }));
  }

  async getTeam(providerTeamId: string): Promise<Team | null> {
    if (!this.isConfigured()) return null;
    const data = await fetchJson<any>(this.id, `${BASE_URL}/teams?id=${providerTeamId}`, {
      headers: this.headers(),
    });
    const entry = data.response?.[0];
    if (!entry) return null;
    return {
      id: `api-football:${entry.team?.id}`,
      providerId: this.id,
      providerTeamId: String(entry.team?.id),
      name: entry.team?.name,
      shortName: entry.team?.code ?? null,
      initials: entry.team?.code ?? initialsFromName(entry.team?.name ?? ''),
      crestUrl: entry.team?.logo ?? null,
      competitionIds: [],
      isFavorite: false,
      favoriteOrder: null,
    };
  }

  async getHeadToHead(homeTeamProviderId: string, awayTeamProviderId: string): Promise<HeadToHeadResult> {
    if (!this.isConfigured()) return { matches: [], totalMeetings: 0 };
    const data = await fetchJson<any>(
      this.id,
      `${BASE_URL}/fixtures/headtohead?h2h=${homeTeamProviderId}-${awayTeamProviderId}&last=10`,
      { headers: this.headers() },
    );
    const matches = (data.response ?? []).map(mapMatch);
    return { matches, totalMeetings: matches.length };
  }

  async getForm(teamProviderId: string): Promise<FormResult> {
    if (!this.isConfigured()) return { lastFive: [], homeForm: [], awayForm: [] };
    const data = await fetchJson<any>(
      this.id,
      `${BASE_URL}/fixtures?team=${teamProviderId}&last=10`,
      { headers: this.headers() },
    );
    const fixtures = (data.response ?? []) as any[];
    const toResult = (m: any): 'W' | 'D' | 'L' | null => {
      const isHome = String(m.teams?.home?.id) === teamProviderId;
      const homeGoals = m.goals?.home;
      const awayGoals = m.goals?.away;
      if (homeGoals == null || awayGoals == null) return null;
      if (homeGoals === awayGoals) return 'D';
      const homeWon = homeGoals > awayGoals;
      return isHome === homeWon ? 'W' : 'L';
    };
    const lastFive = fixtures.slice(0, 5).map(toResult).filter((r): r is 'W' | 'D' | 'L' => !!r);
    const homeForm = fixtures.filter(m => String(m.teams?.home?.id) === teamProviderId).slice(0, 5).map(toResult).filter((r): r is 'W' | 'D' | 'L' => !!r);
    const awayForm = fixtures.filter(m => String(m.teams?.away?.id) === teamProviderId).slice(0, 5).map(toResult).filter((r): r is 'W' | 'D' | 'L' => !!r);
    return { lastFive, homeForm, awayForm };
  }

  async getPrediction(providerMatchId: string): Promise<MatchPrediction | null> {
    if (!this.isConfigured()) return null;
    const data = await fetchJson<any>(this.id, `${BASE_URL}/predictions?fixture=${providerMatchId}`, {
      headers: this.headers(),
    });
    return mapPrediction(data.response?.[0], providerMatchId);
  }

  async getMatchAnalysis(providerMatchId: string): Promise<MatchAnalysis | null> {
    if (!this.isConfigured()) return null;
    const data = await fetchJson<any>(this.id, `${BASE_URL}/fixtures?id=${providerMatchId}`, {
      headers: this.headers(),
    });
    const first = data.response?.[0];
    return first ? mapAnalysis(first, providerMatchId) : null;
  }
}

export const apiFootballProvider = new ApiFootballProvider();
