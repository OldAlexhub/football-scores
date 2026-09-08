import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../components/AppIcon';
import { InFeedNativeAd } from '../../ads/InFeedNativeAd';
import { maybeShowInterstitial } from '../../ads/InterstitialManager';
import { MatchCard } from '../../components/MatchCard';
import { NewsThumb } from '../../components/NewsThumb';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, EmptyState, LoadingState, SectionHeader } from '../../components/ui';
import { useHomeFeed, type FollowedPlayerLite } from '../../hooks/useHomeFeed';
import { listPlayerMeta } from '../../storage/repositories/followedPlayersRepo';
import { useReminders } from '../../state/RemindersContext';
import { useTheme } from '../../theme/ThemeProvider';
import type { HomeStackParamList } from '../../navigation/types';
import type { Match, NewsArticle } from '../../types/domain';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeDashboard'>;

export function HomeDashboardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { getReminderFor } = useReminders();
  const [followedPlayers, setFollowedPlayers] = useState<FollowedPlayerLite[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    listPlayerMeta()
      .then(list => { if (active) setFollowedPlayers(list.map(p => ({ name: p.name, clubName: p.clubName }))); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []));

  const feed = useHomeFeed(followedPlayers);

  const openMatch = async (match: Match) => {
    await maybeShowInterstitial('match_detail_open');
    navigation.navigate('MatchDetails', { matchId: match.id, match });
  };

  const openArticle = async (article: NewsArticle) => {
    await maybeShowInterstitial('news_article_open');
    await Linking.openURL(article.link).catch(() => undefined);
  };

  const renderMatch = (match: Match) => (
    <MatchCard
      key={match.id}
      match={match}
      hasReminder={getReminderFor(match.id)?.status === 'scheduled'}
      onPress={() => openMatch(match)}
    />
  );

  const NewsRow = ({ article }: { article: NewsArticle }) => (
    <Pressable onPress={() => openArticle(article)}>
      <Card style={styles.newsCard}>
        <NewsThumb uri={article.imageUrl} size={60} />
        <View style={styles.newsText}>
          <Text style={[styles.newsTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>{article.title}</Text>
          <Text style={[styles.newsSource, { color: theme.colors.accent }]}>{article.sourceName}</Text>
        </View>
      </Card>
    </Pressable>
  );

  const SeeAll = ({ onPress }: { onPress: () => void }) => (
    <Pressable onPress={onPress} hitSlop={8} style={styles.seeAll}>
      <Text style={[styles.seeAllText, { color: theme.colors.accent }]}>{t('home.seeAllMatches')}</Text>
      <AppIcon name="chevronRight" size={15} color={theme.colors.accent} />
    </Pressable>
  );

  if (feed.loading) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('home.title')}</Text>
        </View>
        <LoadingState label={t('common.loading')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SafeScrollView refreshing={feed.refreshing} onRefresh={feed.refresh} contentBottomPadding={8}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('home.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{t('home.subtitle')}</Text>
        </View>

        {feed.matchOfTheDay ? (
          <View style={styles.section}>
            <SectionHeader title={t('home.matchOfTheDay')} />
            {renderMatch(feed.matchOfTheDay)}
          </View>
        ) : null}

        {feed.liveNow.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('home.liveNow')} />
            {feed.liveNow.slice(0, 6).map(renderMatch)}
          </View>
        ) : null}

        {feed.today.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title={t('home.today')}
              action={<SeeAll onPress={() => navigation.getParent()?.navigate('MatchesTab' as never)} />}
            />
            {feed.today.map(renderMatch)}
          </View>
        ) : null}

        <View style={styles.adWrap}><InFeedNativeAd /></View>

        <View style={styles.section}>
          <SectionHeader title={t('home.following')} />
          {feed.followingFixtures.length === 0 && feed.followingNews.length === 0 ? (
            <EmptyState
              title={t('home.following')}
              body={t('home.followingEmpty')}
              action={
                <Pressable
                  onPress={() => navigation.getParent()?.navigate('PlayersTab' as never)}
                  style={[styles.cta, { backgroundColor: theme.colors.accent }]}
                >
                  <Text style={[styles.ctaText, { color: theme.colors.accentText }]}>{t('home.followingEmptyCta')}</Text>
                </Pressable>
              }
            />
          ) : (
            <>
              {feed.followingFixtures.map(renderMatch)}
              {feed.followingNews.map(article => <NewsRow key={article.id} article={article} />)}
            </>
          )}
        </View>

        {feed.topStories.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title={t('home.topStories')}
              action={<SeeAll onPress={() => navigation.navigate('News')} />}
            />
            {feed.topStories.map(article => <NewsRow key={article.id} article={article} />)}
          </View>
        ) : null}

        {feed.transfers.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title={t('home.transfers')}
              action={<SeeAll onPress={() => navigation.navigate('News')} />}
            />
            {feed.transfers.slice(0, 3).map(article => <NewsRow key={article.id} article={article} />)}
          </View>
        ) : null}

        {feed.topStories.length === 0 && feed.today.length === 0 && !feed.matchOfTheDay ? (
          <EmptyState title={t('home.title')} body={t('home.noFeed')} />
        ) : null}
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 9, paddingBottom: 4 },
  title: { fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  section: { paddingHorizontal: 16, paddingTop: 6 },
  adWrap: { paddingHorizontal: 16, paddingTop: 10 },
  newsCard: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' },
  newsText: { flex: 1 },
  newsTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  newsSource: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 12, fontWeight: '800' },
  cta: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start' },
  ctaText: { fontSize: 13, fontWeight: '800' },
});
