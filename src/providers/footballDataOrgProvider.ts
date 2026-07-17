import { FOOTBALL_DATA_ORG_TOKEN } from '../config/providerKeys';
import type { Competition, Match, MatchStatus, StandingRow, Team } from '../types/domain';
import { FOOTBALL_DATA_ORG_CAPABILITIES } from './capabilities';
import { fetchJson } from './httpClient';
import type { FootballDataProvider, FormResult, HeadToHeadResult, MatchesQuery } from './types';

const BASE_URL = 'https://api.football-data.org/v4';

function statusFromApi(status: string): MatchStatus {
  switch (status) {
    case 'IN_PLAY':
      return 'live';
    case 'PAUSED':
      return 'half_time';
    case 'FINISHED':
      return 'finished';
    case 'POSTPONED':
      return 'postponed';
    case 'SUSPENDED':
      return 'suspended';
    case 'CANCELLED':
      return 'cancelled';
    case 'SCHEDULED':
    case 'TIMED':
    default:
      return 'scheduled';
  }
}

function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words
    .slice(0, 3)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function mapMatch(raw: any): Match {
  const homeName = raw.homeTeam?.name ?? raw.homeTeam?.shortName ?? 'Unknown';
  const awayName = raw.awayTeam?.name ?? raw.awayTeam?.shortName ?? 'Unknown';
  const status = statusFromApi(raw.status);
  const fullTime = raw.score?.fullTime ?? {};
  const halfTime = raw.score?.halfTime ?? {};
  const isKnockout = raw.competition?.type === 'CUP' || !!raw.stage?.includes?.('FINAL') || !!raw.stage?.includes?.('SEMI');

  return {
    id: `football-data-org:${raw.id}`,
    providerId: 'football-data-org',
    providerMatchId: String(raw.id),
    competitionId: `football-data-org:${raw.competition?.id}`,
    competitionName: raw.competition?.name ?? 'Unknown competition',
    country: raw.area?.name ?? null,
    season: raw.season?.startDate ? `${raw.season.startDate.slice(0, 4)}` : null,
    stage: raw.stage ?? null,
    round: raw.group ?? null,
    matchweek: typeof raw.matchday === 'number' ? raw.matchday : null,
    homeTeamId: `football-data-org:${raw.homeTeam?.id}`,
    homeTeamName: homeName,
    homeTeamInitials: raw.homeTeam?.tla ?? initialsFromName(homeName),
    homeTeamCrestUrl: raw.homeTeam?.crest ?? null,
    awayTeamId: `football-data-org:${raw.awayTeam?.id}`,
    awayTeamName: awayName,
    awayTeamInitials: raw.awayTeam?.tla ?? initialsFromName(awayName),
    awayTeamCrestUrl: raw.awayTeam?.crest ?? null,
    kickoffUtc: raw.utcDate ?? null,
    kickoffUnknown: !raw.utcDate,
    status,
    halfTimeScore: halfTime.home != null || halfTime.away != null ? { home: halfTime.home ?? null, away: halfTime.away ?? null } : null,
    fullTimeScore: fullTime.home != null || fullTime.away != null ? { home: fullTime.home ?? null, away: fullTime.away ?? null } : null,
    extraTimeScore: raw.score?.extraTime && (raw.score.extraTime.home != null || raw.score.extraTime.away != null)
      ? { home: raw.score.extraTime.home ?? null, away: raw.score.extraTime.away ?? null }
      : null,
    penaltyScore: raw.score?.penalties && (raw.score.penalties.home != null || raw.score.penalties.away != null)
      ? { home: raw.score.penalties.home ?? null, away: raw.score.penalties.away ?? null }
      : null,
    currentScore: fullTime.home != null || fullTime.away != null ? { home: fullTime.home ?? null, away: fullTime.away ?? null } : null,
    winner: raw.score?.winner === 'HOME_TEAM' ? 'home' : raw.score?.winner === 'AWAY_TEAM' ? 'away' : raw.score?.winner === 'DRAW' ? 'draw' : null,
    venue: raw.venue ?? null,
    lastProviderUpdateUtc: raw.lastUpdated ?? null,
    isKnockout,
    extraTimePossible: isKnockout,
    attribution: 'football-data.org',
  };
}

class FootballDataOrgProvider implements FootballDataProvider {
  readonly id = 'football-data-org' as const;
  readonly displayName = 'football-data.org';
  readonly capabilities = FOOTBALL_DATA_ORG_CAPABILITIES;

  isConfigured(): boolean {
    return FOOTBALL_DATA_ORG_TOKEN.trim().length > 0;
  }

  private headers(): Record<string, string> {
    return { 'X-Auth-Token': FOOTBALL_DATA_ORG_TOKEN };
  }

  async getCompetitions(): Promise<Competition[]> {
    if (!this.isConfigured()) return [];
    const data = await fetchJson<any>(this.id, `${BASE_URL}/competitions`, { headers: this.headers() });
    return (data.competitions ?? []).map((c: any) => ({
      id: `football-data-org:${c.id}`,
      providerId: this.id,
      providerCompetitionId: String(c.id),
      name: c.name,
      country: c.area?.name ?? null,
      countryCode: c.area?.code ?? null,
      type: c.type === 'CUP' ? 'knockout' : 'league',
      currentSeason: c.currentSeason?.startDate ? c.currentSeason.startDate.slice(0, 4) : null,
      emblemUrl: c.emblem ?? null,
      isFavorite: false,
      favoriteOrder: null,
      lastRefreshedAt: new Date().toISOString(),
      attribution: 'football-data.org',
    }));
  }

  async getMatches(query: MatchesQuery): Promise<Match[]> {
    if (!this.isConfigured()) return [];
    const dateFrom = query.dateFromUtc.slice(0, 10);
    const dateTo = query.dateToUtc.slice(0, 10);
    const data = await fetchJson<any>(
      this.id,
      `${BASE_URL}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      { headers: this.headers() },
    );
    return (data.matches ?? []).map(mapMatch);
  }

  async getMatch(providerMatchId: string): Promise<Match | null> {
    if (!this.isConfigured()) return null;
    const data = await fetchJson<any>(this.id, `${BASE_URL}/matches/${providerMatchId}`, {
      headers: this.headers(),
    });
    return data ? mapMatch(data) : null;
  }

  async getStandings(competitionProviderId: string): Promise<StandingRow[]> {
    if (!this.isConfigured()) return [];
    const data = await fetchJson<any>(
      this.id,
      `${BASE_URL}/competitions/${competitionProviderId}/standings`,
      { headers: this.headers() },
    );
    const rows: StandingRow[] = [];
    for (const group of data.standings ?? []) {
      const tableType = group.type === 'HOME' ? 'home' : group.type === 'AWAY' ? 'away' : 'overall';
      for (const row of group.table ?? []) {
        rows.push({
          competitionId: `football-data-org:${competitionProviderId}`,
          season: null,
          tableType,
          position: row.position,
          teamId: `football-data-org:${row.team?.id}`,
          teamName: row.team?.name ?? 'Unknown',
          played: row.playedGames ?? 0,
          wins: row.won ?? 0,
          draws: row.draw ?? 0,
          losses: row.lost ?? 0,
          goalsFor: row.goalsFor ?? 0,
          goalsAgainst: row.goalsAgainst ?? 0,
          goalDifference: row.goalDifference ?? 0,
          points: row.points ?? 0,
          form: row.form ? String(row.form).split(',').filter(Boolean) : null,
          isProvisional: false,
        });
      }
    }
    return rows;
  }

  async getTeams(competitionProviderId: string): Promise<Team[]> {
    if (!this.isConfigured()) return [];
    const data = await fetchJson<any>(
      this.id,
      `${BASE_URL}/competitions/${competitionProviderId}/teams`,
      { headers: this.headers() },
    );
    return (data.teams ?? []).map((t: any) => ({
      id: `football-data-org:${t.id}`,
      providerId: this.id,
      providerTeamId: String(t.id),
      name: t.name,
      shortName: t.shortName ?? null,
      initials: t.tla ?? initialsFromName(t.name),
      crestUrl: t.crest ?? null,
      competitionIds: [`football-data-org:${competitionProviderId}`],
      isFavorite: false,
      favoriteOrder: null,
    }));
  }

  async getTeam(providerTeamId: string): Promise<Team | null> {
    if (!this.isConfigured()) return null;
    const t = await fetchJson<any>(this.id, `${BASE_URL}/teams/${providerTeamId}`, { headers: this.headers() });
    if (!t) return null;
    return {
      id: `football-data-org:${t.id}`,
      providerId: this.id,
      providerTeamId: String(t.id),
      name: t.name,
      shortName: t.shortName ?? null,
      initials: t.tla ?? initialsFromName(t.name),
      crestUrl: t.crest ?? null,
      competitionIds: (t.runningCompetitions ?? []).map((c: any) => `football-data-org:${c.id}`),
      isFavorite: false,
      favoriteOrder: null,
    };
  }

  async getHeadToHead(homeTeamProviderId: string, awayTeamProviderId: string): Promise<HeadToHeadResult> {
    // football-data.org exposes head-to-head only relative to a specific match id,
    // so this aggregate lookup is intentionally left for CachedProvider/API-Football.
    void homeTeamProviderId;
    void awayTeamProviderId;
    return { matches: [], totalMeetings: 0 };
  }

  async getMatchHeadToHead(providerMatchId: string): Promise<HeadToHeadResult> {
    if (!this.isConfigured()) return { matches: [], totalMeetings: 0 };
    const data = await fetchJson<any>(this.id, `${BASE_URL}/matches/${providerMatchId}/head2head`, {
      headers: this.headers(),
    });
    return {
      matches: (data.matches ?? []).map(mapMatch),
      totalMeetings: data.aggregates?.numberOfMatches ?? (data.matches ?? []).length,
    };
  }

  async getForm(teamProviderId: string): Promise<FormResult> {
    if (!this.isConfigured()) return { lastFive: [], homeForm: [], awayForm: [] };
    const data = await fetchJson<any>(
      this.id,
      `${BASE_URL}/teams/${teamProviderId}/matches?status=FINISHED&limit=10`,
      { headers: this.headers() },
    );
    const matches = (data.matches ?? []) as any[];
    const toResult = (m: any): 'W' | 'D' | 'L' | null => {
      const isHome = String(m.homeTeam?.id) === teamProviderId;
      const winner = m.score?.winner;
      if (winner === 'DRAW') return 'D';
      if (winner === 'HOME_TEAM') return isHome ? 'W' : 'L';
      if (winner === 'AWAY_TEAM') return isHome ? 'L' : 'W';
      return null;
    };
    const lastFive = matches.slice(0, 5).map(toResult).filter((r): r is 'W' | 'D' | 'L' => !!r);
    const homeForm = matches.filter(m => String(m.homeTeam?.id) === teamProviderId).slice(0, 5).map(toResult).filter((r): r is 'W' | 'D' | 'L' => !!r);
    const awayForm = matches.filter(m => String(m.awayTeam?.id) === teamProviderId).slice(0, 5).map(toResult).filter((r): r is 'W' | 'D' | 'L' => !!r);
    return { lastFive, homeForm, awayForm };
  }
}

export const footballDataOrgProvider = new FootballDataOrgProvider();
