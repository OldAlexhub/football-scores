import { runExecute, runQuery } from '../db';
import type { ProviderId } from '../../types/domain';

interface CacheRow {
  cache_key: string;
  provider_id: ProviderId;
  payload: string;
  fetched_at_utc: string;
  expires_at_utc: string;
}

export interface CacheReadResult<T> {
  payload: T;
  providerId: ProviderId;
  fetchedAtUtc: string;
  isStale: boolean;
}

export async function readCache<T>(cacheKey: string): Promise<CacheReadResult<T> | null> {
  const rows = await runQuery<CacheRow>('SELECT * FROM provider_cache WHERE cache_key = ?', [cacheKey]);
  const row = rows[0];
  if (!row) {
    return null;
  }
  const isStale = new Date(row.expires_at_utc).getTime() < Date.now();
  return {
    payload: JSON.parse(row.payload) as T,
    providerId: row.provider_id,
    fetchedAtUtc: row.fetched_at_utc,
    isStale,
  };
}

export async function writeCache<T>(
  cacheKey: string,
  providerId: ProviderId,
  payload: T,
  ttlMs: number,
): Promise<void> {
  const now = new Date();
  const expires = new Date(now.getTime() + ttlMs);
  await runExecute(
    `INSERT INTO provider_cache (cache_key, provider_id, payload, fetched_at_utc, expires_at_utc)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET provider_id = excluded.provider_id,
       payload = excluded.payload, fetched_at_utc = excluded.fetched_at_utc,
       expires_at_utc = excluded.expires_at_utc`,
    [cacheKey, providerId, JSON.stringify(payload), now.toISOString(), expires.toISOString()],
  );
}

export async function clearAllCache(): Promise<void> {
  await runExecute('DELETE FROM provider_cache');
}

export async function clearExpiredCache(): Promise<void> {
  await runExecute('DELETE FROM provider_cache WHERE expires_at_utc < ?', [new Date().toISOString()]);
}

export async function getCacheSizeBytes(): Promise<number> {
  const rows = await runQuery<{ total: number | null }>(
    'SELECT SUM(LENGTH(payload)) as total FROM provider_cache',
  );
  return rows[0]?.total ?? 0;
}

export async function getCacheEntryCount(): Promise<number> {
  const rows = await runQuery<{ count: number }>('SELECT COUNT(*) as count FROM provider_cache');
  return rows[0]?.count ?? 0;
}
