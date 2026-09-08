import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../components/AppIcon';
import { MatchCard } from '../../components/MatchCard';
import { NewsThumb } from '../../components/NewsThumb';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, ErrorState, LoadingState, SectionHeader } from '../../components/ui';
import { canonicalTeam } from '../../providers/nameMatch';
import { articleMentions, fetchFootballNews } from '../../providers/newsProvider';
import { getPlayerProfile, resolvePlayerByName } from '../../providers/playersProvider';
import { fetchMatches } from '../../providers/providerManager';
import { useFavorites } from '../../state/FavoritesContext';
import { usePreferences } from '../../state/PreferencesContext';
import { useTheme } from '../../theme/ThemeProvider';
import { addDays, startOfLocalDay } from '../../utils/dates';
import { flagForCountry } from '../../utils/countryFlags';
import type { PlayersStackParamList } from '../../navigation/types';
import type { Match, NewsArticle, PlayerProfile } from '../../types/domain';

type Props = NativeStackScreenProps<PlayersStackParamList, 'PlayerDetails'>;

function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

export function PlayerDetailsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { preferences } = usePreferences();
  const { favoritePlayerIds, togglePlayer } = useFavorites();

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextFixture, setNextFixture] = useState<Match | null>(null);
  const [related, setRelated] = useState<NewsArticle[]>([]);

  const lang = preferences.language === 'ar' ? 'ar' : 'en';

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = route.params?.playerId
      ? getPlayerProfile(route.params.playerId, { language: lang })
      : resolvePlayerByName(route.params?.query ?? '', { language: lang });
    load.then(result => {
      if (active) { setProfile(result); setLoading(false); }
    }).catch(() => { if (active) { setProfile(null); setLoading(false); } });
    return () => { active = false; };
  }, [route.params?.playerId, route.params?.query, lang]);

  useEffect(() => {
    if (!profile?.currentTeamName) return undefined;
    let active = true;
    const wanted = canonicalTeam(profile.currentTeamName);
    fetchMatches({
      dateFromUtc: startOfLocalDay(new Date()).toISOString(),
      dateToUtc: addDays(new Date(), 21).toISOString(),
    }).then(result => {
      if (!active) return;
      const upcoming = result.data
        .filter(m => m.status === 'scheduled'
          && (canonicalTeam(m.homeTeamName) === wanted || canonicalTeam(m.awayTeamName) === wanted))
        .sort((a, b) => (a.kickoffUtc ?? '').localeCompare(b.kickoffUtc ?? ''));
      setNextFixture(upcoming[0] ?? null);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [profile?.currentTeamName]);

  useEffect(() => {
    if (!profile?.name) return undefined;
    let active = true;
    fetchFootballNews({ language: lang }).then(result => {
      if (active) setRelated(result.articles.filter(a => articleMentions(a, profile.name)).slice(0, 5));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [profile?.name, lang]);

  const isFollowed = useMemo(() => !!profile && favoritePlayerIds.has(profile.id), [profile, favoritePlayerIds]);

  const onToggleFollow = () => {
    if (!profile) return;
    void togglePlayer(profile.id, {
      playerId: profile.id,
      name: profile.name,
      photoUrl: profile.photoUrl,
      position: profile.position,
      nationality: profile.nationality,
      clubName: profile.currentTeamName,
      clubTeamId: profile.currentTeamId,
    });
  };

  if (loading) {
    return <ScreenContainer><LoadingState label={t('common.loading')} /></ScreenContainer>;
  }
  if (!profile) {
    return (
      <ScreenContainer>
        <ErrorState message={t('errors.playerNotFound')} retryLabel={t('common.back')} onRetry={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const age = ageFrom(profile.birthDate);

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={8}>
        <View style={styles.hero}>
          <NewsThumb uri={profile.photoUrl} size={92} />
          <View style={styles.heroText}>
            <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{profile.name}</Text>
            <Text style={[styles.heroMeta, { color: theme.colors.textMuted }]}>
              {[profile.position, profile.currentTeamName].filter(Boolean).join(' · ')}
            </Text>
            <Text style={[styles.heroMeta, { color: theme.colors.textMuted }]}>
              {[
                profile.nationality ? `${flagForCountry(profile.nationality)} ${profile.nationality}` : null,
                age != null ? t('players.age', { count: age }) : null,
                profile.heightCm ? `${profile.heightCm} cm` : null,
              ].filter(Boolean).join('  ')}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onToggleFollow}
          style={[styles.followBtn, { backgroundColor: isFollowed ? theme.colors.surfaceAlt : theme.colors.accent, borderColor: theme.colors.border }]}
        >
          <AppIcon name={isFollowed ? 'star' : 'plus'} size={16} color={isFollowed ? theme.colors.accent : theme.colors.accentText} />
          <Text style={[styles.followText, { color: isFollowed ? theme.colors.accent : theme.colors.accentText }]}>
            {isFollowed ? t('players.unfollow') : t('players.follow')}
          </Text>
        </Pressable>

        {profile.bio ? (
          <View style={styles.section}>
            <SectionHeader title={t('players.bio')} />
            <Card>
              <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>{profile.bio}</Text>
              {profile.bioSource ? (
                <Pressable
                  disabled={!profile.bioSourceUrl}
                  onPress={() => profile.bioSourceUrl && Linking.openURL(profile.bioSourceUrl).catch(() => undefined)}
                >
                  <Text style={[styles.bioSource, { color: theme.colors.accent }]}>
                    {t('players.bioAttribution', { source: profile.bioSource })}
                  </Text>
                </Pressable>
              ) : null}
            </Card>
          </View>
        ) : null}

        {nextFixture ? (
          <View style={styles.section}>
            <SectionHeader title={t('players.nextFixture')} />
            <MatchCard
              match={nextFixture}
              onPress={() => navigation.navigate('MatchDetails', { matchId: nextFixture.id, match: nextFixture })}
            />
          </View>
        ) : null}

        {profile.career.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('players.career')} />
            <Card>
              {profile.career.map((entry, index) => (
                <View key={index} style={[styles.careerRow, index > 0 && { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <Text style={[styles.careerTeam, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {entry.teamName}{entry.isLoan ? ` ${t('players.loanSuffix')}` : ''}
                  </Text>
                  <Text style={[styles.careerYears, { color: theme.colors.textMuted }]}>
                    {[entry.fromYear, entry.toYear].filter(Boolean).join(' – ')}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {profile.honours.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('players.honours')} />
            <Card>
              {profile.honours.map((honour, index) => (
                <Text key={index} style={[styles.honour, { color: theme.colors.textSecondary }]}>
                  • {honour.title}{honour.season ? ` (${honour.season})` : ''}
                </Text>
              ))}
            </Card>
          </View>
        ) : null}

        {related.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('players.relatedNews')} />
            {related.map(article => (
              <Pressable key={article.id} onPress={() => Linking.openURL(article.link).catch(() => undefined)}>
                <Card style={styles.newsCard}>
                  <NewsThumb uri={article.imageUrl} size={54} />
                  <View style={styles.newsText}>
                    <Text style={[styles.newsTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>{article.title}</Text>
                    <Text style={[styles.newsSource, { color: theme.colors.accent }]}>{article.sourceName}</Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={[styles.footNote, { color: theme.colors.textMuted }]}>{t('players.keylessNote')}</Text>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, paddingTop: 12, alignItems: 'center' },
  heroText: { flex: 1 },
  name: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  heroMeta: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  followBtn: { marginHorizontal: 16, marginTop: 14, height: 42, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  followText: { fontSize: 13, fontWeight: '800' },
  section: { paddingHorizontal: 16, paddingTop: 10 },
  bio: { fontSize: 13, lineHeight: 20 },
  bioSource: { fontSize: 11, fontWeight: '700', marginTop: 8 },
  careerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  careerTeam: { flex: 1, fontSize: 13, fontWeight: '700' },
  careerYears: { fontSize: 12, fontWeight: '600' },
  honour: { fontSize: 13, lineHeight: 21 },
  newsCard: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' },
  newsText: { flex: 1 },
  newsTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  newsSource: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  footNote: { fontSize: 10, marginHorizontal: 16, marginTop: 20, lineHeight: 15 },
});
