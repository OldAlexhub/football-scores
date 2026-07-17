import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { MatchCard } from '../../components/MatchCard';
import { EmptyState, LoadingState, PrimaryButton, SecondaryButton, SectionHeader } from '../../components/ui';
import { useMatchesRange } from '../../hooks/useMatchesRange';
import { useFavorites } from '../../state/FavoritesContext';
import { usePreferences } from '../../state/PreferencesContext';
import { useReminders } from '../../state/RemindersContext';
import { useWatchPlan } from '../../state/WatchPlanContext';
import { usePredictions } from '../../state/PredictionsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { findGaps, groupClashes } from '../../services/clashDetection';
import { shouldShieldMatch } from '../../services/spoilerShield';
import { upcomingWeekendRange } from '../../utils/dates';
import { buildIcsCalendar, writeAndShareTextFile } from '../../services/exportService';
import { maybeShowInterstitial } from '../../ads/InterstitialManager';

export function WeekendPlannerScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { preferences } = usePreferences();
  const { favoriteTeamIds, favoriteCompetitionIds } = useFavorites();
  const { items, getItem } = useWatchPlan();
  const { getReminderFor, setReminder, cancelReminder } = useReminders();
  const { getPredictionFor } = usePredictions();
  const [range] = useState(() => upcomingWeekendRange());

  const { matches, loading } = useMatchesRange(range.start.toISOString(), range.end.toISOString());

  const relevant = useMemo(() => {
    return matches
      .filter(m => favoriteTeamIds.has(m.homeTeamId) || favoriteTeamIds.has(m.awayTeamId) || favoriteCompetitionIds.has(m.competitionId) || items.some(i => i.matchId === m.id))
      .sort((a, b) => {
        const aTime = a.kickoffUtc ? new Date(a.kickoffUtc).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.kickoffUtc ? new Date(b.kickoffUtc).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
  }, [matches, favoriteTeamIds, favoriteCompetitionIds, items]);

  const clashGroups = useMemo(() => groupClashes(
    relevant.map(m => ({
      matchId: m.id,
      kickoffUtc: m.kickoffUtc,
      kickoffUnknown: m.kickoffUnknown,
      estimatedDurationMinutes: getItem(m.id)?.estimatedDurationMinutes ?? 120,
      extraTimePossible: m.extraTimePossible,
      priority: getItem(m.id)?.priority ?? 'normal',
      isFavoriteTeamMatch: favoriteTeamIds.has(m.homeTeamId) || favoriteTeamIds.has(m.awayTeamId),
      watchLater: getItem(m.id)?.watchLater ?? false,
    })),
  ), [relevant, getItem, favoriteTeamIds]);

  const gaps = useMemo(() => findGaps(
    relevant.map(m => ({
      matchId: m.id,
      kickoffUtc: m.kickoffUtc,
      kickoffUnknown: m.kickoffUnknown,
      estimatedDurationMinutes: getItem(m.id)?.estimatedDurationMinutes ?? 120,
      extraTimePossible: m.extraTimePossible,
      priority: 'normal' as const,
      isFavoriteTeamMatch: false,
      watchLater: false,
    })),
  ), [relevant, getItem]);

  const handleShare = async () => {
    const lines = relevant.map(m => `${m.homeTeamName} vs ${m.awayTeamName} — ${m.kickoffUtc ? new Date(m.kickoffUtc).toLocaleString() : t('common.timeNotConfirmed')}`);
    const text = [t('weekendPlanner.title'), ...lines].join('\n');
    await writeAndShareTextFile('weekend-plan', 'txt', text, 'text/plain');
    await maybeShowInterstitial('weekend_planner_share');
  };

  const handleIcs = async () => {
    const events = relevant.filter(m => m.kickoffUtc).map(m => ({
      uid: m.id,
      title: `${m.homeTeamName} vs ${m.awayTeamName}`,
      description: m.competitionName,
      startUtc: m.kickoffUtc as string,
      endUtc: new Date(new Date(m.kickoffUtc as string).getTime() + (getItem(m.id)?.estimatedDurationMinutes ?? 120) * 60000).toISOString(),
      location: m.venue ?? undefined,
    }));
    const ics = buildIcsCalendar(events);
    await writeAndShareTextFile('weekend-plan', 'ics', ics, 'text/calendar');
  };

  const handleDone = async () => {
    await maybeShowInterstitial('weekend_planner_done');
    navigation.goBack();
  };

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
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('weekendPlanner.title')}</Text>
        <Text style={{ color: theme.colors.textMuted, paddingHorizontal: 16 }}>{t('weekendPlanner.fridayToSunday')}</Text>

        {relevant.length === 0 ? (
          <EmptyState title={t('weekendPlanner.noMatches')} body="" />
        ) : (
          <View style={styles.section}>
            <SectionHeader title={t('weekendPlanner.timeline')} />
            {relevant.map(m => {
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
                  onToggleReminder={() => (reminder ? cancelReminder(m.id) : setReminder(m, preferences.defaultReminderOffsetMinutes))}
                />
              );
            })}
          </View>
        )}

        {clashGroups.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('matchday.clashWarnings')} />
            {clashGroups.map(g => (
              <SecondaryButton
                key={g.matchIds.join('-')}
                label={t('clash.conflictingMatches', { count: g.matchIds.length })}
                onPress={() => navigation.navigate('ClashDetails', { matchIds: g.matchIds })}
                style={{ marginBottom: 8 }}
              />
            ))}
          </View>
        ) : null}

        {gaps.filter(g => g.gapMinutes > 0).length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('weekendPlanner.freeGap')} />
            {gaps.filter(g => g.gapMinutes > 0).map(g => (
              <Text key={`${g.afterMatchId}-${g.beforeMatchId}`} style={{ color: theme.colors.textMuted, fontSize: 12, marginBottom: 4 }}>
                {t('clash.gapMinutes', { minutes: g.gapMinutes })}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.actionsBlock}>
          <PrimaryButton label={t('weekendPlanner.generateShare')} onPress={handleShare} style={{ marginBottom: 10 }} />
          <SecondaryButton label={t('matchday.generateIcs')} onPress={handleIcs} style={{ marginBottom: 10 }} />
          <SecondaryButton label={t('common.done')} onPress={handleDone} />
        </View>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  section: { paddingHorizontal: 16, marginTop: 10 },
  actionsBlock: { paddingHorizontal: 16, marginTop: 20 },
});
