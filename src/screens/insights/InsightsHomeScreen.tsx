import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon, type AppIconName } from '../../components/AppIcon';
import { TeamCrest } from '../../components/TeamCrest';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/ui';
import { useFavorites } from '../../state/FavoritesContext';
import { useCompetitions } from '../../hooks/useCompetitions';
import { useTheme } from '../../theme/ThemeProvider';

export function InsightsHomeScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { favoriteCompetitionIds } = useFavorites();
  const { competitions } = useCompetitions();
  const favoriteCompetitions = competitions.filter(competition => favoriteCompetitionIds.has(competition.id));

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={24}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('insights.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{t('insights.subtitle')}</Text>
        </View>

        <Pressable onPress={() => navigation.navigate('News')} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
          <Card style={[styles.newsCard, { backgroundColor: theme.colors.accentSoft }]}>
            <View style={[styles.featureIcon, { backgroundColor: theme.colors.surface }]}>
              <AppIcon name="news" size={24} color={theme.colors.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>{t('news.title')}</Text>
              <Text style={[styles.featureSubtitle, { color: theme.colors.textSecondary }]}>{t('insights.newsSubtitle')}</Text>
            </View>
            <AppIcon name="chevronRight" size={20} color={theme.colors.accent} />
          </Card>
        </Pressable>

        <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>{t('more.favoriteCompetitions')}</Text>
        {favoriteCompetitions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.accentSoft }]}><AppIcon name="trophy" size={25} color={theme.colors.accent} /></View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>{t('matchday.selectFavoriteCompetitions')}</Text>
            <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{t('onboarding.competitionsBody')}</Text>
          </Card>
        ) : favoriteCompetitions.map(competition => (
          <Card key={competition.id} style={styles.competitionCard}>
            <View style={styles.competitionHeader}>
              <TeamCrest uri={competition.emblemUrl} name={competition.name} size={45} />
              <View style={styles.competitionText}>
                <Text style={[styles.competitionName, { color: theme.colors.textPrimary }]}>{competition.name}</Text>
                <Text style={[styles.competitionMeta, { color: theme.colors.textMuted }]}>{competition.country ?? 'International'} · {competition.currentSeason ?? ''}</Text>
              </View>
            </View>
            <View style={styles.actionGrid}>
              <InsightAction icon="trophy" label={t('insights.standings')} onPress={() => navigation.navigate('Standings', { competitionId: competition.id })} />
              <InsightAction icon="users" label={t('insights.teamComparison')} onPress={() => navigation.navigate('TeamComparison', { competitionId: competition.id })} />
              <InsightAction icon="spark" label={t('insights.tableScenario')} onPress={() => navigation.navigate('TableScenario', { competitionId: competition.id })} />
            </View>
          </Card>
        ))}
      </SafeScrollView>
    </ScreenContainer>
  );
}

function InsightAction({ icon, label, onPress }: { icon: AppIconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.insightAction, { backgroundColor: theme.colors.surfaceAlt, opacity: pressed ? 0.65 : 1 }]}>
      <AppIcon name={icon} size={18} color={theme.colors.accent} />
      <Text style={[styles.insightActionLabel, { color: theme.colors.textSecondary }]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 9, paddingBottom: 14 },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  newsCard: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '900' },
  featureSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  sectionLabel: { fontSize: 17, fontWeight: '900', marginHorizontal: 16, marginTop: 22, marginBottom: 10 },
  emptyCard: { marginHorizontal: 16, alignItems: 'center', paddingVertical: 26 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '900', textAlign: 'center' },
  emptyBody: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  competitionCard: { marginHorizontal: 16, marginBottom: 12 },
  competitionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  competitionText: { flex: 1 },
  competitionName: { fontSize: 15, fontWeight: '900' },
  competitionMeta: { fontSize: 10, marginTop: 3 },
  actionGrid: { flexDirection: 'row', gap: 8, marginTop: 14 },
  insightAction: { flex: 1, minHeight: 74, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 6 },
  insightActionLabel: { fontSize: 10, lineHeight: 13, fontWeight: '800', textAlign: 'center' },
});
