import { API_FOOTBALL_KEY } from '../config/providerKeys';
import type { Competition, Match, MatchStatus, StandingRow, Team } from '../types/domain';
import { API_FOOTBALL_CAPABILITIES } from './capabilities';
import { fetchJson } from './httpClient';
import type { FootballDataProvider, FormResult, HeadToHeadResult, MatchesQuery } from './types';

const BASE_URL = 'https://v3.football.api-sports.io';

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
  const isKnockout = !!raw.league?.round && /final|semi|quarter|knockout|leg/i.test(raw.league.round);

  return {
    id: `api-football:${raw.fixture?.id}`,
    providerId: 'api-football',
    providerMatchId: String(raw.fixture?.id),
    competitionId: `api-football:${raw.league?.id}`,
    competitionName: raw.league?.name ?? 'Unknown competition',
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
    kickoffUnknown: !raw.fixture?.date,
    status,
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
    winner: null,
    venue: raw.fixture?.venue?.name ?? null,
    lastProviderUpdateUtc: raw.fixture?.date ?? null,
    isKnockout,
    extraTimePossible: isKnockout,
    attribution: 'API-Football',
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
    }));
  }

  async getMatches(query: MatchesQuery): Promise<Match[]> {
    if (!this.isConfigured()) return [];
    const from = query.dateFromUtc.slice(0, 10);
    const to = query.dateToUtc.slice(0, 10);
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
}

export const apiFootballProvider = new ApiFootballProvider();
