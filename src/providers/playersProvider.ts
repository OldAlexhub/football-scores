import { readCache, writeCache } from '../storage/repositories/providerCacheRepo';
import type { PlayerProfile, PlayerSearchResult } from '../types/domain';
import { CACHE_TTL_MS, cacheKeys } from './cacheKeys';
import { fetchJson } from './httpClient';
import { normalizeTitle } from './newsDedupe';
import { theSportsDbProvider } from './theSportsDbProvider';

export interface PlayerLookupOptions {
  language?: 'en' | 'ar';
  forceRefresh?: boolean;
}

interface WikipediaSummary {
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
  type?: string;
}

async function wikipediaSummary(name: string, lang: 'en' | 'ar'): Promise<WikipediaSummary | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/\s+/g, '_'))}`;
  try {
    const data = await fetchJson<WikipediaSummary>('cached', url, { timeoutMs: 8000 });
    if (data?.type === 'disambiguation') return null;
    return data ?? null;
  } catch {
    return null;
  }
}

export async function searchPlayers(name: string): Promise<PlayerSearchResult[]> {
  const query = name.trim();
  if (query.length < 2) return [];

  const cacheKey = cacheKeys.playerSearch(query);
  const cached = await readCache<PlayerSearchResult[]>(cacheKey).catch(() => null);
  if (cached && !cached.isStale) return cached.payload;

  let results: PlayerSearchResult[] = [];
  try {
    results = (await theSportsDbProvider.getPlayerSearch?.(query)) ?? [];
  } catch {
    results = [];
  }

  const seen = new Set<string>();
  const deduped = results.filter(player => {
    const key = normalizeTitle(player.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);

  if (deduped.length > 0) {
    await writeCache(cacheKey, 'thesportsdb', deduped, CACHE_TTL_MS.playerSearch).catch(() => undefined);
    return deduped;
  }
  return cached?.payload ?? [];
}

export async function getPlayerProfile(playerId: string, options: PlayerLookupOptions = {}): Promise<PlayerProfile | null> {
  const cacheKey = cacheKeys.playerProfile(playerId);
  const cached = await readCache<PlayerProfile>(cacheKey).catch(() => null);
  if (!options.forceRefresh && cached && !cached.isStale) return cached.payload;

  let base: PlayerProfile | null = null;
  try {
    base = (await theSportsDbProvider.getPlayerProfile?.(playerId)) ?? null;
  } catch {
    base = null;
  }
  if (!base) return cached?.payload ?? null;

  const lang = options.language === 'ar' ? 'ar' : 'en';
  const wiki = (await wikipediaSummary(base.name, lang)) ?? (lang !== 'en' ? await wikipediaSummary(base.name, 'en') : null);

  const merged: PlayerProfile = { ...base };
  if (wiki) {
    const page = wiki.content_urls?.desktop?.page ?? null;
    if ((!merged.bio || merged.bio.length < 40) && wiki.extract) {
      merged.bio = wiki.extract;
      merged.bioSource = 'Wikipedia';
      merged.bioSourceUrl = page;
    }
    if (!merged.photoUrl && wiki.thumbnail?.source) merged.photoUrl = wiki.thumbnail.source;
    if (!merged.sources.includes('wikipedia')) merged.sources = [...merged.sources, 'wikipedia'];
  }
  merged.fetchedAtUtc = new Date().toISOString();

  await writeCache(cacheKey, 'cached', merged, CACHE_TTL_MS.playerProfile).catch(() => undefined);
  return merged;
}

export async function resolvePlayerByName(name: string, options: PlayerLookupOptions = {}): Promise<PlayerProfile | null> {
  const results = await searchPlayers(name);
  if (results.length === 0) return null;
  const exact = results.find(player => normalizeTitle(player.name) === normalizeTitle(name));
  return getPlayerProfile((exact ?? results[0]).id, options);
}
