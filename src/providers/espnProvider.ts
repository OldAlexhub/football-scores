import type {
  Competition,
  LineupPlayer,
  Match,
  MatchAnalysis,
  MatchPrediction,
  MatchEvent,
  MatchEventType,
  MatchLineup,
  MatchStatistic,
  MatchStatus,
  PlayerMatchPerformance,
  StandingRow,
  Team,
} from '../types/domain';
import {
  COMPETITION_BY_ESPN_CODE,
  COMPETITION_BY_KEY,
  DEFAULT_COMPETITION_KEYS,
  resolveCatalogCompetition,
} from '../config/competitionCatalog';
import { readCache, writeCache } from '../storage/repositories/providerCacheRepo';
import { ESPN_CAPABILITIES } from './capabilities';
import { CACHE_TTL_MS, MAX_ESPN_RANGE_DAYS, cacheKeys } from './cacheKeys';
import { mapWithConcurrency } from './concurrency';
import { fetchJson } from './httpClient';
import type { FootballDataProvider, FormResult, HeadToHeadResult, MatchesQuery } from './types';

const BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const responseCache = new Map<string, Promise<any>>();

function espnCodeForMatch(match: Match): string | null {
  return (
    resolveCatalogCompetition(match.catalogKey)?.espnCode ??
    resolveCatalogCompetition(match.competitionId)?.espnCode ??
    resolveCatalogCompetition(match.competitionName)?.espnCode ??
    null
  );
}

const STATISTIC_ORDER = [
  'possessionPct',
  'totalShots',
  'shotsOnTarget',
  'blockedShots',
  'wonCorners',
  'offsides',
  'foulsCommitted',
  'yellowCards',
  'redCards',
  'saves',
  'accuratePasses',
  'totalPasses',
  'passPct',
  'totalTackles',
  'totalClearance',
];

function normalizeName(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/\b(fc|sc|cf|afc|football club|soccer club)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function sameTeam(left: unknown, right: unknown): boolean {
  const a = normalizeName(left);
  const b = normalizeName(right);
  return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
}

function cachedEspnJson(url: string): Promise<any> {
  const existing = responseCache.get(url);
  if (existing) return existing;
  const request = fetchJson<any>('espn', url).catch(error => {
    responseCache.delete(url);
    throw error;
  });
  responseCache.set(url, request);
  return request;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function minuteParts(value: unknown): { minute: number; extraMinute: number | null } {
  const match = String(value ?? '').match(/(\d+)'(?:\+(\d+)')?/);
  return { minute: match ? Number(match[1]) : 0, extraMinute: match?.[2] ? Number(match[2]) : null };
}

function mapEventType(value: unknown): MatchEventType {
  const type = String(value ?? '').toLocaleLowerCase();
  if (type === 'goal') return 'goal';
  if (type.includes('card')) return 'card';
  if (type === 'substitution') return 'substitution';
  if (type.includes('var')) return 'var';
  return 'other';
}

function mapEvents(rawEvents: any[], eventId: string): MatchEvent[] {
  return rawEvents.map((event, index) => {
    const clock = minuteParts(event.clock?.displayValue);
    return {
      id: `espn:${event.id ?? `${eventId}:${index}`}`,
      minute: clock.minute,
      extraMinute: clock.extraMinute,
      teamId: `espn:${event.team?.id ?? 'unknown'}`,
      teamName: event.team?.displayName ?? 'Unknown',
      playerName: event.participants?.[0]?.athlete?.displayName ?? null,
      assistName: event.participants?.[1]?.athlete?.displayName ?? null,
      type: mapEventType(event.type?.type ?? event.type?.text),
      detail: event.type?.text ?? event.shortText ?? event.text ?? '',
    };
  }).filter(event => event.minute > 0 || event.type !== 'other');
}

function mapStatistics(summary: any): MatchStatistic[] {
  const competition = summary.header?.competitions?.[0];
  const homeId = String(competition?.competitors?.find((item: any) => item.homeAway === 'home')?.team?.id ?? '');
  const awayId = String(competition?.competitors?.find((item: any) => item.homeAway === 'away')?.team?.id ?? '');
  const home = summary.boxscore?.teams?.find((item: any) => String(item.team?.id) === homeId)?.statistics ?? [];
  const away = summary.boxscore?.teams?.find((item: any) => String(item.team?.id) === awayId)?.statistics ?? [];
  const findValue = (list: any[], name: string) => list.find(item => item.name === name)?.displayValue ?? null;
  return STATISTIC_ORDER.map((name, index) => {
    const definition = home.find((item: any) => item.name === name) ?? away.find((item: any) => item.name === name);
    const label = name === 'totalShots' ? 'Total Shots'
      : name === 'shotsOnTarget' ? 'Shots on Target'
        : name === 'possessionPct' ? 'Possession %'
          : name === 'passPct' ? 'Pass Completion %'
            : definition?.label ?? name;
    return { key: `${index}:${name}`, label, homeValue: findValue(home, name), awayValue: findValue(away, name) };
  }).filter(stat => stat.homeValue != null || stat.awayValue != null);
}

function lineupRow(position: unknown, starterIndex: number): number {
  const value = String(position ?? '').toLocaleUpperCase();
  if (value === 'G' || value.includes('GOAL')) return 1;
  if (value.includes('B') || value.includes('DEF')) return 2;
  if (value.includes('M') || value.includes('W')) return 3;
  if (value.includes('F') || value.includes('ST')) return 4;
  return Math.floor(starterIndex / 3) + 1;
}

function mapLineupPlayer(raw: any, starterIndex: number): LineupPlayer {
  return {
    id: `espn:${raw.athlete?.id ?? raw.athlete?.displayName}`,
    name: raw.athlete?.displayName ?? 'Unknown',
    number: raw.jersey != null && Number.isFinite(Number(raw.jersey)) ? Number(raw.jersey) : null,
    position: raw.position?.displayName ?? raw.position?.abbreviation ?? null,
    grid: `${lineupRow(raw.position?.abbreviation ?? raw.position?.displayName, starterIndex)}:0`,
  };
}

function mapLineups(rawRosters: any[]): MatchLineup[] {
  return rawRosters.map(block => {
    const starters = (block.roster ?? []).filter((player: any) => player.starter);
    const substitutes = (block.roster ?? []).filter((player: any) => !player.starter);
    return {
      teamId: `espn:${block.team?.id}`,
      teamName: block.team?.displayName ?? 'Unknown',
      teamCrestUrl: block.team?.logos?.[0]?.href ?? null,
      formation: block.formation ?? null,
      coachName: block.coach?.displayName ?? null,
      starters: starters.map(mapLineupPlayer),
      substitutes: substitutes.map(mapLineupPlayer),
    };
  }).filter(lineup => lineup.starters.length > 0 || lineup.substitutes.length > 0);
}

function playerStat(raw: any, name: string): number {
  const value = raw.stats?.find((stat: any) => stat.name === name)?.value;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function mapPerformers(rawRosters: any[]): PlayerMatchPerformance[] {
  const players: PlayerMatchPerformance[] = [];
  for (const block of rawRosters) {
    for (const player of block.roster ?? []) {
      const goals = playerStat(player, 'totalGoals');
      const assists = playerStat(player, 'goalAssists');
      const shotsOnTarget = playerStat(player, 'shotsOnTarget');
      if (goals + assists + shotsOnTarget === 0) continue;
      players.push({
        playerId: `espn:${player.athlete?.id ?? player.athlete?.displayName}`,
        playerName: player.athlete?.displayName ?? 'Unknown',
        playerPhotoUrl: player.athlete?.headshot?.href ?? null,
        teamId: `espn:${block.team?.id}`,
        teamName: block.team?.displayName ?? 'Unknown',
        rating: null,
        minutes: null,
        goals,
        assists,
        shotsOnTarget,
        keyPasses: 0,
        tackles: playerStat(player, 'totalTackles'),
      });
    }
  }
  return players.sort((a, b) => (b.goals * 10 + b.assists * 4 + b.shotsOnTarget) - (a.goals * 10 + a.assists * 4 + a.shotsOnTarget)).slice(0, 6);
}

function numberFromStatistic(statistics: MatchStatistic[], name: string, side: 'home' | 'away'): number | null {
  const value = statistics.find(stat => stat.key.endsWith(`:${name}`))?.[side === 'home' ? 'homeValue' : 'awayValue'];
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSummary(match: Match, statistics: MatchStatistic[]): string[] {
  const summary: string[] = [];
  const score = match.fullTimeScore ?? match.currentScore;
  if (score?.home != null && score.away != null) {
    if (score.home === score.away) summary.push(`${match.homeTeamName} and ${match.awayTeamName} drew ${score.home}-${score.away}.`);
    else summary.push(`${score.home > score.away ? match.homeTeamName : match.awayTeamName} won ${score.home}-${score.away}.`);
  }
  const homeShots = numberFromStatistic(statistics, 'totalShots', 'home');
  const awayShots = numberFromStatistic(statistics, 'totalShots', 'away');
  if (homeShots != null && awayShots != null) summary.push(`Total shots: ${match.homeTeamName} ${homeShots}, ${match.awayTeamName} ${awayShots}.`);
  const homePossession = numberFromStatistic(statistics, 'possessionPct', 'home');
  const awayPossession = numberFromStatistic(statistics, 'possessionPct', 'away');
  if (homePossession != null && awayPossession != null) {
    const leader = homePossession >= awayPossession ? match.homeTeamName : match.awayTeamName;
    summary.push(`${leader} had more possession (${Math.max(homePossession, awayPossession)}%).`);
  }
  return summary;
}

async function findEspnSummary(match: Match): Promise<{ event: any; raw: any } | null> {
  if (!match.kickoffUtc) return null;
  const leagueCode = espnCodeForMatch(match);
  if (!leagueCode) return null;
  const kickoff = new Date(match.kickoffUtc);
  const dateKeys = [0, -86_400_000, 86_400_000].map(offset => dateKey(new Date(kickoff.getTime() + offset)));
  for (const date of dateKeys) {
    const scoreboard = await cachedEspnJson(`${BASE_URL}/${leagueCode}/scoreboard?dates=${date}&limit=100`)
      .catch(() => ({ events: [] }));
    const event = (scoreboard.events ?? []).find((candidate: any) => {
      const competition = candidate.competitions?.[0];
      const home = competition?.competitors?.find((team: any) => team.homeAway === 'home')?.team?.displayName;
      const away = competition?.competitors?.find((team: any) => team.homeAway === 'away')?.team?.displayName;
      return sameTeam(home, match.homeTeamName) && sameTeam(away, match.awayTeamName);
    });
    if (event?.id) {
      const raw = await cachedEspnJson(`${BASE_URL}/${leagueCode}/summary?event=${event.id}`);
      return { event, raw };
    }
  }
  return null;
}

interface TeamAverages {
  scored: number;
  conceded: number;
  sample: number;
}

function averagesForTeam(raw: any, teamId: string): TeamAverages | null {
  const group = (raw.lastFiveGames ?? []).find((item: any) => String(item.team?.id) === teamId);
  const results = (group?.events ?? []).map((item: any) => {
    const isHome = String(item.homeTeamId) === teamId;
    const scored = Number(isHome ? item.homeTeamScore : item.awayTeamScore);
    const conceded = Number(isHome ? item.awayTeamScore : item.homeTeamScore);
    return Number.isFinite(scored) && Number.isFinite(conceded) ? { scored, conceded } : null;
  }).filter(Boolean) as { scored: number; conceded: number }[];
  if (!results.length) return null;
  return {
    scored: results.reduce((total, item) => total + item.scored, 0) / results.length,
    conceded: results.reduce((total, item) => total + item.conceded, 0) / results.length,
    sample: results.length,
  };
}

function h2hAverages(raw: any, homeTeamId: string, awayTeamId: string): { home: number; away: number; sample: number } | null {
  const results = (raw.headToHeadGames?.events ?? []).map((item: any) => {
    const rawHomeId = String(item.homeTeamId);
    const rawAwayId = String(item.awayTeamId);
    const rawHomeScore = Number(item.homeTeamScore);
    const rawAwayScore = Number(item.awayTeamScore);
    if (!Number.isFinite(rawHomeScore) || !Number.isFinite(rawAwayScore)) return null;
    if (rawHomeId === homeTeamId && rawAwayId === awayTeamId) return { home: rawHomeScore, away: rawAwayScore };
    if (rawHomeId === awayTeamId && rawAwayId === homeTeamId) return { home: rawAwayScore, away: rawHomeScore };
    return null;
  }).filter(Boolean) as { home: number; away: number }[];
  if (!results.length) return null;
  return {
    home: results.reduce((total, item) => total + item.home, 0) / results.length,
    away: results.reduce((total, item) => total + item.away, 0) / results.length,
    sample: results.length,
  };
}

function poissonProbability(goals: number, expected: number): number {
  let factorial = 1;
  for (let value = 2; value <= goals; value += 1) factorial *= value;
  return Math.exp(-expected) * Math.pow(expected, goals) / factorial;
}

function outcomeProbabilities(homeExpected: number, awayExpected: number): { home: number; draw: number; away: number } {
  let home = 0;
  let draw = 0;
  let away = 0;
  for (let homeGoals = 0; homeGoals <= 8; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= 8; awayGoals += 1) {
      const probability = poissonProbability(homeGoals, homeExpected) * poissonProbability(awayGoals, awayExpected);
      if (homeGoals > awayGoals) home += probability;
      else if (homeGoals < awayGoals) away += probability;
      else draw += probability;
    }
  }
  const total = home + draw + away;
  const homePercent = Math.round(home / total * 100);
  const drawPercent = Math.round(draw / total * 100);
  return { home: homePercent, draw: drawPercent, away: 100 - homePercent - drawPercent };
}

function buildPrediction(match: Match, event: any, raw: any): MatchPrediction | null {
  const competition = event.competitions?.[0];
  const homeTeamId = String(competition?.competitors?.find((team: any) => team.homeAway === 'home')?.team?.id ?? '');
  const awayTeamId = String(competition?.competitors?.find((team: any) => team.homeAway === 'away')?.team?.id ?? '');
  if (!homeTeamId || !awayTeamId) return null;
  const home = averagesForTeam(raw, homeTeamId);
  const away = averagesForTeam(raw, awayTeamId);
  if (!home || !away) return null;

  let homeExpected = home.scored * 0.55 + away.conceded * 0.45 + 0.1;
  let awayExpected = away.scored * 0.55 + home.conceded * 0.45;
  const h2h = h2hAverages(raw, homeTeamId, awayTeamId);
  if (h2h) {
    homeExpected = homeExpected * 0.8 + h2h.home * 0.2;
    awayExpected = awayExpected * 0.8 + h2h.away * 0.2;
  }
  homeExpected = Math.max(0.2, Math.min(4.5, homeExpected));
  awayExpected = Math.max(0.2, Math.min(4.5, awayExpected));
  const probabilities = outcomeProbabilities(homeExpected, awayExpected);
  const sampleSize = home.sample + away.sample + (h2h?.sample ?? 0);
  return {
    matchId: match.id,
    predictedHomeGoals: Math.round(homeExpected),
    predictedAwayGoals: Math.round(awayExpected),
    homeWinPercent: probabilities.home,
    drawPercent: probabilities.draw,
    awayWinPercent: probabilities.away,
    confidencePercent: Math.round(Math.max(38, Math.min(70, 38 + sampleSize * 2))),
    advice: null,
    goalRange: homeExpected + awayExpected >= 2.7 ? 'Over 2.5' : 'Under 3.5',
    source: 'statistical_model',
    sampleSize,
    generatedAtUtc: new Date().toISOString(),
  };
}

function espnDateKey(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function statusFromEspn(typeObj: any, completed: boolean): MatchStatus {
  const name = String(typeObj?.name ?? '').toUpperCase();
  const state = String(typeObj?.state ?? '').toLowerCase();
  if (name.includes('POSTPON')) return 'postponed';
  if (name.includes('CANCEL')) return 'cancelled';
  if (name.includes('ABANDON')) return 'abandoned';
  if (name.includes('SUSPEND') || name.includes('DELAY')) return 'suspended';
  if (name.includes('HALFTIME')) return 'half_time';
  if (state === 'pre') return 'scheduled';
  if (state === 'in') return 'live';
  if (state === 'post') return completed ? 'finished' : 'postponed';
  return 'scheduled';
}

function espnElapsed(status: any): number | null {
  if (String(status?.type?.state ?? '') !== 'in') return null;
  const fromClock = parseInt(String(status?.displayClock ?? '').replace(/[^0-9]/g, ''), 10);
  if (Number.isFinite(fromClock) && fromClock > 0) return fromClock;
  const period = Number(status?.period);
  return Number.isFinite(period) && period > 0 ? (period - 1) * 45 + 1 : null;
}

const ESPN_KNOCKOUT_PATTERN = /final|semi|quarter|round of|knockout|play-?off|leg/i;

function mapScoreboardEvent(event: any, leagueCode: string, leagueName: string | null): Match | null {
  const competition = event.competitions?.[0];
  if (!competition) return null;
  const competitors: any[] = competition.competitors ?? [];
  const home = competitors.find(c => c.homeAway === 'home');
  const away = competitors.find(c => c.homeAway === 'away');
  if (!home?.team || !away?.team) return null;

  const catalog = COMPETITION_BY_ESPN_CODE.get(leagueCode);
  const status = competition.status ?? event.status ?? {};
  const domainStatus = statusFromEspn(status.type, status.type?.completed === true);
  const homeScore = home.score != null && home.score !== '' ? Number(home.score) : null;
  const awayScore = away.score != null && away.score !== '' ? Number(away.score) : null;
  const hasScore = homeScore != null || awayScore != null;
  const score = hasScore ? { home: homeScore, away: awayScore } : null;
  const kickoffIso = event.date ? new Date(event.date).toISOString() : null;
  const noteHeadline = String(competition.notes?.[0]?.headline ?? event.season?.slug ?? '');
  const isKnockout = !!catalog?.knockout || ESPN_KNOCKOUT_PATTERN.test(noteHeadline);

  const homeName = home.team.displayName ?? home.team.name ?? 'Home';
  const awayName = away.team.displayName ?? away.team.name ?? 'Away';
  const crest = (team: any): string | null => team.logo ?? team.logos?.[0]?.href ?? null;

  return {
    id: `espn:${event.id}`,
    providerId: 'espn',
    providerMatchId: String(event.id),
    competitionId: catalog?.canonicalId ?? `espn:${leagueCode}`,
    competitionName: catalog?.canonicalName ?? leagueName ?? event.leagues?.[0]?.name ?? 'Football',
    competitionEmblemUrl: event.leagues?.[0]?.logos?.[0]?.href ?? null,
    country: null,
    season: event.season?.year != null ? String(event.season.year) : null,
    stage: competition.notes?.[0]?.headline ?? null,
    round: competition.notes?.[0]?.headline ?? null,
    matchweek: null,
    homeTeamId: `espn:${home.team.id}`,
    homeTeamName: homeName,
    homeTeamInitials: (home.team.abbreviation ?? homeName.slice(0, 3)).toUpperCase(),
    homeTeamCrestUrl: crest(home.team),
    awayTeamId: `espn:${away.team.id}`,
    awayTeamName: awayName,
    awayTeamInitials: (away.team.abbreviation ?? awayName.slice(0, 3)).toUpperCase(),
    awayTeamCrestUrl: crest(away.team),
    kickoffUtc: kickoffIso,
    kickoffUnknown: !kickoffIso,
    status: domainStatus,
    statusDetail: status.type?.shortDetail ?? status.type?.description ?? null,
    elapsedMinutes: espnElapsed(status),
    injuryTimeMinutes: null,
    halfTimeScore: null,
    fullTimeScore: domainStatus === 'finished' ? score : null,
    extraTimeScore: null,
    penaltyScore: null,
    currentScore: score,
    winner: home.winner === true ? 'home' : away.winner === true ? 'away'
      : (homeScore != null && awayScore != null
        ? (homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw')
        : null),
    venue: competition.venue?.fullName ?? null,
    referee: null,
    attendance: Number.isFinite(Number(competition.attendance)) ? Number(competition.attendance) : null,
    lastProviderUpdateUtc: new Date().toISOString(),
    isKnockout,
    extraTimePossible: isKnockout,
    attribution: 'ESPN',
    sourceIds: ['espn'],
    catalogKey: catalog?.key ?? null,
  };
}

async function cachedEspnScoreboard(leagueCode: string, date: Date): Promise<any> {
  const key = espnDateKey(date);
  const cacheKey = cacheKeys.espnScoreboard(leagueCode, key);
  const isToday = key === espnDateKey(new Date());
  const cached = await readCache<any>(cacheKey).catch(() => null);
  if (cached && !cached.isStale) return cached.payload;
  try {
    const data = await fetchJson<any>('espn', `${BASE_URL}/${leagueCode}/scoreboard?dates=${key}&limit=100`);
    await writeCache(
      cacheKey,
      'espn',
      data,
      isToday ? CACHE_TTL_MS.espnScoreboardLive : CACHE_TTL_MS.espnScoreboardIdle,
    ).catch(() => undefined);
    return data;
  } catch (error) {
    if (cached) return cached.payload;
    throw error;
  }
}

class EspnProvider implements FootballDataProvider {
  readonly id = 'espn' as const;
  readonly displayName = 'ESPN';
  readonly capabilities = ESPN_CAPABILITIES;

  isConfigured(): boolean { return true; }
  async getCompetitions(): Promise<Competition[]> { return []; }

  async getMatches(query: MatchesQuery): Promise<Match[]> {
    const keys = query.competitionProviderIds?.length
      ? query.competitionProviderIds
      : [...DEFAULT_COMPETITION_KEYS];
    const codes = [...new Set(
      keys.map(key => COMPETITION_BY_KEY.get(key)?.espnCode).filter((c): c is string => !!c),
    )];
    if (codes.length === 0) return [];

    const days: Date[] = [];
    let cursor = new Date(query.dateFromUtc.slice(0, 10));
    const end = new Date(query.dateToUtc.slice(0, 10));
    while (cursor <= end && days.length < MAX_ESPN_RANGE_DAYS) {
      days.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + 86_400_000);
    }

    const pairs = codes.flatMap(code => days.map(day => ({ code, day })));
    const rangeStart = new Date(query.dateFromUtc).getTime();
    const rangeEnd = new Date(query.dateToUtc).getTime();

    const grouped = await mapWithConcurrency(pairs, 6, async ({ code, day }) => {
      const data = await cachedEspnScoreboard(code, day).catch(() => ({ events: [], leagues: [] }));
      const leagueName = data.leagues?.[0]?.name ?? null;
      return (data.events ?? [])
        .map((event: any) => mapScoreboardEvent(event, code, leagueName))
        .filter((match: Match | null): match is Match => !!match);
    });

    const seen = new Set<string>();
    return grouped.flat().filter(match => {
      if (seen.has(match.id)) return false;
      seen.add(match.id);
      if (!match.kickoffUtc) return true;
      const kickoff = new Date(match.kickoffUtc).getTime();
      return kickoff >= rangeStart && kickoff <= rangeEnd;
    });
  }

  async getMatch(): Promise<Match | null> {
    return null;
  }
  async getStandings(): Promise<StandingRow[]> { return []; }
  async getTeams(): Promise<Team[]> { return []; }
  async getTeam(): Promise<Team | null> { return null; }
  async getHeadToHead(): Promise<HeadToHeadResult> { return { matches: [], totalMeetings: 0 }; }
  async getForm(): Promise<FormResult> { return { lastFive: [], homeForm: [], awayForm: [] }; }

  async getPrediction(_providerMatchId: string, match?: Match): Promise<MatchPrediction | null> {
    if (!match || match.status !== 'scheduled') return null;
    const found = await findEspnSummary(match);
    return found ? buildPrediction(match, found.event, found.raw) : null;
  }

  async getMatchAnalysis(_providerMatchId: string, match?: Match): Promise<MatchAnalysis | null> {
    if (!match) return null;
    const found = await findEspnSummary(match);
    if (!found) return null;
    const { event, raw } = found;
    const statistics = mapStatistics(raw);
    const timeline = mapEvents(raw.keyEvents ?? raw.commentary ?? [], String(event.id));
    const lineups = mapLineups(raw.rosters ?? []);
    const topPerformers = mapPerformers(raw.rosters ?? []);
    const hasExtendedData = statistics.length > 0 || timeline.length > 0 || lineups.length > 0 || topPerformers.length > 0;
    if (!hasExtendedData) return null;
    return {
      matchId: match.id,
      providerId: this.id,
      events: timeline,
      statistics,
      lineups,
      topPerformers,
      summary: buildSummary(match, statistics),
      hasExtendedData,
      generatedAtUtc: new Date().toISOString(),
    };
  }
}

export const espnProvider = new EspnProvider();
