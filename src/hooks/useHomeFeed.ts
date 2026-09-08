import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { fetchMatches } from '../providers/providerManager';
import { articleMentions, fetchFootballNews } from '../providers/newsProvider';
import { canonicalTeam } from '../providers/nameMatch';
import { pickMatchOfTheDay, scoreMatchImportance } from '../services/matchImportance';
import { useFavorites } from '../state/FavoritesContext';
import { usePreferences } from '../state/PreferencesContext';
import { addDays, startOfLocalDay, toLocalDateKey } from '../utils/dates';
import type { Match, NewsArticle } from '../types/domain';

export interface FollowedPlayerLite {
  name: string;
  clubName: string | null;
}

export interface HomeFeed {
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
  matchOfTheDay: Match | null;
  liveNow: Match[];
  today: Match[];
  followingFixtures: Match[];
  followingNews: NewsArticle[];
  topStories: NewsArticle[];
  transfers: NewsArticle[];
  errorMessage: string | null;
}

const TODAY_LIMIT = 6;

export function useHomeFeed(followedPlayers: FollowedPlayerLite[] = []): HomeFeed {
  const isFocused = useIsFocused();
  const { preferences } = usePreferences();
  const { favoriteTeamIds } = useFavorites();

  const [matches, setMatches] = useState<Match[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mounted = useRef(true);

  const favoriteTeamKey = [...favoriteTeamIds].sort().join(',');
  const playerKey = followedPlayers.map(p => `${p.name}|${p.clubName ?? ''}`).sort().join(',');

  const load = useCallback(async (manual = false, background = false) => {
    if (manual) setRefreshing(true);
    else if (!background) setLoading(true);

    const now = new Date();
    const from = startOfLocalDay(now).toISOString();
    const to = addDays(now, 3).toISOString();

    const [matchesResult, newsResult] = await Promise.all([
      fetchMatches({ dateFromUtc: from, dateToUtc: to, forceRefresh: manual }),
      fetchFootballNews({ forceRefresh: manual, language: preferences.language === 'ar' ? 'ar' : 'en' }),
    ]);

    if (!mounted.current) return;
    setMatches(matchesResult.data);
    setNews(newsResult.articles);
    setErrorMessage(matchesResult.errorMessage ?? null);
    setLoading(false);
    setRefreshing(false);
  }, [preferences.language]);

  useEffect(() => {
    mounted.current = true;
    void load(false);
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, favoriteTeamKey, playerKey]);

  const liveNow = useMemo(
    () => matches.filter(m => m.status === 'live' || m.status === 'half_time'),
    [matches],
  );

  useEffect(() => {
    if (!isFocused || liveNow.length === 0) return undefined;
    const timer = setInterval(() => { void load(false, true); }, 30_000);
    return () => clearInterval(timer);
  }, [isFocused, liveNow.length, load]);

  const followedTeamNames = useMemo(() => {
    const names = new Set<string>();
    for (const match of matches) {
      if (favoriteTeamIds.has(match.homeTeamId)) names.add(canonicalTeam(match.homeTeamName));
      if (favoriteTeamIds.has(match.awayTeamId)) names.add(canonicalTeam(match.awayTeamName));
    }
    for (const player of followedPlayers) {
      if (player.clubName) names.add(canonicalTeam(player.clubName));
    }
    return names;
  }, [matches, favoriteTeamIds, followedPlayers]);

  const todayKey = toLocalDateKey(new Date().toISOString());

  const today = useMemo(() => matches
    .filter(m => m.kickoffUtc && toLocalDateKey(m.kickoffUtc) === todayKey)
    .map(m => ({ m, score: scoreMatchImportance(m, { followedTeamNames }) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TODAY_LIMIT)
    .map(x => x.m),
  [matches, todayKey, followedTeamNames]);

  const matchOfTheDay = useMemo(
    () => pickMatchOfTheDay(matches, { followedTeamNames }),
    [matches, followedTeamNames],
  );

  const followingFixtures = useMemo(() => {
    if (followedTeamNames.size === 0) return [];
    const seen = new Set<string>();
    const out: Match[] = [];
    for (const match of [...matches].sort((a, b) => (a.kickoffUtc ?? '').localeCompare(b.kickoffUtc ?? ''))) {
      const home = canonicalTeam(match.homeTeamName);
      const away = canonicalTeam(match.awayTeamName);
      const involved = followedTeamNames.has(home) ? home : followedTeamNames.has(away) ? away : null;
      if (!involved || seen.has(involved)) continue;
      seen.add(involved);
      out.push(match);
    }
    return out;
  }, [matches, followedTeamNames]);

  const followingNews = useMemo(() => {
    if (followedTeamNames.size === 0 && followedPlayers.length === 0) return [];
    return news.filter(article => {
      const teamHit = (article.entities?.teamKeys ?? []).some(key => followedTeamNames.has(canonicalTeam(key)));
      const playerHit = followedPlayers.some(p => articleMentions(article, p.name));
      return teamHit || playerHit;
    }).slice(0, 4);
  }, [news, followedTeamNames, followedPlayers]);

  const topStories = useMemo(() => news.slice(0, 6), [news]);

  const transfers = useMemo(
    () => news
      .filter(a => a.category === 'transfer')
      .sort((a, b) => (b.transferConfidence ?? 0) - (a.transferConfidence ?? 0))
      .slice(0, 5),
    [news],
  );

  return {
    loading,
    refreshing,
    refresh: () => void load(true),
    matchOfTheDay,
    liveNow,
    today,
    followingFixtures,
    followingNews,
    topStories,
    transfers,
    errorMessage,
  };
}
