import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../components/AppIcon';
import { TeamCrest } from '../../components/TeamCrest';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, EmptyState, LoadingState, PrimaryButton, SectionHeader } from '../../components/ui';
import { MatchCard } from '../../components/MatchCard';
import { useCompetitions } from '../../hooks/useCompetitions';
import { fetchMatches, fetchTeams } from '../../providers/providerManager';
import { usePreferences } from '../../state/PreferencesContext';
import { useReminders } from '../../state/RemindersContext';
import { useTheme } from '../../theme/ThemeProvider';
import { addDays, startOfLocalDay } from '../../utils/dates';
import { flagForCountry } from '../../utils/countryFlags';
import type { Match, Team } from '../../types/domain';

export function CompetitionDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { competitionId } = route.params as { competitionId: string };
  const { t } = useTranslation();
  const theme = useTheme();
  const { competitions } = useCompetitions();
  const { preferences } = usePreferences();
  const { getReminderFor, setReminder, cancelReminder } = useReminders();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const competition = competitions.find(item => item.id === competitionId);

  useEffect(() => {
    let mounted = true;
    const from = startOfLocalDay(addDays(new Date(), -7)).toISOString();
    const to = addDays(new Date(), 21).toISOString();
    const providerCompetitionId = competitionId.split(':').slice(1).join(':');
    Promise.all([
      fetchMatches({ dateFromUtc: from, dateToUtc: to, competitionProviderIds: [providerCompetitionId] }),
      fetchTeams(providerCompetitionId),
    ]).then(([matchesResult, teamsResult]) => {
      if (!mounted) return;
      setMatches(matchesResult.data.filter(match => match.competitionId === competitionId));
      setTeams(teamsResult.data);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [competitionId]);

  if (loading) return <ScreenContainer><LoadingState label={t('common.loading')} /></ScreenContainer>;
  const upcoming = matches.filter(match => match.status === 'scheduled').slice(0, 10);
  const recent = matches.filter(match => match.status === 'finished').slice(0, 10);

  const renderMatch = (match: Match, upcomingMatch: boolean) => {
    const reminder = getReminderFor(match.id);
    return (
      <MatchCard
        key={match.id}
        match={match}
        hasReminder={upcomingMatch && !!reminder && reminder.status === 'scheduled'}
        onPress={() => navigation.navigate('MatchDetails', { matchId: match.id, match })}
        onToggleReminder={upcomingMatch ? () => reminder?.status === 'scheduled' ? cancelReminder(match.id) : setReminder(match, preferences.defaultReminderOffsetMinutes) : undefined}
      />
    );
  };

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={24}>
        <View style={styles.header}>
          <TeamCrest uri={competition?.emblemUrl} name={competition?.name ?? competitionId} size={68} />
          <View style={styles.headerText}>
            <Text style={[styles.competitionName, { color: theme.colors.textPrimary }]}>{competition?.name ?? t('competitionDetails.title')}</Text>
            <Text style={[styles.competitionMeta, { color: theme.colors.textMuted }]}>{flagForCountry(competition?.country)}  {competition?.country ?? 'International'}</Text>
          </View>
        </View>
        <View style={styles.standingsAction}>
          <PrimaryButton label={t('competitionDetails.standings')} onPress={() => navigation.navigate('Standings', { competitionId })} />
        </View>

        <View style={styles.sectionHeader}><SectionHeader title={t('competitionDetails.upcoming')} /></View>
        <View style={styles.matchList}>
          {upcoming.length ? upcoming.map(match => renderMatch(match, true)) : <EmptyState title={t('matches.emptyTitle')} body={t('matches.emptyBody')} />}
        </View>

        <View style={styles.sectionHeader}><SectionHeader title={t('competitionDetails.recentResults')} /></View>
        <View style={styles.matchList}>
          {recent.length ? recent.map(match => renderMatch(match, false)) : <EmptyState title={t('matches.emptyTitle')} body="" />}
        </View>

        <View style={styles.sectionHeader}><SectionHeader title={t('competitionDetails.teams')} /></View>
        <Card style={styles.teamsCard}>
          {teams.length ? teams.map(team => (
            <Pressable key={team.id} onPress={() => navigation.navigate('TeamDetails', { teamId: team.id })} style={[styles.teamRow, { borderBottomColor: theme.colors.border }]}>
              <TeamCrest uri={team.crestUrl} name={team.name} initials={team.initials} size={36} />
              <Text style={[styles.teamName, { color: theme.colors.textPrimary }]}>{team.name}</Text>
              <AppIcon name="chevronRight" size={17} color={theme.colors.textMuted} />
            </Pressable>
          )) : <Text style={{ color: theme.colors.textMuted }}>{t('common.dataUnavailable')}</Text>}
        </Card>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 13 },
  headerText: { flex: 1 },
  competitionName: { fontSize: 21, fontWeight: '900' },
  competitionMeta: { fontSize: 11, marginTop: 4 },
  standingsAction: { paddingHorizontal: 16, marginTop: 12 },
  sectionHeader: { paddingHorizontal: 16 },
  matchList: { paddingHorizontal: 16 },
  teamsCard: { marginHorizontal: 16, paddingVertical: 3 },
  teamRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  teamName: { flex: 1, fontSize: 13, fontWeight: '800' },
});
