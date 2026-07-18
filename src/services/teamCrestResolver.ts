import { readCache, writeCache } from '../storage/repositories/providerCacheRepo';

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123';
const CREST_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const inflight = new Map<string, Promise<string | null>>();

function normalizedTeamName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/\b(fc|cf|afc|sc|ac|club)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export async function resolveTeamCrest(teamName: string): Promise<string | null> {
  const normalized = normalizedTeamName(teamName);
  if (!normalized) return null;
  const cacheKey = `team-crest:${normalized}`;
  const cached = await readCache<string | null>(cacheKey);
  if (cached && !cached.isStale) return cached.payload;

  const existing = inflight.get(normalized);
  if (existing) return existing;

  const request = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/searchteams.php?t=${encodeURIComponent(teamName)}`);
      if (!response.ok) return cached?.payload ?? null;
      const body = await response.json() as { teams?: Array<Record<string, unknown>> | null };
      const candidates = (body.teams ?? []).filter(team => String(team.strSport ?? '').toLocaleLowerCase() === 'soccer');
      const exact = candidates.find(team => normalizedTeamName(String(team.strTeam ?? '')) === normalized);
      const crest = exact ? String(exact.strBadge ?? exact.strTeamBadge ?? '') : '';
      const resolved = crest.startsWith('https://') ? `${crest}/tiny` : null;
      await writeCache(cacheKey, 'cached', resolved, CREST_TTL_MS);
      return resolved;
    } catch {
      return cached?.payload ?? null;
    } finally {
      inflight.delete(normalized);
    }
  })();
  inflight.set(normalized, request);
  return request;
}
