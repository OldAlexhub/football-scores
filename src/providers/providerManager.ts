import { readCache, writeCache } from '../storage/repositories/providerCacheRepo';
import type { Competition, Match, MatchAnalysis, MatchPrediction, ProviderId, StandingRow, Team } from '../types/domain';
import { apiFootballProvider } from './apiFootballProvider';
import { cacheKeys, CACHE_TTL_MS } from './cacheKeys';
import { cachedProvider } from './cachedProvider';
import { footballDataOrgProvider } from './footballDataOrgProvider';
import { openFootballProvider } from './openFootballProvider';
import { theSportsDbProvider } from './theSportsDbProvider';
import { espnProvider } from './espnProvider';
import type { FootballDataProvider, FormResult, HeadToHeadResult, MatchesQuery } from './types';
import { ProviderError } from './types';

export const LIVE_PROVIDERS: FootballDataProvider[] = [
  apiFootballProvider,
  footballDataOrgProvider,
  openFootballProvider,
  theSportsDbProvider,
  espnProvider,
];

export interface ProviderHealth {
  providerId: ProviderId;
  lastSuccessAtUtc: string | null;
  lastFailureAtUtc: string | null;
  lastErrorMessage: string | null;
}

const health: Record<ProviderId, ProviderHealth> = {
  'football-data-org': { providerId: 'football-data-org', lastSuccessAtUtc: null, lastFailureAtUtc: null, lastErrorMessage: null },
  'api-football': { providerId: 'api-football', lastSuccessAtUtc: null, lastFailureAtUtc: null, lastErrorMessage: null },
  openfootball: { providerId: 'openfootball', lastSuccessAtUtc: null, lastFailureAtUtc: null, lastErrorMessage: null },
  thesportsdb: { providerId: 'thesportsdb', lastSuccessAtUtc: null, lastFailureAtUtc: null, lastErrorMessage: null },
  espn: { providerId: 'espn', lastSuccessAtUtc: null, lastFailureAtUtc: null, lastErrorMessage: null },
  cached: { providerId: 'cached', lastSuccessAtUtc: null, lastFailureAtUtc: null, lastErrorMessage: null },
};

export function getProviderHealth(): ProviderHealth[] {
  return Object.values(health);
}

function recordSuccess(providerId: ProviderId): void {
  health[providerId].lastSuccessAtUtc = new Date().toISOString();
}

function recordFailure(providerId: ProviderId, message: string): void {
  health[providerId].lastFailureAtUtc = new Date().toISOString();
  health[providerId].lastErrorMessage = message;
}

export interface SourcedResult<T> {
  data: T;
  providerId: ProviderId;
  isFromCache: boolean;
  isStale: boolean;
  errorMessage: string | null;
}

const MANUAL_REFRESH_COOLDOWN_MS = 60 * 1000;
let lastManualRefreshAt = 0;

export function canManualRefresh(): boolean {
  return Date.now() - lastManualRefreshAt >= MANUAL_REFRESH_COOLDOWN_MS;
}

export function markManualRefresh(): void {
  lastManualRefreshAt = Date.now();
}

/**
 * Tries each configured live provider in priority order for a single
 * capability. The first provider to return a non-empty result wins — this
 * app deliberately never merges two providers' records for one query, since
 * safe reconciliation across differing IDs and field coverage isn't
 * guaranteed. On total failure, falls back to the last cached payload.
 */
async function withFallback<T>(
  capability: keyof FootballDataProvider['capabilities'],
  attempt: (provider: FootballDataProvider) => Promise<T>,
  isEmpty: (result: T) => boolean,
  cacheKey: string,
  ttlMs: number | ((result: T) => number),
  bypassFreshCache = false,
): Promise<SourcedResult<T>> {
  let lastError: string | null = null;

  if (!bypassFreshCache) {
    const cached = await readCache<T>(cacheKey);
    if (cached && !cached.isStale && !isEmpty(cached.payload)) {
      return {
        data: cached.payload,
        providerId: cached.providerId,
        isFromCache: true,
        isStale: false,
        errorMessage: null,
      };
    }
  }

  for (const provider of LIVE_PROVIDERS) {
    if (!provider.capabilities[capability] || !provider.isConfigured()) {
      continue;
    }
    try {
      const result = await attempt(provider);
      if (isEmpty(result)) {
        continue;
      }
      recordSuccess(provider.id);
      await writeCache(cacheKey, provider.id, result, typeof ttlMs === 'function' ? ttlMs(result) : ttlMs);
      return { data: result, providerId: provider.id, isFromCache: false, isStale: false, errorMessage: null };
    } catch (error) {
      const message = error instanceof ProviderError ? error.message : 'Unknown provider error';
      recordFailure(provider.id, message);
      lastError = message;
    }
  }

  const fallback = await attempt(cachedProvider).catch(() => null);
  if (fallback && !isEmpty(fallback)) {
    return { data: fallback, providerId: 'cached', isFromCache: true, isStale: true, errorMessage: lastError };
  }

  return {
    data: (Array.isArray(fallback) ? [] : fallback) as T,
    providerId: 'cached',
    isFromCache: true,
    isStale: true,
    errorMessage: lastError,
  };
}

export async function fetchMatches(query: MatchesQuery): Promise<SourcedResult<Match[]>> {
  const requestedDay = query.dateFromUtc.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return withFallback(
    'schedules',
    provider => provider.getMatches(query),
    result => result.length === 0,
    cacheKeys.matches(query.dateFromUtc, query.dateToUtc, query.competitionProviderIds),
    result => result.some(match => match.status === 'live' || match.status === 'half_time')
      ? CACHE_TTL_MS.liveFixtures
      : requestedDay === today
        ? CACHE_TTL_MS.todayFixtures
        : CACHE_TTL_MS.upcomingFixtures,
    query.forceRefresh === true,
  );
}

export async function fetchCompetitions(): Promise<SourcedResult<Competition[]>> {
  return withFallback(
    'competitionMetadata',
    provider => provider.getCompetitions(),
    result => result.length === 0,
    cacheKeys.competitions(),
    CACHE_TTL_MS.competitionMetadata,
  );
}

export async function fetchStandings(competitionProviderId: string, season?: string): Promise<SourcedResult<StandingRow[]>> {
  return withFallback(
    'standings',
    provider => provider.getStandings(competitionProviderId, season),
    result => result.length === 0,
    cacheKeys.standings(competitionProviderId),
    CACHE_TTL_MS.standings,
  );
}

export async function fetchTeams(competitionProviderId: string): Promise<SourcedResult<Team[]>> {
  return withFallback(
    'teams',
    provider => provider.getTeams(competitionProviderId),
    result => result.length === 0,
    cacheKeys.teams(competitionProviderId),
    CACHE_TTL_MS.teamMetadata,
  );
}

export async function fetchHeadToHead(homeTeamProviderId: string, awayTeamProviderId: string): Promise<SourcedResult<HeadToHeadResult>> {
  return withFallback(
    'headToHead',
    provider => provider.getHeadToHead(homeTeamProviderId, awayTeamProviderId),
    result => result.matches.length === 0,
    cacheKeys.headToHead(homeTeamProviderId, awayTeamProviderId),
    CACHE_TTL_MS.recentResults,
  );
}

export async function fetchForm(teamProviderId: string): Promise<SourcedResult<FormResult>> {
  return withFallback(
    'form',
    provider => provider.getForm(teamProviderId),
    result => result.lastFive.length === 0,
    cacheKeys.form(teamProviderId),
    CACHE_TTL_MS.recentResults,
  );
}

/**
 * A domain Match id is always `${providerId}:${providerMatchId}`. Since only
 * football-data.org and API-Football expose a single-match lookup, this
 * routes straight to the originating provider rather than trying every
 * provider in priority order.
 */
export async function resolveMatchById(matchId: string): Promise<Match | null> {
  const separatorIndex = matchId.indexOf(':');
  if (separatorIndex === -1) return null;
  const providerId = matchId.slice(0, separatorIndex) as ProviderId;
  const providerMatchId = matchId.slice(separatorIndex + 1);

  const provider = LIVE_PROVIDERS.find(p => p.id === providerId);
  if (provider && provider.isConfigured()) {
    try {
      const match = await provider.getMatch(providerMatchId);
      if (match) return match;
    } catch {
      // fall through to cache below
    }
  }
  return null;
}

export async function resolveTeamById(teamId: string): Promise<Team | null> {
  const separatorIndex = teamId.indexOf(':');
  if (separatorIndex === -1) return null;
  const providerId = teamId.slice(0, separatorIndex) as ProviderId;
  const providerTeamId = teamId.slice(separatorIndex + 1);
  const provider = LIVE_PROVIDERS.find(item => item.id === providerId);
  if (!provider?.isConfigured()) return null;
  try {
    return await provider.getTeam(providerTeamId);
  } catch {
    return null;
  }
}

function providerIdPart(domainId: string): string {
  const separator = domainId.indexOf(':');
  return separator === -1 ? domainId : domainId.slice(separator + 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formStrength(form: FormResult): { strength: number; sample: number } {
  const results = form.lastFive;
  if (results.length === 0) return { strength: 0.5, sample: 0 };
  const points = results.reduce((total, result) => total + (result === 'W' ? 3 : result === 'D' ? 1 : 0), 0);
  return { strength: points / (results.length * 3), sample: results.length };
}

function statisticalPrediction(
  match: Match,
  homeForm: FormResult,
  awayForm: FormResult,
  headToHead: HeadToHeadResult,
): MatchPrediction | null {
  const home = formStrength(homeForm);
  const away = formStrength(awayForm);
  const scoredMeetings = headToHead.matches.filter(item => item.fullTimeScore?.home != null && item.fullTimeScore.away != null);
  const sampleSize = home.sample + away.sample + scoredMeetings.length;
  if (sampleSize === 0) return null;

  const h2hHomeAverage = scoredMeetings.length
    ? scoredMeetings.reduce((total, item) => total + (item.fullTimeScore?.home ?? 0), 0) / scoredMeetings.length
    : 1.35;
  const h2hAwayAverage = scoredMeetings.length
    ? scoredMeetings.reduce((total, item) => total + (item.fullTimeScore?.away ?? 0), 0) / scoredMeetings.length
    : 1.1;
  const strengthDifference = home.strength - away.strength;
  const homeExpected = clamp(h2hHomeAverage + strengthDifference * 0.9 + 0.18, 0.2, 4.5);
  const awayExpected = clamp(h2hAwayAverage - strengthDifference * 0.75, 0.2, 4.5);

  const drawPercent = clamp(29 - Math.abs(strengthDifference) * 14, 17, 31);
  const homeWinRaw = clamp(49 + strengthDifference * 42, 19, 75);
  const awayWinRaw = clamp(100 - drawPercent - homeWinRaw, 12, 68);
  const scale = (100 - drawPercent) / (homeWinRaw + awayWinRaw);
  const homeWinPercent = Math.round(homeWinRaw * scale);
  const awayWinPercent = 100 - Math.round(drawPercent) - homeWinPercent;

  return {
    matchId: match.id,
    predictedHomeGoals: Math.round(homeExpected),
    predictedAwayGoals: Math.round(awayExpected),
    homeWinPercent,
    drawPercent: Math.round(drawPercent),
    awayWinPercent,
    confidencePercent: Math.round(clamp(35 + sampleSize * 2.5, 35, 68)),
    advice: null,
    goalRange: homeExpected + awayExpected >= 2.7 ? 'Over 2.5' : 'Under 3.5',
    source: 'statistical_model',
    sampleSize,
    generatedAtUtc: new Date().toISOString(),
  };
}

export async function fetchMatchPrediction(match: Match): Promise<MatchPrediction | null> {
  const cacheKey = cacheKeys.prediction(match.id);
  const cached = await readCache<MatchPrediction>(cacheKey);
  if (cached && !cached.isStale) return cached.payload;

  const provider = LIVE_PROVIDERS.find(item => item.id === match.providerId);
  if (!provider || !provider.isConfigured()) return cached?.payload ?? null;

  if (provider.getPrediction) {
    try {
      const prediction = await provider.getPrediction(match.providerMatchId, match);
      if (prediction) {
        await writeCache(cacheKey, provider.id, prediction, CACHE_TTL_MS.prediction);
        return prediction;
      }
    } catch { /* Try the cross-provider statistical fallback below. */ }
  }

  try {
    const [homeForm, awayForm, headToHead] = await Promise.all([
      provider.getForm(providerIdPart(match.homeTeamId)),
      provider.getForm(providerIdPart(match.awayTeamId)),
      provider.getHeadToHead(providerIdPart(match.homeTeamId), providerIdPart(match.awayTeamId)),
    ]);
    const prediction = statisticalPrediction(match, homeForm, awayForm, headToHead);
    if (prediction) {
      await writeCache(cacheKey, provider.id, prediction, CACHE_TTL_MS.prediction);
      return prediction;
    }
  } catch { /* Try ESPN's keyless recent-form feed next. */ }

  if (provider.id !== 'espn' && espnProvider.getPrediction) {
    try {
      const prediction = await espnProvider.getPrediction('', match);
      if (prediction) {
        await writeCache(cacheKey, espnProvider.id, prediction, CACHE_TTL_MS.prediction);
        recordSuccess(espnProvider.id);
        return prediction;
      }
    } catch (error) {
      recordFailure(espnProvider.id, error instanceof Error ? error.message : 'Prediction unavailable');
    }
  }
  return cached?.payload ?? null;
}

function minimalFinishedAnalysis(match: Match): MatchAnalysis | null {
  if (match.status !== 'finished') return null;
  const score = match.fullTimeScore ?? match.currentScore;
  const summary: string[] = [];
  if (score?.home != null && score.away != null) {
    if (score.home === score.away) summary.push(`${match.homeTeamName} and ${match.awayTeamName} drew ${score.home}-${score.away}.`);
    else summary.push(`${score.home > score.away ? match.homeTeamName : match.awayTeamName} won ${score.home}-${score.away}.`);
  }
  return {
    matchId: match.id,
    providerId: match.providerId,
    events: [],
    statistics: [],
    lineups: [],
    topPerformers: [],
    summary,
    hasExtendedData: false,
    generatedAtUtc: new Date().toISOString(),
  };
}

export async function fetchMatchAnalysis(match: Match): Promise<MatchAnalysis | null> {
  const cacheKey = cacheKeys.analysis(match.id);
  const cached = await readCache<MatchAnalysis>(cacheKey);
  if (cached && !cached.isStale) return cached.payload;
  const sourceProvider = LIVE_PROVIDERS.find(item => item.id === match.providerId);
  const providers = [sourceProvider, espnProvider]
    .filter((provider, index, list): provider is FootballDataProvider => !!provider && list.indexOf(provider) === index)
    .filter(provider => provider.isConfigured() && !!provider.getMatchAnalysis);
  for (const provider of providers) {
    try {
      const analysis = await provider.getMatchAnalysis?.(provider.id === match.providerId ? match.providerMatchId : '', match);
      if (analysis) {
        const ttl = match.status === 'live' || match.status === 'half_time'
          ? CACHE_TTL_MS.liveMatchAnalysis
          : match.status === 'scheduled'
            ? CACHE_TTL_MS.preMatchAnalysis
            : CACHE_TTL_MS.matchAnalysis;
        await writeCache(cacheKey, provider.id, analysis, ttl);
        recordSuccess(provider.id);
        return analysis;
      }
    } catch (error) {
      recordFailure(provider.id, error instanceof Error ? error.message : 'Analysis unavailable');
    }
  }
  return cached?.payload ?? minimalFinishedAnalysis(match);
}
