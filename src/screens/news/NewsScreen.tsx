import React, { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, EmptyState, ErrorState, LoadingState } from '../../components/ui';
import { InFeedNativeAd } from '../../ads/InFeedNativeAd';
import { maybeShowInterstitial } from '../../ads/InterstitialManager';
import { fetchFootballNews } from '../../providers/newsProvider';
import { usePreferences } from '../../state/PreferencesContext';
import { useTheme } from '../../theme/ThemeProvider';
import type { NewsArticle, NewsCategory } from '../../types/domain';

type Filter = 'all' | NewsCategory;

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

  const load = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    const result = await fetchFootballNews(forceRefresh);
    setArticles(result.articles);
    setIsStale(result.isStale);
    setFailedSources(result.failedSources);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? articles : articles.filter(a => a.category === filter)),
    [articles, filter],
  );

  const handleOpen = async (link: string) => {
    await maybeShowInterstitial('news_article_open');
    await Linking.openURL(link).catch(() => undefined);
  };

  return (
    <ScreenContainer>
      <View style={styles.headerBlock}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('news.title')}</Text>
        <Text style={[styles.disclaimer, { color: theme.colors.textMuted }]}>{t('news.attribution')}</Text>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'general', 'transfer'] as Filter[]).map(f => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, { backgroundColor: filter === f ? theme.colors.accent : theme.colors.surfaceAlt }]}
          >
            <Text style={{ color: filter === f ? theme.colors.accentText : theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              {t(`news.filter${f.charAt(0).toUpperCase()}${f.slice(1)}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isStale ? <Text style={[styles.staleNotice, { color: theme.colors.warning }]}>{t('news.staleNotice')}</Text> : null}
      {failedSources.length > 0 && articles.length === 0 ? (
        <Text style={[styles.staleNotice, { color: theme.colors.textMuted }]}>
          {t('news.someSourcesUnavailable', { sources: failedSources.join(', ') })}
        </Text>
      ) : null}

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : filtered.length === 0 ? (
        articles.length === 0 ? (
          <ErrorState message={t('news.emptyBody')} retryLabel={t('common.retry')} onRetry={() => load(true)} />
        ) : (
          <EmptyState title={t('news.emptyFilterTitle')} body="" />
        )
      ) : (
        <SafeScrollView refreshing={refreshing} onRefresh={() => load(true)} contentBottomPadding={20}>
          {filtered.map((article, index) => (
            <React.Fragment key={article.id}>
              <Pressable onPress={() => handleOpen(article.link)}>
                <Card style={styles.articleCard}>
                {article.imageUrl ? (
                  <Image source={{ uri: article.imageUrl }} style={styles.thumbnail} resizeMode="cover" />
                ) : null}
                <View style={styles.articleTextBlock}>
                  <Text style={[styles.articleTitle, { color: theme.colors.textPrimary }]} numberOfLines={3}>
                    {article.title}
                  </Text>
                  <Text style={[styles.articleSnippet, { color: theme.colors.textSecondary }]} numberOfLines={3}>
                    {article.snippet}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.sourceLabel, { color: theme.colors.accent }]}>{article.sourceName}</Text>
                    {article.publishedAtUtc ? (
                      <Text style={[styles.dateLabel, { color: theme.colors.textMuted }]}>
                        {new Intl.DateTimeFormat(preferences.language === 'ar' ? 'ar' : 'en-GB', { day: 'numeric', month: 'short' }).format(new Date(article.publishedAtUtc))}
                      </Text>
                    ) : null}
                  </View>
                </View>
                </Card>
              </Pressable>
              {index === 1 ? <View style={styles.nativeAdWrap}><InFeedNativeAd /></View> : null}
            </React.Fragment>
          ))}
        </SafeScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBlock: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  disclaimer: { fontSize: 11, marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 10, marginBottom: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  staleNotice: { fontSize: 11, paddingHorizontal: 16, marginTop: 6 },
  articleCard: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, gap: 10 },
  thumbnail: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#00000022' },
  articleTextBlock: { flex: 1 },
  articleTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  articleSnippet: { fontSize: 12, lineHeight: 17 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sourceLabel: { fontSize: 11, fontWeight: '700' },
  dateLabel: { fontSize: 11 },
  nativeAdWrap: { marginHorizontal: 16, marginTop: 10 },
});
