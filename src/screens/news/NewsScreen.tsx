import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, EmptyState, ErrorState, LoadingState } from '../../components/ui';
import { FilterChip } from '../../components/FilterChip';
import { NewsThumb } from '../../components/NewsThumb';
import { InFeedNativeAd } from '../../ads/InFeedNativeAd';
import { maybeShowInterstitial } from '../../ads/InterstitialManager';
import { fetchFootballNews } from '../../providers/newsProvider';
import { usePreferences } from '../../state/PreferencesContext';
import { useTheme } from '../../theme/ThemeProvider';
import type { NewsArticle, NewsCategory } from '../../types/domain';

type Filter = 'all' | NewsCategory;
const PAGE_SIZE = 20;

export function NewsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { preferences } = usePreferences();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await fetchFootballNews({
        forceRefresh,
        language: preferences.language === 'ar' ? 'ar' : 'en',
      });
      setArticles(result.articles);
      setIsStale(result.isStale);
      setFailedSources(result.failedSources);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setVisibleCount(PAGE_SIZE);
    }
  }, [preferences.language]);

  useEffect(() => { void load(false); }, [load]);

  const sources = useMemo(
    () => [...new Set(articles.map(a => a.sourceName))],
    [articles],
  );

  const filtered = useMemo(() => articles.filter(a => {
    if (filter !== 'all' && a.category !== filter) return false;
    if (sourceFilter && a.sourceName !== sourceFilter) return false;
    return true;
  }), [articles, filter, sourceFilter]);

  const visible = filtered.slice(0, visibleCount);

  const handleOpen = async (link: string) => {
    await maybeShowInterstitial('news_article_open');
    await Linking.openURL(link).catch(() => undefined);
  };

  const dateFmt = new Intl.DateTimeFormat(preferences.language === 'ar' ? 'ar' : 'en-GB', { day: 'numeric', month: 'short' });

  const renderItem = ({ item, index }: { item: NewsArticle; index: number }) => (
    <>
      <Pressable onPress={() => handleOpen(item.link)}>
        <Card style={styles.articleCard}>
          <NewsThumb uri={item.imageUrl} size={84} />
          <View style={styles.articleTextBlock}>
            <Text style={[styles.articleTitle, { color: theme.colors.textPrimary }]} numberOfLines={3}>{item.title}</Text>
            <Text style={[styles.articleSnippet, { color: theme.colors.textSecondary }]} numberOfLines={2}>{item.snippet}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.sourceLabel, { color: theme.colors.accent }]}>{item.sourceName}</Text>
              {item.category === 'transfer' ? (
                <View style={[styles.pill, { backgroundColor: theme.colors.accentSoft }]}>
                  <Text style={[styles.pillText, { color: theme.colors.accent }]}>
                    {(item.transferConfidence ?? 0) >= 0.5 ? t('news.likelyTransfer') : t('news.reportedTransfer')}
                  </Text>
                </View>
              ) : null}
              {item.publishedAtUtc ? (
                <Text style={[styles.dateLabel, { color: theme.colors.textMuted }]}>{dateFmt.format(new Date(item.publishedAtUtc))}</Text>
              ) : null}
            </View>
          </View>
        </Card>
      </Pressable>
      {index === 1 ? <View style={styles.nativeAdWrap}><InFeedNativeAd /></View> : null}
    </>
  );

  return (
    <ScreenContainer>
      <View style={styles.headerBlock}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('news.title')}</Text>
        <Text style={[styles.disclaimer, { color: theme.colors.textMuted }]}>{t('news.attribution')}</Text>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'general', 'transfer'] as Filter[]).map(f => (
          <FilterChip
            key={f}
            compact
            label={t(`news.filter${f.charAt(0).toUpperCase()}${f.slice(1)}`)}
            active={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </View>

      {sources.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourceRow}>
          <FilterChip compact label={t('news.allSources')} active={!sourceFilter} onPress={() => setSourceFilter(null)} />
          {sources.map(source => (
            <FilterChip key={source} compact label={source} active={sourceFilter === source} onPress={() => setSourceFilter(source)} />
          ))}
        </ScrollView>
      ) : null}

      {isStale ? <Text style={[styles.staleNotice, { color: theme.colors.warning }]}>{t('news.staleNotice')}</Text> : null}
      {failedSources.length > 0 && articles.length === 0 ? (
        <Text style={[styles.staleNotice, { color: theme.colors.textMuted }]}>
          {t('news.someSourcesUnavailable', { sources: failedSources.join(', ') })}
        </Text>
      ) : null}

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : visible.length === 0 ? (
        articles.length === 0 ? (
          <ErrorState message={t('news.emptyBody')} retryLabel={t('common.retry')} onRetry={() => load(true)} />
        ) : (
          <EmptyState title={t('news.emptyFilterTitle')} body="" />
        )
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          onEndReachedThreshold={0.5}
          onEndReached={() => setVisibleCount(count => (count < filtered.length ? count + PAGE_SIZE : count))}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBlock: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  disclaimer: { fontSize: 11, marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 10, marginBottom: 4 },
  sourceRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  staleNotice: { fontSize: 11, paddingHorizontal: 16, marginTop: 6 },
  listContent: { paddingBottom: 24 },
  articleCard: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, gap: 10 },
  articleTextBlock: { flex: 1 },
  articleTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  articleSnippet: { fontSize: 12, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  sourceLabel: { fontSize: 11, fontWeight: '700' },
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  pillText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  dateLabel: { fontSize: 11 },
  nativeAdWrap: { marginHorizontal: 16, marginTop: 10 },
});
