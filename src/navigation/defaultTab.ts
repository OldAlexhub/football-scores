import type { DefaultTab } from '../types/domain';

/**
 * Coerce any persisted "opening tab" value (including legacy `matchday` /
 * `predict` / `insights` from earlier builds) to one of the four real tabs.
 */
export function normalizeDefaultTab(value: unknown): DefaultTab {
  if (value === 'matches' || value === 'players' || value === 'more') return value;
  return 'home';
}

export const DEFAULT_TAB_OPTIONS: DefaultTab[] = ['home', 'matches', 'players', 'more'];
