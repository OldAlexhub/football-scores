import { MMKV } from 'react-native-mmkv';

/**
 * Small, frequently-read values only: user preferences and ad frequency
 * bookkeeping. Anything relational or exportable (favorites, predictions,
 * reminders, matchday items) lives in SQLite instead — see db.ts.
 */
export const preferencesStorage = new MMKV({ id: 'football-scores-preferences' });
export const adStateStorage = new MMKV({ id: 'football-scores-ad-state' });
/** Rolling per-provider request counters, so a rate-limited source can be skipped. */
export const rateBudgetStorage = new MMKV({ id: 'football-scores-rate-budget' });
/** Per-feed ETag / Last-Modified for conditional news fetches. */
export const newsHttpStorage = new MMKV({ id: 'football-scores-news-http' });

export function getJson<T>(storage: MMKV, key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJson<T>(storage: MMKV, key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}
