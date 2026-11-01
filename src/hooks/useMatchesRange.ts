import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { fetchMatches, canManualRefresh, markManualRefresh } from '../providers/providerManager';
import type { ProviderId, Match } from '../types/domain';

export interface MatchesRangeState {
  matches: Match[];
  loading: boolean;
  refreshing: boolean;
  providerId: ProviderId | null;
  isFromCache: boolean;
  isStale: boolean;
  errorMessage: string | null;
  lastRefreshedAtUtc: string | null;
  refresh: (manual?: boolean) => Promise<void>;
  canRefresh: boolean;
}

/**
 * @param competitionKey a `competitionCatalog` key (e.g. `premier-league`), or
 *   undefined for the "all competitions" view. Provider-manager translates it
 *   into each source's own id dialect.
 */
export function useMatchesRange(dateFromUtc: string, dateToUtc: string, competitionKey?: string): MatchesRangeState {
  const isFocused = useIsFocused();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerId, setProviderId] = useState<ProviderId | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshedAtUtc, setLastRefreshedAtUtc] = useState<string | null>(null);
  const [importPending, setImportPending] = useState(false);
  const mounted = useRef(true);
  const requestSequence = useRef(0);

  const load = useCallback(async (manual = false, background = false) => {
    if (manual && !canManualRefresh()) {
      return;
    }
    const requestId = ++requestSequence.current;
    if (manual) {
      markManualRefresh();
      setRefreshing(true);
    } else if (!background) {
      setLoading(true);
    }
    try {
      const result = await fetchMatches({
        dateFromUtc,
        dateToUtc,
        competitionProviderIds: competitionKey ? [competitionKey] : undefined,
        forceRefresh: manual,
      });
      if (!mounted.current || requestId !== requestSequence.current) return;
      setMatches(result.data);
      setImportPending(!!result.importPending);
      setProviderId(result.providerId);
      setIsFromCache(result.isFromCache);
      setIsStale(result.isStale);
      setErrorMessage(result.errorMessage);
      if (!result.isFromCache) {
        setLastRefreshedAtUtc(new Date().toISOString());
      }
    } catch (error) {
      if (!mounted.current || requestId !== requestSequence.current) return;
      setProviderId('cached');
      setIsFromCache(true);
      setIsStale(true);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load matches');
    } finally {
      if (mounted.current && requestId === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [dateFromUtc, dateToUtc, competitionKey]);

  useEffect(() => {
    mounted.current = true;
    setMatches([]);
    setErrorMessage(null);
    void load(false);
    return () => {
      mounted.current = false;
    };
  }, [load]);

  useEffect(() => {
    const hasLiveMatch = matches.some(match => match.status === 'live' || match.status === 'half_time');
    if (!isFocused || (!hasLiveMatch && !importPending)) return;
    const timer = setInterval(() => { void load(false, true); }, 30_000);
    return () => clearInterval(timer);
  }, [isFocused, load, matches, importPending]);

  return {
    matches, loading, refreshing, providerId, isFromCache, isStale, errorMessage,
    lastRefreshedAtUtc, refresh: load, canRefresh: canManualRefresh(),
  };
}
