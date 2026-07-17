import { writeCache } from '../storage/repositories/providerCacheRepo';
import type { Competition, Match, ProviderId, StandingRow, Team } from '../types/domain';
import { apiFootballProvider } from './apiFootballProvider';
import { cacheKeys, CACHE_TTL_MS } from './cacheKeys';
import { cachedProvider } from './cachedProvider';
import { footballDataOrgProvider } from './footballDataOrgProvider';
import { openFootballProvider } from './openFootballProvider';
import type { FootballDataProvider, FormResult, HeadToHeadResult, MatchesQuery } from './types';
import { ProviderError } from './types';

export const LIVE_PROVIDERS: FootballDataProvider[] = [
  footballDataOrgProvider,
  apiFootballProvider,
  openFootballProvider,
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

const MANUAL_REFRESH_COOLDOWN_MS = 20 * 1000;
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
  ttlMs: number,
): Promise<SourcedResult<T>> {
  let lastError: string | null = null;

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
      await writeCache(cacheKey, provider.id, result, ttlMs);
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
  return withFallback(
    'schedules',
    provider => provider.getMatches(query),
    result => result.length === 0,
    cacheKeys.matches(query.dateFromUtc, query.dateToUtc),
    CACHE_TTL_MS.upcomingFixtures,
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
