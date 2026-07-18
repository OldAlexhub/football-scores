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

export function useMatchesRange(dateFromUtc: string, dateToUtc: string, competitionProviderId?: string): MatchesRangeState {
  const isFocused = useIsFocused();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerId, setProviderId] = useState<ProviderId | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshedAtUtc, setLastRefreshedAtUtc] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async (manual = false, background = false) => {
    if (manual && !canManualRefresh()) {
      return;
    }
    if (manual) {
      markManualRefresh();
      setRefreshing(true);
    } else if (!background) {
      setLoading(true);
    }
    const result = await fetchMatches({
      dateFromUtc,
      dateToUtc,
      competitionProviderIds: competitionProviderId ? [competitionProviderId] : undefined,
      forceRefresh: manual,
    });
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
  }, [dateFromUtc, dateToUtc, competitionProviderId]);

  useEffect(() => {
    mounted.current = true;
    void load(false);
    return () => {
      mounted.current = false;
    };
  }, [load]);

  useEffect(() => {
    const hasLiveMatch = matches.some(match => match.status === 'live' || match.status === 'half_time');
    if (!isFocused || !hasLiveMatch) return;
    const timer = setInterval(() => { void load(false, true); }, 30_000);
    return () => clearInterval(timer);
  }, [isFocused, load, matches]);

  return {
    matches, loading, refreshing, providerId, isFromCache, isStale, errorMessage,
    lastRefreshedAtUtc, refresh: load, canRefresh: canManualRefresh(),
  };
}
