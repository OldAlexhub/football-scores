import { useCallback, useEffect, useRef, useState } from 'react';
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

export function useMatchesRange(dateFromUtc: string, dateToUtc: string): MatchesRangeState {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerId, setProviderId] = useState<ProviderId | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshedAtUtc, setLastRefreshedAtUtc] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async (manual = false) => {
    if (manual && !canManualRefresh()) {
      return;
    }
    if (manual) {
      markManualRefresh();
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    const result = await fetchMatches({ dateFromUtc, dateToUtc });
    if (!mounted.current) return;
    setMatches(result.data);
    setProviderId(result.providerId);
    setIsFromCache(result.isFromCache);
    setIsStale(result.isStale);
    setErrorMessage(result.errorMessage);
    if (!result.isFromCache) {
      setLastRefreshedAtUtc(new Date().toISOString());
    }
    setLoading(false);
    setRefreshing(false);
  }, [dateFromUtc, dateToUtc]);

  useEffect(() => {
    mounted.current = true;
    void load(false);
    return () => {
      mounted.current = false;
    };
  }, [load]);

  return {
    matches, loading, refreshing, providerId, isFromCache, isStale, errorMessage,
    lastRefreshedAtUtc, refresh: load, canRefresh: canManualRefresh(),
  };
}
