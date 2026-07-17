import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Badge, Card, ErrorState, LoadingState, PrimaryButton, SectionHeader } from '../../components/ui';
import { fetchForm, fetchHeadToHead, resolveMatchById } from '../../providers/providerManager';
import type { MatchDetailsParams, MatchesStackParamList } from '../../navigation/types';
import { useFavorites } from '../../state/FavoritesContext';
import { usePreferences } from '../../state/PreferencesContext';
import { useReminders } from '../../state/RemindersContext';
import { useWatchPlan } from '../../state/WatchPlanContext';
import { usePredictions } from '../../state/PredictionsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { formatKickoffDate, formatKickoffTime } from '../../utils/dates';
import { shouldShieldMatch } from '../../services/spoilerShield';
import type { Match } from '../../types/domain';

type Nav = NativeStackNavigationProp<MatchesStackParamList, 'MatchDetails'>;

export function MatchDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const theme = useTheme();
  const params = route.params as MatchDetailsParams;
  const { preferences } = usePreferences();
  const { favoriteTeamIds, toggleTeam } = useFavorites();
  const { getItem, addOrUpdate } = useWatchPlan();
  const { getReminderFor, setReminder, cancelReminder } = useReminders();
  const { getPredictionFor, regradeIfNeeded } = usePredictions();

  const [match, setMatch] = useState<Match | null>(params.match ?? null);
  const [loading, setLoading] = useState(!params.match);
  const [notFound, setNotFound] = useState(false);
  const [h2h, setH2h] = useState<{ matches: Match[]; totalMeetings: number } | null>(null);
  const [homeForm, setHomeForm] = useState<string[]>([]);
  const [awayForm, setAwayForm] = useState<string[]>([]);

  useEffect(() => {
    if (params.match) return;
    let mounted = true;
    setLoading(true);
    resolveMatchById(params.matchId).then(result => {
      if (!mounted) return;
      if (result) setMatch(result);
      else setNotFound(true);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [params.matchId, params.match]);

  useEffect(() => {
    if (!match) return;
    void regradeIfNeeded(match);
    const [homeProviderId] = match.homeTeamId.split(':').slice(1);
    const [awayProviderId] = match.awayTeamId.split(':').slice(1);
    fetchHeadToHead(homeProviderId, awayProviderId).then(r => setH2h(r.data));
    fetchForm(homeProviderId).then(r => setHomeForm(r.data.lastFive));
    fetchForm(awayProviderId).then(r => setAwayForm(r.data.lastFive));
  }, [match, regradeIfNeeded]);

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label={t('common.loading')} />
      </ScreenContainer>
    );
  }

  if (notFound || !match) {
    return (
      <ScreenContainer>
        <ErrorState message={t('common.dataUnavailable')} retryLabel={t('common.back')} onRetry={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const planItem = getItem(match.id) ?? null;
  const shielded = shouldShieldMatch(match, planItem, preferences.defaultSpoilerShieldEnabled);
  const reminder = getReminderFor(match.id);
  const prediction = getPredictionFor(match.id);
  const timeLabel = formatKickoffTime(match.kickoffUtc, match.kickoffUnknown, preferences.clock, preferences.language, t('common.timeNotConfirmed'));
  const dateLabel = match.kickoffUtc ? formatKickoffDate(match.kickoffUtc, preferences.language) : t('common.unknown');

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <View style={styles.header}>
          <Text style={[styles.competition, { color: theme.colors.textMuted }]}>{match.competitionName}</Text>
          <Text style={[styles.matchup, { color: theme.colors.textPrimary }]}>
            {match.homeTeamName} vs {match.awayTeamName}
          </Text>
          <Text style={[styles.dateTime, { color: theme.colors.textSecondary }]}>{dateLabel} · {timeLabel}</Text>
          <Badge label={t(`matchStatus.${match.status}`)} tone={match.status === 'live' ? 'danger' : 'neutral'} />
        </View>

        {shielded ? (
          <Card style={styles.section}>
            <Text style={{ color: theme.colors.warning, fontWeight: '700' }}>{t('spoiler.resultHidden')}</Text>
            <PrimaryButton
              label={t('matchday.revealOnce')}
              style={{ marginTop: 10 }}
              onPress={() => addOrUpdate(match.id, { spoilerRevealed: true })}
            />
          </Card>
        ) : (
          (match.fullTimeScore || match.currentScore) && (
            <Card style={styles.section}>
              <SectionHeader title={t('matchDetails.fullTime')} />
              <Text style={[styles.scoreLine, { color: theme.colors.textPrimary }]}>
                {(match.currentScore ?? match.fullTimeScore)?.home ?? '–'} : {(match.currentScore ?? match.fullTimeScore)?.away ?? '–'}
              </Text>
              {match.halfTimeScore ? (
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {t('matchDetails.halfTime')}: {match.halfTimeScore.home} : {match.halfTimeScore.away}
                </Text>
              ) : null}
              {match.extraTimeScore ? (
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {t('matchDetails.extraTime')}: {match.extraTimeScore.home} : {match.extraTimeScore.away}
                </Text>
              ) : null}
              {match.penaltyScore ? (
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {t('matchDetails.penalties')}: {match.penaltyScore.home} : {match.penaltyScore.away}
                </Text>
              ) : null}
            </Card>
          )
        )}

        <Card style={styles.section}>
          <SectionHeader title={t('tabs.matches')} />
          <Row label={t('matchDetails.venue')} value={match.venue ?? t('common.dataUnavailable')} theme={theme} />
          <Row label={t('matchDetails.dataSource')} value={match.attribution} theme={theme} />
          {match.lastProviderUpdateUtc ? (
            <Row label={t('matchDetails.lastUpdated')} value={new Date(match.lastProviderUpdateUtc).toLocaleString()} theme={theme} />
          ) : null}
        </Card>

        {(homeForm.length > 0 || awayForm.length > 0) && !shielded ? (
          <Card style={styles.section}>
            <SectionHeader title={t('matchDetails.recentForm')} />
            <Row label={match.homeTeamName} value={homeForm.join(' ') || t('common.dataUnavailable')} theme={theme} />
            <Row label={match.awayTeamName} value={awayForm.join(' ') || t('common.dataUnavailable')} theme={theme} />
          </Card>
        ) : null}

        <Card style={styles.section}>
          <SectionHeader title={t('matchDetails.headToHead')} />
          {h2h && h2h.matches.length > 0 ? (
            h2h.matches.slice(0, 5).map(m => (
              <Row
                key={m.id}
                label={formatKickoffDate(m.kickoffUtc ?? new Date().toISOString(), preferences.language)}
                value={m.fullTimeScore ? `${m.homeTeamName} ${m.fullTimeScore.home}-${m.fullTimeScore.away} ${m.awayTeamName}` : t('common.dataUnavailable')}
                theme={theme}
              />
            ))
          ) : (
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{t('matchDetails.noHeadToHead')}</Text>
          )}
        </Card>

        <View style={styles.actionsRow}>
          <PrimaryButton
            label={`${favoriteTeamIds.has(match.homeTeamId) ? '★' : '☆'} ${match.homeTeamName}`}
            onPress={() => toggleTeam(match.homeTeamId)}
            style={styles.actionButton}
          />
          <PrimaryButton
            label={`${favoriteTeamIds.has(match.awayTeamId) ? '★' : '☆'} ${match.awayTeamName}`}
            onPress={() => toggleTeam(match.awayTeamId)}
            style={styles.actionButton}
          />
        </View>

        <View style={styles.actionsRow}>
          <PrimaryButton
            label={reminder && reminder.status === 'scheduled' ? t('matches.cancelReminder') : t('matches.setReminder')}
            onPress={() => (reminder && reminder.status === 'scheduled' ? cancelReminder(match.id) : setReminder(match, preferences.defaultReminderOffsetMinutes))}
            style={styles.actionButton}
          />
          <PrimaryButton
            label={planItem ? t('matches.removeFromMatchday') : t('matches.addToMatchday')}
            onPress={() => addOrUpdate(match.id, { manuallyAdded: true })}
            style={styles.actionButton}
          />
        </View>

        <View style={styles.actionsRow}>
          <PrimaryButton
            label={prediction ? t('predict.editPrediction') : t('predict.addPrediction')}
            onPress={() => (navigation as any).navigate('PredictTab', { screen: 'PredictionEditor', params: { matchId: match.id, match } })}
            style={styles.actionButton}
          />
        </View>
      </SafeScrollView>
    </ScreenContainer>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.colors.textPrimary }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, alignItems: 'center' },
  competition: { fontSize: 12, marginBottom: 4 },
  matchup: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  dateTime: { fontSize: 13, marginVertical: 6 },
  section: { marginHorizontal: 16, marginTop: 14 },
  scoreLine: { fontSize: 24, fontWeight: '800', marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 12, flex: 1 },
  rowValue: { fontSize: 12, flex: 1, textAlign: 'right', fontWeight: '600' },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 10 },
  actionButton: { flex: 1 },
});
