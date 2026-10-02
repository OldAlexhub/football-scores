import { rateBudgetStorage } from '../storage/mmkvStorage';
import type { ProviderId } from '../types/domain';

/**
 * Rolling one-minute request counter per provider, persisted in MMKV so it
 * survives a screen remount. Only providers with a real free-tier ceiling are
 * guarded; everything else returns `false` from {@link nearSoftCap}.
 */

const WINDOW_MS = 60 * 1000;

/** Soft ceilings kept a little under each provider's documented hard limit. */
const SOFT_CAP: Partial<Record<ProviderId, number>> = {
  thesportsdb: 24, // hard limit 30 / min on the shared demo key
};

function keyFor(providerId: ProviderId): string {
  return `req:${providerId}`;
}

function readTimestamps(providerId: ProviderId): number[] {
  const raw = rateBudgetStorage.getString(keyFor(providerId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n: unknown): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function writeTimestamps(providerId: ProviderId, stamps: number[]): void {
  rateBudgetStorage.set(keyFor(providerId), JSON.stringify(stamps));
}

export function recordRequest(providerId: ProviderId): void {
  const now = Date.now();
  const recent = readTimestamps(providerId).filter(ts => now - ts < WINDOW_MS);
  recent.push(now);
  writeTimestamps(providerId, recent);
}

export function requestsInLastMinute(providerId: ProviderId): number {
  const now = Date.now();
  return readTimestamps(providerId).filter(ts => now - ts < WINDOW_MS).length;
}

export function nearSoftCap(providerId: ProviderId): boolean {
  const cap = SOFT_CAP[providerId];
  if (cap == null) return false;
  return requestsInLastMinute(providerId) >= cap;
}

/** Avoid starting a batch that is expected to exceed a provider's soft limit. */
export function canFitWithinSoftCap(providerId: ProviderId, requestCount: number): boolean {
  const cap = SOFT_CAP[providerId];
  if (cap == null) return true;
  return requestsInLastMinute(providerId) + Math.max(0, requestCount) <= cap;
}
