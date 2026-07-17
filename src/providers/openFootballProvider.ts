import type { Competition, Match, StandingRow, Team } from '../types/domain';
import { OPEN_FOOTBALL_CAPABILITIES } from './capabilities';
import { fetchJson } from './httpClient';
import type { FootballDataProvider, FormResult, HeadToHeadResult, MatchesQuery } from './types';

const FOOTBALL_JSON_BASE = 'https://raw.githubusercontent.com/openfootball/football.json/master';

interface LeagueEntry {
  kind: 'league';
  code: string;
  name: string;
  country: string;
  /** Aug–May domestic seasons use "YYYY-YY" folders; Jan–Dec ones use "YYYY". */
  seasonType: 'academic' | 'calendar';
  /** Only needed when the file name doesn't match `${code}.json` (e.g. MLS). */
  fileName?: string;
}

interface TournamentEntry {
  kind: 'tournament';
  code: string;
  name: string;
  country: 'International';
  /** openfootball org repo this tournament's editions live in. */
  repo: string;
  fileName: string;
  /** Tried in order (most recent first) until one has real match data. */
  editions: string[];
}

type RegistryEntry = LeagueEntry | TournamentEntry;

/**
 * Every code below was verified against the live dataset directory listing
 * (github.com/openfootball/football.json and the per-tournament repos)
 * before being added — an unverified code just 404s forever and silently
 * produces an empty competition, which is worse than not listing it.
 *
 * Africa Cup of Nations (AFCON) has no free, public-domain dataset in the
 * openfootball ecosystem as of this writing, so it is intentionally not
 * included rather than shipping a competition that can never load data.
 */
const LEAGUES: LeagueEntry[] = [
  { kind: 'league', code: 'en.1', name: 'Premier League', country: 'England', seasonType: 'academic' },
  { kind: 'league', code: 'en.2', name: 'Championship', country: 'England', seasonType: 'academic' },
  { kind: 'league', code: 'en.3', name: 'League One', country: 'England', seasonType: 'academic' },
  { kind: 'league', code: 'en.4', name: 'League Two', country: 'England', seasonType: 'academic' },
  { kind: 'league', code: 'es.1', name: 'La Liga', country: 'Spain', seasonType: 'academic' },
  { kind: 'league', code: 'es.2', name: 'La Liga 2', country: 'Spain', seasonType: 'academic' },
  { kind: 'league', code: 'de.1', name: 'Bundesliga', country: 'Germany', seasonType: 'academic' },
  { kind: 'league', code: 'de.2', name: '2. Bundesliga', country: 'Germany', seasonType: 'academic' },
  { kind: 'league', code: 'it.1', name: 'Serie A', country: 'Italy', seasonType: 'academic' },
  { kind: 'league', code: 'it.2', name: 'Serie B', country: 'Italy', seasonType: 'academic' },
  { kind: 'league', code: 'fr.1', name: 'Ligue 1', country: 'France', seasonType: 'academic' },
  { kind: 'league', code: 'fr.2', name: 'Ligue 2', country: 'France', seasonType: 'academic' },
  { kind: 'league', code: 'nl.1', name: 'Eredivisie', country: 'Netherlands', seasonType: 'academic' },
  { kind: 'league', code: 'pt.1', name: 'Primeira Liga', country: 'Portugal', seasonType: 'academic' },
  { kind: 'league', code: 'be.1', name: 'First Division A', country: 'Belgium', seasonType: 'academic' },
  { kind: 'league', code: 'tr.1', name: 'Süper Lig', country: 'Turkey', seasonType: 'academic' },
  { kind: 'league', code: 'at.1', name: 'Bundesliga', country: 'Austria', seasonType: 'academic' },
  { kind: 'league', code: 'at.2', name: '2. Liga', country: 'Austria', seasonType: 'academic' },
  { kind: 'league', code: 'sco.1', name: 'Premiership', country: 'Scotland', seasonType: 'academic' },
  { kind: 'league', code: 'gr.1', name: 'Super League', country: 'Greece', seasonType: 'academic' },
  { kind: 'league', code: 'dz.1', name: 'Ligue 1', country: 'Algeria', seasonType: 'academic' },
  { kind: 'league', code: 'eg.1', name: 'Premier League', country: 'Egypt', seasonType: 'academic' },
  { kind: 'league', code: 'ma.1', name: 'Botola Pro', country: 'Morocco', seasonType: 'academic' },
  { kind: 'league', code: 'au.1', name: 'A-League', country: 'Australia', seasonType: 'academic' },
  { kind: 'league', code: 'mx.1', name: 'Liga MX', country: 'Mexico', seasonType: 'academic' },
  { kind: 'league', code: 'ar.1', name: 'Primera División', country: 'Argentina', seasonType: 'calendar' },
  { kind: 'league', code: 'br.1', name: 'Série A', country: 'Brazil', seasonType: 'calendar' },
  { kind: 'league', code: 'br.2', name: 'Série B', country: 'Brazil', seasonType: 'calendar' },
  { kind: 'league', code: 'co.1', name: 'Categoría Primera A', country: 'Colombia', seasonType: 'calendar' },
  { kind: 'league', code: 'cn.1', name: 'Super League', country: 'China', seasonType: 'calendar' },
  { kind: 'league', code: 'jp.1', name: 'J1 League', country: 'Japan', seasonType: 'calendar' },
  { kind: 'league', code: 'mls', name: 'MLS', country: 'United States', seasonType: 'calendar', fileName: 'mls.json' },
  // Lives in the same repo/season structure as domestic leagues, just an
  // international club competition rather than a single country's league.
  { kind: 'league', code: 'uefa.cl', name: 'UEFA Champions League', country: 'International', seasonType: 'academic' },
];

const TOURNAMENTS: TournamentEntry[] = [
  {
    kind: 'tournament', code: 'world-cup', name: 'FIFA World Cup', country: 'International',
    repo: 'worldcup.json', fileName: 'worldcup.json', editions: ['2026', '2022', '2018'],
  },
  {
    kind: 'tournament', code: 'club-world-cup', name: 'FIFA Club World Cup', country: 'International',
    repo: 'worldcup.json', fileName: 'clubworldcup.json', editions: ['2025'],
  },
  {
    kind: 'tournament', code: 'euro', name: 'UEFA European Championship', country: 'International',
    repo: 'euro.json', fileName: 'euro.json', editions: ['2028', '2024', '2020'],
  },
];

const REGISTRY: RegistryEntry[] = [...LEAGUES, ...TOURNAMENTS];

function seasonSlugForStartYear(startYear: number): string {
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

function currentAcademicSeasonSlug(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  // European domestic seasons span August–May; before July, the season
  // that started last year is still current.
  const startYear = now.getUTCMonth() < 6 ? year - 1 : year;
  return seasonSlugForStartYear(startYear);
}

/**
 * The device clock's "current" season/edition is only a guess — the
 * community-run dataset may not have published it yet, or the file may
 * exist but still be empty (e.g. a future tournament's placeholder file).
 * Candidates walk backwards so real data is still found instead of
 * silently returning nothing.
 */
function candidatesFor(entry: RegistryEntry): string[] {
  if (entry.kind === 'tournament') {
    return entry.editions.length > 0 ? entry.editions : [currentAcademicSeasonSlug()];
  }
  if (entry.seasonType === 'calendar') {
    const year = new Date().getUTCFullYear();
    return [year, year - 1, year - 2].map(String);
  }
  const now = new Date();
  const guessedStartYear = now.getUTCMonth() < 6 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const candidates: string[] = [];
  for (let offset = 0; offset <= 4; offset += 1) {
    candidates.push(seasonSlugForStartYear(guessedStartYear - offset));
  }
  return candidates;
}

function urlFor(entry: RegistryEntry, candidate: string): string {
  if (entry.kind === 'tournament') {
    return `https://raw.githubusercontent.com/openfootball/${entry.repo}/master/${candidate}/${entry.fileName}`;
  }
  const fileName = entry.fileName ?? `${entry.code}.json`;
  return `${FOOTBALL_JSON_BASE}/${candidate}/${fileName}`;
}

function hasRealData(data: any): boolean {
  if (Array.isArray(data?.matches) && data.matches.length > 0) return true;
  if (Array.isArray(data?.rounds)) {
    return data.rounds.some((r: any) => Array.isArray(r?.matches) && r.matches.length > 0);
  }
  return false;
}

function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

function combineDateTime(date: string | undefined, time: string | undefined): { iso: string | null; unknown: boolean } {
  if (!date || !time) {
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

const KNOCKOUT_ROUND_PATTERN = /round of|quarter|semi|final|play-?off/i;

function mapMatch(raw: any, entry: RegistryEntry, round: string | null, season: string): Match {
  const homeName = raw.team1;
  const awayName = raw.team2;
  const ft = raw.score?.ft as [number, number] | undefined;
  const et = raw.score?.et as [number, number] | undefined;
  const pens = raw.score?.p as [number, number] | undefined;
  const { iso, unknown } = combineDateTime(raw.date, raw.time);
  const hasScore = !!ft;
  const roundLabel = round ?? raw.round ?? null;
  const isKnockout = entry.kind === 'tournament' && !raw.group && !!roundLabel && KNOCKOUT_ROUND_PATTERN.test(roundLabel);

  return {
    id: `openfootball:${entry.code}:${raw.date}:${homeName}:${awayName}`,
    providerId: 'openfootball',
    providerMatchId: `${entry.code}:${raw.date}:${homeName}:${awayName}`,
    competitionId: `openfootball:${entry.code}`,
    competitionName: entry.name,
    country: entry.country,
    season,
    stage: raw.group ?? null,
    round: roundLabel,
    matchweek: null,
    homeTeamId: `openfootball:${entry.code}:${homeName}`,
    homeTeamName: homeName,
    homeTeamInitials: initialsFromName(homeName),
    homeTeamCrestUrl: null,
    awayTeamId: `openfootball:${entry.code}:${awayName}`,
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
    venue: raw.ground ?? null,
    lastProviderUpdateUtc: null,
    isKnockout,
    extraTimePossible: isKnockout,
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
    return REGISTRY.map(c => ({
      id: `openfootball:${c.code}`,
      providerId: this.id,
      providerCompetitionId: c.code,
      name: c.name,
      country: c.country,
      countryCode: null,
      type: c.kind === 'tournament' ? 'knockout' : 'league',
      currentSeason: c.kind === 'tournament' ? c.editions[0] ?? null : currentAcademicSeasonSlug(),
      emblemUrl: null,
      isFavorite: false,
      favoriteOrder: null,
      lastRefreshedAt: new Date().toISOString(),
      attribution: 'OpenFootball (public domain)',
    }));
  }

  private resolvedCandidateByCode = new Map<string, string>();

  private async loadCompetitionFile(code: string): Promise<{ entry: RegistryEntry; data: any; season: string } | null> {
    const entry = REGISTRY.find(e => e.code === code);
    if (!entry) return null;

    const knownGood = this.resolvedCandidateByCode.get(code);
    const candidates = knownGood
      ? [knownGood, ...candidatesFor(entry).filter(s => s !== knownGood)]
      : candidatesFor(entry);

    for (const candidate of candidates) {
      try {
        const data = await fetchJson<any>(this.id, urlFor(entry, candidate));
        if (data && hasRealData(data)) {
          this.resolvedCandidateByCode.set(code, candidate);
          return { entry, data, season: candidate };
        }
      } catch {
        // try the next candidate season/edition
      }
    }
    return null;
  }

  async getMatches(query: MatchesQuery): Promise<Match[]> {
    const codes = query.competitionProviderIds?.length
      ? query.competitionProviderIds
      : REGISTRY.map(c => c.code);

    const from = new Date(query.dateFromUtc).getTime();
    const to = new Date(query.dateToUtc).getTime();
    const results: Match[] = [];

    for (const code of codes) {
      const loaded = await this.loadCompetitionFile(code);
      if (!loaded) continue;
      const { entry, data, season } = loaded;
      for (const round of data.rounds ?? [{ name: null, matches: data.matches ?? [] }]) {
        for (const raw of round.matches ?? []) {
          const match = mapMatch(raw, entry, round.name ?? null, season);
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
    const loaded = await this.loadCompetitionFile(competitionProviderId);
    if (!loaded) return [];
    const { data } = loaded;
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
