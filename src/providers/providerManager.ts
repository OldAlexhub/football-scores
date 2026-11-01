import {toLocalDateKey} from '../utils/dates';
import type { Competition, Match, MatchAnalysis, MatchPrediction, ProviderId, StandingRow, Team } from '../types/domain';
import { readCache, writeCache } from '../storage/repositories/providerCacheRepo';
import { serverRequest, type ApiEnvelope, type CoverageRow } from '../services/serverApi';
import type { MatchesQuery, HeadToHeadResult, FormResult } from './types';
import { COMPETITION_BY_KEY } from '../config/competitionCatalog';
import i18n from '../i18n';
import { track } from '../services/telemetry';

export const LIVE_PROVIDERS = [{ id: 'server' as const, displayName: 'Football Scores · Open data', capabilities: { requiresApiKey: false }, isConfigured: () => true }];
export interface ProviderHealth { providerId: ProviderId; lastSuccessAtUtc: string | null; lastFailureAtUtc: string | null; lastErrorMessage: string | null }
const health: ProviderHealth = { providerId: 'server', lastSuccessAtUtc: null, lastFailureAtUtc: null, lastErrorMessage: null };
export function getProviderHealth(): ProviderHealth[] { return [health]; }
export interface SourcedResult<T> { data: T; providerId: ProviderId; isFromCache: boolean; isStale: boolean; errorMessage: string | null; coverage?: CoverageRow[]; importPending?: boolean }
let lastRefresh = 0;
export function canManualRefresh() { return Date.now() - lastRefresh > 20000; }
export function markManualRefresh() { lastRefresh = Date.now(); }
async function cached<T>(key: string, request: () => Promise<ApiEnvelope<T>>, empty: T, ttl = 300000, force = false): Promise<SourcedResult<T>> {
  const cacheKey = `server:v1:${key}`;
  const stored = await readCache<ApiEnvelope<T>>(cacheKey);
  if (!force && stored && !stored.isStale && !stored.payload.meta.importPending) { track('cache_hit'); return { data: stored.payload.data, providerId: 'server', isFromCache: true, isStale: !!stored.payload.meta.isStale, errorMessage: stored.payload.meta.partial ? i18n.t('makeover.partialCoverage') : null, importPending: stored.payload.meta.importPending, coverage: stored.payload.meta.coverage }; }
  try {
    track('cache_miss');
    const result = await request();
    health.lastSuccessAtUtc = new Date().toISOString(); health.lastErrorMessage = null;
    await writeCache(cacheKey, 'server', result, ttl);
    return { data: result.data, providerId: 'server', isFromCache: false, isStale: !!result.meta.isStale, errorMessage: result.meta.partial ? i18n.t('makeover.partialCoverage') : result.meta.reason || null, importPending: result.meta.importPending, coverage: result.meta.coverage };
  } catch {
    health.lastFailureAtUtc = new Date().toISOString(); health.lastErrorMessage = 'server_unavailable';
    return { data: stored?.payload.data ?? empty, providerId: 'cached', isFromCache: true, isStale: true, errorMessage: i18n.t('makeover.offline'), coverage: stored?.payload.meta.coverage };
  }
}
export async function fetchMatches(query: MatchesQuery): Promise<SourcedResult<Match[]>> {
  const keys = query.competitionProviderIds ?? [];
  const suffix = keys.length === 1 ? `&competition=${encodeURIComponent(COMPETITION_BY_KEY.get(keys[0])?.canonicalId || keys[0])}` : '';
  return cached(`fixtures:${query.dateFromUtc}:${query.dateToUtc}:${keys.join(',')}`, async () => {
    let offset: number | null = 0; const matches: Match[] = []; let result: ApiEnvelope<Match[]>;
    do {
      result = await serverRequest<ApiEnvelope<Match[]>>(`/fixtures?from=${encodeURIComponent(query.dateFromUtc)}&to=${encodeURIComponent(query.dateToUtc)}&localFrom=${toLocalDateKey(query.dateFromUtc)}&localTo=${toLocalDateKey(query.dateToUtc)}${suffix}&limit=1000&offset=${offset}`);
      matches.push(...result.data); offset = result.meta.nextOffset ?? null;
    } while (offset !== null && offset < 20000);
    const selected = new Set(keys.flatMap(k => [k, COMPETITION_BY_KEY.get(k)?.canonicalId || k]));
    const data = keys.length > 1 ? matches.filter(m => selected.has(m.competitionId) || selected.has(m.catalogKey || '')) : matches;
    for (const match of data) await writeCache(`server:match:${match.id}`, 'server', match, 86400000);
    return { data, meta: result!.meta };
  }, [], 120000, query.forceRefresh);
}
export const fetchCompetitions = () => cached<Competition[]>('competitions', () => serverRequest('/competitions'), [], 86400000);
export const fetchStandings = (id: string, season?: string) => cached<StandingRow[]>(`standings:${id}:${season || ''}`, () => serverRequest(`/standings/${encodeURIComponent(id)}${season ? `?season=${season}` : ''}`), []);
export const fetchTeams = (id: string) => cached<Team[]>(`teams:${id}`, () => serverRequest(`/teams?competition=${encodeURIComponent(id)}`), [], 86400000);
export const fetchHeadToHead = (home: string, away: string) => cached<HeadToHeadResult>(`h2h:${home}:${away}`, () => serverRequest(`/insights?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}`), { matches: [], totalMeetings: 0 });
export const fetchForm = (id: string) => cached<FormResult>(`form:${id}`, () => serverRequest(`/insights?home=${encodeURIComponent(id)}`), { lastFive: [], homeForm: [], awayForm: [] });
export async function resolveMatchById(id: string): Promise<Match | null> {
  const result = await cached<Match | null>(`match:${id}`, () => serverRequest(`/fixtures/${encodeURIComponent(id)}`), null, 60000);
  return result.data || (await readCache<Match>(`server:match:${id}`))?.payload || null;
}
export function reconcileMatchId(staleId: string, fresh: Match[]): Match | null {
  const exact = fresh.find(m => m.id === staleId); if (exact) return exact;
  if (staleId.startsWith('openfootball:')) { const p = staleId.split(':'); return fresh.find(m => m.fixtureDate === p[2] && m.homeTeamName === p[3] && m.awayTeamName === p.slice(4).join(':')) ?? null; }
  return null;
}
export const resolveTeamById = async (id: string) => (await cached<Team | null>(`team:${id}`, () => serverRequest(`/teams/${encodeURIComponent(id)}`), null, 86400000)).data;
export async function fetchMatchPrediction(_match: Match): Promise<MatchPrediction | null> { return null; }
export async function fetchMatchAnalysis(_match: Match): Promise<MatchAnalysis | null> { return null; }
