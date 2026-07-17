import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, EmptyState, SectionHeader } from '../../components/ui';
import { useFavorites } from '../../state/FavoritesContext';
import { useCompetitions } from '../../hooks/useCompetitions';
import { useTheme } from '../../theme/ThemeProvider';

export function InsightsHomeScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { favoriteCompetitionIds } = useFavorites();
  const { competitions } = useCompetitions();

  const favoriteCompetitions = competitions.filter(c => favoriteCompetitionIds.has(c.id));

  if (favoriteCompetitions.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState title={t('matchday.selectFavoriteCompetitions')} body={t('matchday.emptyBody')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('insights.title')}</Text>

        {favoriteCompetitions.map(comp => (
          <Card key={comp.id} style={styles.card}>
            <SectionHeader title={comp.name} />
            <Text
              style={[styles.link, { color: theme.colors.accent }]}
              onPress={() => navigation.navigate('Standings', { competitionId: comp.id })}
            >
              {t('insights.standings')}
            </Text>
            <Text
              style={[styles.link, { color: theme.colors.accent }]}
              onPress={() => navigation.navigate('TeamComparison', { competitionId: comp.id })}
            >
              {t('insights.teamComparison')}
            </Text>
            <Text
              style={[styles.link, { color: theme.colors.accent }]}
              onPress={() => navigation.navigate('TableScenario', { competitionId: comp.id })}
            >
              {t('insights.tableScenario')}
            </Text>
          </Card>
        ))}
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  card: { marginHorizontal: 16, marginTop: 14 },
  link: { fontSize: 14, fontWeight: '600', paddingVertical: 8 },
});
