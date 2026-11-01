import type { PlayerProfile, PlayerSearchResult } from '../types/domain';
export interface PlayerLookupOptions { language?: 'en' | 'ar'; forceRefresh?: boolean }
/** No licensed current player-profile feed is configured. Keep saved player records intact. */
export async function searchPlayers(_name: string): Promise<PlayerSearchResult[]> { return []; }
export async function getPlayerProfile(_id: string, _options: PlayerLookupOptions = {}): Promise<PlayerProfile | null> { return null; }
export async function resolvePlayerByName(_name: string, _options: PlayerLookupOptions = {}): Promise<PlayerProfile | null> { return null; }
