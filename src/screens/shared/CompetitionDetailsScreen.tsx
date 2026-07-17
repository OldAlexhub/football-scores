import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, EmptyState, LoadingState, PrimaryButton, SectionHeader } from '../../components/ui';
import { MatchCard } from '../../components/MatchCard';
import { fetchMatches, fetchTeams } from '../../providers/providerManager';
import { useFavorites } from '../../state/FavoritesContext';
import { usePreferences } from '../../state/PreferencesContext';
import { useWatchPlan } from '../../state/WatchPlanContext';
import { useReminders } from '../../state/RemindersContext';
import { usePredictions } from '../../state/PredictionsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { addDays, startOfLocalDay } from '../../utils/dates';
import { shouldShieldMatch } from '../../services/spoilerShield';
import type { Match, Team } from '../../types/domain';

export function CompetitionDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { competitionId } = route.params as { competitionId: string };
  const { t } = useTranslation();
  const theme = useTheme();
  const { favoriteCompetitionIds, favoriteTeamIds, toggleCompetition } = useFavorites();
  const { preferences } = usePreferences();
  const { getItem, addOrUpdate } = useWatchPlan();
  const { getReminderFor, setReminder, cancelReminder } = useReminders();
  const { getPredictionFor } = usePredictions();

  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const from = startOfLocalDay(addDays(new Date(), -7)).toISOString();
    const to = addDays(new Date(), 21).toISOString();
    const providerCompetitionId = competitionId.split(':').slice(1).join(':');
    Promise.all([
      fetchMatches({ dateFromUtc: from, dateToUtc: to, competitionProviderIds: [providerCompetitionId] }),
      fetchTeams(providerCompetitionId),
    ]).then(([matchesResult, teamsResult]) => {
      if (!mounted) return;
      setMatches(matchesResult.data.filter(m => m.competitionId === competitionId));
      setTeams(teamsResult.data);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [competitionId]);

  const upcoming = matches.filter(m => m.status === 'scheduled').slice(0, 10);
  const recent = matches.filter(m => m.status === 'finished').slice(0, 10);

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label={t('common.loading')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <View style={styles.header}>
          <PrimaryButton
            label={`${favoriteCompetitionIds.has(competitionId) ? '★' : '☆'} ${t('common.save')}`}
            onPress={() => toggleCompetition(competitionId)}
          />
          <PrimaryButton
            label={t('competitionDetails.standings')}
            style={{ marginTop: 10 }}
            onPress={() => navigation.navigate('Standings', { competitionId })}
          />
        </View>

        <SectionHeader title={t('competitionDetails.upcoming')} />
        {upcoming.length === 0 ? (
          <EmptyState title={t('matches.emptyTitle')} body={t('matches.emptyBody')} />
        ) : (
          upcoming.map(m => {
            const planItem = getItem(m.id) ?? null;
            const reminder = getReminderFor(m.id);
            return (
              <MatchCard
                key={m.id}
                match={m}
                spoilerShielded={shouldShieldMatch(m, planItem, preferences.defaultSpoilerShieldEnabled)}
                isFavorite={favoriteTeamIds.has(m.homeTeamId) || favoriteTeamIds.has(m.awayTeamId)}
                hasReminder={!!reminder && reminder.status === 'scheduled'}
                hasPrediction={!!getPredictionFor(m.id)}
                onPress={() => navigation.navigate('MatchDetails', { matchId: m.id, match: m })}
                onAddToMatchday={() => addOrUpdate(m.id, { manuallyAdded: true })}
                onToggleReminder={() => (reminder ? cancelReminder(m.id) : setReminder(m, preferences.defaultReminderOffsetMinutes))}
              />
            );
          })
        )}

        <SectionHeader title={t('competitionDetails.recentResults')} />
        {recent.length === 0 ? (
          <EmptyState title={t('matches.emptyTitle')} body="" />
        ) : (
          recent.map(m => {
            const planItem = getItem(m.id) ?? null;
            return (
              <MatchCard
                key={m.id}
                match={m}
                spoilerShielded={shouldShieldMatch(m, planItem, preferences.defaultSpoilerShieldEnabled)}
                isFavorite={favoriteTeamIds.has(m.homeTeamId) || favoriteTeamIds.has(m.awayTeamId)}
                hasReminder={false}
                hasPrediction={!!getPredictionFor(m.id)}
                onPress={() => navigation.navigate('MatchDetails', { matchId: m.id, match: m })}
              />
            );
          })
        )}

        <SectionHeader title={t('competitionDetails.teams')} />
        <Card>
          {teams.length === 0 ? (
            <Text style={{ color: theme.colors.textMuted }}>{t('common.dataUnavailable')}</Text>
          ) : (
            teams.map(team => (
              <Text
                key={team.id}
                style={{ color: theme.colors.textPrimary, paddingVertical: 6 }}
                onPress={() => navigation.navigate('TeamDetails', { teamId: team.id })}
              >
                {team.name}
              </Text>
            ))
          )}
        </Card>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8 },
});
