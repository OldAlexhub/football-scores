import { COMPETITION_BY_KEY, resolveCatalogCompetition } from '../config/competitionCatalog';
import type { Competition, Match, MatchStatus, StandingRow, Team } from '../types/domain';
import { OPEN_LIGA_DB_CAPABILITIES } from './capabilities';
import { mapWithConcurrency } from './concurrency';
import { fetchJson } from './httpClient';
import type { FootballDataProvider, FormResult, HeadToHeadResult, MatchesQuery } from './types';

const BASE_URL = 'https://api.openligadb.de';
/** Every German competition this adapter can serve, for the "all" view. */
const ALL_SHORTCUTS = ['bl1', 'bl2', 'dfb'];
const LIVE_WINDOW_MS = 150 * 60 * 1000;

function seasonForShortcut(dateFromUtc: string): number {
  const date = new Date(dateFromUtc);
  const year = date.getUTCFullYear();
  // Bundesliga & DFB-Pokal run Aug–May; before July the season started last year.
  return date.getUTCMonth() < 6 ? year - 1 : year;
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return (words.length === 1 ? words[0].slice(0, 3) : words.slice(0, 3).map(w => w[0]).join('')).toUpperCase();
}

function resultOf(raw: any, kind: 'final' | 'half'): { home: number | null; away: number | null } | null {
  const list: any[] = raw.matchResults ?? [];
  const wanted = kind === 'final' ? 2 : 1;
  const entry =
    list.find(r => Number(r.resultTypeID) === wanted) ??
    list.find(r => /endergebnis|final/i.test(String(r.resultName)) === (kind === 'final')) ??
    (kind === 'final' ? list[list.length - 1] : list[0]);
  if (!entry) return null;
  const home = entry.pointsTeam1 == null ? null : Number(entry.pointsTeam1);
  const away = entry.pointsTeam2 == null ? null : Number(entry.pointsTeam2);
  return home == null && away == null ? null : { home, away };
}

function statusOf(raw: any, kickoffMs: number | null): MatchStatus {
  if (raw.matchIsFinished) return 'finished';
  if (kickoffMs != null && Date.now() >= kickoffMs && Date.now() < kickoffMs + LIVE_WINDOW_MS) return 'live';
  return 'scheduled';
}

function mapMatch(raw: any, shortcut: string): Match | null {
  const team1 = raw.team1 ?? {};
  const team2 = raw.team2 ?? {};
  if (!team1.teamName || !team2.teamName) return null;
  const catalog = COMPETITION_BY_KEY.get(
    ({ bl1: 'bundesliga', bl2: '2-bundesliga', dfb: 'dfb-pokal' } as Record<string, string>)[shortcut] ?? '',
  ) ?? resolveCatalogCompetition(raw.leagueName);
  const kickoffIso = raw.matchDateTimeUTC
    ? new Date(raw.matchDateTimeUTC).toISOString()
    : raw.matchDateTime ? new Date(`${raw.matchDateTime}Z`).toISOString() : null;
  const kickoffMs = kickoffIso ? new Date(kickoffIso).getTime() : null;
  const status = statusOf(raw, kickoffMs);
  const finalScore = resultOf(raw, 'final');
  const goals: any[] = raw.goals ?? [];
  const lastGoal = goals[goals.length - 1];
  const liveScore = lastGoal && (lastGoal.scoreTeam1 != null || lastGoal.scoreTeam2 != null)
    ? { home: Number(lastGoal.scoreTeam1), away: Number(lastGoal.scoreTeam2) }
    : null;
  const currentScore = finalScore ?? liveScore;
  const isKnockout = shortcut === 'dfb';

  return {
    id: `openligadb:${raw.matchID}`,
    providerId: 'openligadb',
    providerMatchId: String(raw.matchID),
    competitionId: catalog?.canonicalId ?? `openligadb:${shortcut}`,
    competitionName: catalog?.canonicalName ?? raw.leagueName ?? 'German football',
    competitionEmblemUrl: null,
    country: 'Germany',
    season: raw.leagueSeason != null ? String(raw.leagueSeason) : null,
    stage: raw.group?.groupName ?? null,
    round: raw.group?.groupName ?? null,
    matchweek: Number.isFinite(Number(raw.group?.groupOrderID)) ? Number(raw.group.groupOrderID) : null,
    homeTeamId: `openligadb:${team1.teamId}`,
    homeTeamName: team1.teamName,
    homeTeamInitials: (team1.shortName ?? initials(team1.teamName)).slice(0, 3).toUpperCase(),
    homeTeamCrestUrl: team1.teamIconUrl ?? null,
    awayTeamId: `openligadb:${team2.teamId}`,
    awayTeamName: team2.teamName,
    awayTeamInitials: (team2.shortName ?? initials(team2.teamName)).slice(0, 3).toUpperCase(),
    awayTeamCrestUrl: team2.teamIconUrl ?? null,
    kickoffUtc: kickoffIso,
    kickoffUnknown: !kickoffIso,
    status,
    statusDetail: null,
    elapsedMinutes: status === 'live' && lastGoal?.matchMinute != null ? Number(lastGoal.matchMinute) : null,
    injuryTimeMinutes: null,
    halfTimeScore: resultOf(raw, 'half'),
    fullTimeScore: status === 'finished' ? finalScore : null,
    extraTimeScore: null,
    penaltyScore: null,
    currentScore,
    winner: currentScore && currentScore.home != null && currentScore.away != null
      ? (currentScore.home > currentScore.away ? 'home' : currentScore.away > currentScore.home ? 'away' : 'draw')
      : null,
    venue: raw.location?.locationStadium ?? null,
    referee: null,
    attendance: Number.isFinite(Number(raw.numberOfViewers)) ? Number(raw.numberOfViewers) : null,
    lastProviderUpdateUtc: raw.lastUpdateDateTime ? new Date(`${raw.lastUpdateDateTime}Z`).toISOString() : new Date().toISOString(),
    isKnockout,
    extraTimePossible: isKnockout,
    attribution: 'OpenLigaDB',
    sourceIds: ['openligadb'],
    catalogKey: catalog?.key ?? null,
  };
}

class OpenLigaDbProvider implements FootballDataProvider {
  readonly id = 'openligadb' as const;
  readonly displayName = 'OpenLigaDB';
  readonly capabilities = OPEN_LIGA_DB_CAPABILITIES;

  isConfigured(): boolean { return true; }

  async getCompetitions(): Promise<Competition[]> {
    return ['bundesliga', '2-bundesliga', 'dfb-pokal'].flatMap(key => {
      const item = COMPETITION_BY_KEY.get(key);
      return item ? [{
        id: item.canonicalId,
        providerId: this.id,
        providerCompetitionId: item.openLigaShortcut ?? key,
        name: item.canonicalName,
        country: 'Germany',
        countryCode: 'DE',
        type: item.knockout ? 'knockout' as const : 'league' as const,
        currentSeason: String(seasonForShortcut(new Date().toISOString())),
        emblemUrl: null,
        isFavorite: false,
        favoriteOrder: null,
        lastRefreshedAt: new Date().toISOString(),
        attribution: 'OpenLigaDB',
      }] : [];
    });
  }

  async getMatches(query: MatchesQuery): Promise<Match[]> {
    const shortcuts = query.competitionProviderIds?.length
      ? [...new Set(query.competitionProviderIds
          .map(key => COMPETITION_BY_KEY.get(key)?.openLigaShortcut)
          .filter((s): s is string => !!s))]
      : ALL_SHORTCUTS;
    if (shortcuts.length === 0) return [];

    const season = seasonForShortcut(query.dateFromUtc);
    const rangeStart = new Date(query.dateFromUtc).getTime();
    const rangeEnd = new Date(query.dateToUtc).getTime();

    const grouped = await mapWithConcurrency(shortcuts, 3, async shortcut => {
      const rows = await fetchJson<any[]>(this.id, `${BASE_URL}/getmatchdata/${shortcut}/${season}`).catch(() => []);
      return (Array.isArray(rows) ? rows : [])
        .map(row => mapMatch(row, shortcut))
        .filter((m): m is Match => !!m);
    });

    return grouped.flat().filter(match => {
      if (!match.kickoffUtc) return true;
      const kickoff = new Date(match.kickoffUtc).getTime();
      return kickoff >= rangeStart && kickoff <= rangeEnd;
    });
  }

  async getMatch(providerMatchId: string): Promise<Match | null> {
    const row = await fetchJson<any>(this.id, `${BASE_URL}/getmatchdata/${providerMatchId}`).catch(() => null);
    if (!row) return null;
    const shortcut = String(row.leagueShortcut ?? 'bl1');
    return mapMatch(row, shortcut);
  }

  async getStandings(competitionProviderId: string, season?: string): Promise<StandingRow[]> {
    const item = resolveCatalogCompetition(competitionProviderId);
    const shortcut = item?.openLigaShortcut;
    if (!shortcut) return [];
    const year = season ?? String(seasonForShortcut(new Date().toISOString()));
    const rows = await fetchJson<any[]>(this.id, `${BASE_URL}/getbltable/${shortcut}/${year}`).catch(() => []);
    return (Array.isArray(rows) ? rows : []).map((row, index) => ({
      competitionId: item?.canonicalId ?? `openligadb:${shortcut}`,
      season: year,
      tableType: 'overall' as const,
      position: index + 1,
      teamId: `openligadb:${row.teamInfoId}`,
      teamName: row.teamName ?? 'Unknown',
      teamCrestUrl: row.teamIconUrl ?? null,
      played: Number(row.matches) || 0,
      wins: Number(row.won) || 0,
      draws: Number(row.draw) || 0,
      losses: Number(row.lost) || 0,
      goalsFor: Number(row.goals) || 0,
      goalsAgainst: Number(row.opponentGoals) || 0,
      goalDifference: Number(row.goalDiff) || 0,
      points: Number(row.points) || 0,
      form: null,
      isProvisional: false,
    }));
  }

  async getTeams(): Promise<Team[]> { return []; }
  async getTeam(): Promise<Team | null> { return null; }
  async getHeadToHead(): Promise<HeadToHeadResult> { return { matches: [], totalMeetings: 0 }; }
  async getForm(): Promise<FormResult> { return { lastFive: [], homeForm: [], awayForm: [] }; }
}

export const openLigaDbProvider = new OpenLigaDbProvider();
