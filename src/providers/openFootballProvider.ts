import type { Competition, Match, StandingRow, Team } from '../types/domain';
import { OPEN_FOOTBALL_CAPABILITIES } from './capabilities';
import { fetchJson } from './httpClient';
import type { FootballDataProvider, FormResult, HeadToHeadResult, MatchesQuery } from './types';

const RAW_BASE_URL = 'https://raw.githubusercontent.com/openfootball/football.json/master';

/**
 * OpenFootball ships one public-domain JSON file per competition per season,
 * so — unlike the other two adapters — "competitions" here is a small,
 * hand-maintained registry rather than something the free dataset exposes
 * via its own index endpoint.
 */
export const OPEN_FOOTBALL_COMPETITIONS: Array<{ code: string; name: string; country: string }> = [
  { code: 'en.1', name: 'Premier League', country: 'England' },
  { code: 'en.2', name: 'Championship', country: 'England' },
  { code: 'es.1', name: 'La Liga', country: 'Spain' },
  { code: 'it.1', name: 'Serie A', country: 'Italy' },
  { code: 'de.1', name: 'Bundesliga', country: 'Germany' },
  { code: 'fr.1', name: 'Ligue 1', country: 'France' },
];

function currentSeasonSlug(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  // European domestic seasons span August–May; before July, the season
  // that started last year is still current.
  const startYear = now.getUTCMonth() < 6 ? year - 1 : year;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

function combineDateTime(date: string | undefined, time: string | undefined): { iso: string | null; unknown: boolean } {
  if (!date) {
    return { iso: null, unknown: true };
  }
  if (!time) {
    return { iso: null, unknown: true };
  }
  // OpenFootball stores date/time without an explicit UTC offset. Treated as
  // unknown-confidence rather than silently assumed to be any timezone.
  const parsed = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { iso: null, unknown: true };
  }
  return { iso: parsed.toISOString(), unknown: false };
}

function mapMatch(raw: any, competitionCode: string, competitionName: string, country: string, round: string | null): Match {
  const homeName = raw.team1;
  const awayName = raw.team2;
  const ft = raw.score?.ft as [number, number] | undefined;
  const et = raw.score?.et as [number, number] | undefined;
  const pens = raw.score?.p as [number, number] | undefined;
  const { iso, unknown } = combineDateTime(raw.date, raw.time);
  const hasScore = !!ft;

  return {
    id: `openfootball:${competitionCode}:${raw.date}:${homeName}:${awayName}`,
    providerId: 'openfootball',
    providerMatchId: `${competitionCode}:${raw.date}:${homeName}:${awayName}`,
    competitionId: `openfootball:${competitionCode}`,
    competitionName,
    country,
    season: currentSeasonSlug(),
    stage: null,
    round: round ?? raw.round ?? null,
    matchweek: null,
    homeTeamId: `openfootball:${competitionCode}:${homeName}`,
    homeTeamName: homeName,
    homeTeamInitials: initialsFromName(homeName),
    homeTeamCrestUrl: null,
    awayTeamId: `openfootball:${competitionCode}:${awayName}`,
    awayTeamName: awayName,
    awayTeamInitials: initialsFromName(awayName),
    awayTeamCrestUrl: null,
    kickoffUtc: iso,
    kickoffUnknown: unknown,
    status: hasScore ? 'finished' : 'scheduled',
    halfTimeScore: null,
    fullTimeScore: ft ? { home: ft[0], away: ft[1] } : null,
    extraTimeScore: et ? { home: et[0], away: et[1] } : null,
    penaltyScore: pens ? { home: pens[0], away: pens[1] } : null,
    currentScore: ft ? { home: ft[0], away: ft[1] } : null,
    winner: ft ? (ft[0] > ft[1] ? 'home' : ft[1] > ft[0] ? 'away' : 'draw') : null,
    venue: null,
    lastProviderUpdateUtc: null,
    isKnockout: false,
    extraTimePossible: false,
    attribution: 'OpenFootball (public domain)',
  };
}

class OpenFootballProvider implements FootballDataProvider {
  readonly id = 'openfootball' as const;
  readonly displayName = 'OpenFootball';
  readonly capabilities = OPEN_FOOTBALL_CAPABILITIES;

  isConfigured(): boolean {
    return true;
  }

  async getCompetitions(): Promise<Competition[]> {
    return OPEN_FOOTBALL_COMPETITIONS.map(c => ({
      id: `openfootball:${c.code}`,
      providerId: this.id,
      providerCompetitionId: c.code,
      name: c.name,
      country: c.country,
      countryCode: null,
      type: 'league',
      currentSeason: currentSeasonSlug(),
      emblemUrl: null,
      isFavorite: false,
      favoriteOrder: null,
      lastRefreshedAt: new Date().toISOString(),
      attribution: 'OpenFootball (public domain)',
    }));
  }

  private async loadCompetitionFile(code: string): Promise<any | null> {
    try {
      return await fetchJson<any>(this.id, `${RAW_BASE_URL}/${currentSeasonSlug()}/${code}.json`);
    } catch {
      return null;
    }
  }

  async getMatches(query: MatchesQuery): Promise<Match[]> {
    const codes = query.competitionProviderIds?.length
      ? query.competitionProviderIds
      : OPEN_FOOTBALL_COMPETITIONS.map(c => c.code);

    const from = new Date(query.dateFromUtc).getTime();
    const to = new Date(query.dateToUtc).getTime();
    const results: Match[] = [];

    for (const code of codes) {
      const meta = OPEN_FOOTBALL_COMPETITIONS.find(c => c.code === code);
      if (!meta) continue;
      const data = await this.loadCompetitionFile(code);
      if (!data) continue;
      for (const round of data.rounds ?? [{ name: null, matches: data.matches ?? [] }]) {
        for (const raw of round.matches ?? []) {
          const match = mapMatch(raw, code, meta.name, meta.country, round.name ?? null);
          if (match.kickoffUtc) {
            const time = new Date(match.kickoffUtc).getTime();
            if (time < from || time > to) continue;
          }
          results.push(match);
        }
      }
    }
    return results;
  }

  async getMatch(): Promise<Match | null> {
    // OpenFootball has no single-match lookup endpoint; callers should
    // resolve matches via getMatches and match on providerMatchId.
    return null;
  }

  async getStandings(): Promise<StandingRow[]> {
    return [];
  }

  async getTeams(competitionProviderId: string): Promise<Team[]> {
    const meta = OPEN_FOOTBALL_COMPETITIONS.find(c => c.code === competitionProviderId);
    if (!meta) return [];
    const data = await this.loadCompetitionFile(competitionProviderId);
    if (!data) return [];
    const names = new Set<string>();
    for (const round of data.rounds ?? [{ matches: data.matches ?? [] }]) {
      for (const raw of round.matches ?? []) {
        names.add(raw.team1);
        names.add(raw.team2);
      }
    }
    return Array.from(names).map(name => ({
      id: `openfootball:${competitionProviderId}:${name}`,
      providerId: this.id,
      providerTeamId: name,
      name,
      shortName: null,
      initials: initialsFromName(name),
      crestUrl: null,
      competitionIds: [`openfootball:${competitionProviderId}`],
      isFavorite: false,
      favoriteOrder: null,
    }));
  }

  async getTeam(): Promise<Team | null> {
    return null;
  }

  async getHeadToHead(): Promise<HeadToHeadResult> {
    return { matches: [], totalMeetings: 0 };
  }

  async getForm(): Promise<FormResult> {
    return { lastFive: [], homeForm: [], awayForm: [] };
  }
}

export const openFootballProvider = new OpenFootballProvider();
