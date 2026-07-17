import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { MatchCard } from '../../components/MatchCard';
import { EmptyState, LoadingState, PrimaryButton, SectionHeader } from '../../components/ui';
import { useResolvedMatches } from '../../hooks/useResolvedMatches';
import type { MatchdayStackParamList } from '../../navigation/types';
import { useFavorites } from '../../state/FavoritesContext';
import { usePreferences } from '../../state/PreferencesContext';
import { useReminders } from '../../state/RemindersContext';
import { useWatchPlan } from '../../state/WatchPlanContext';
import { usePredictions } from '../../state/PredictionsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { groupClashes } from '../../services/clashDetection';
import { shouldShieldMatch } from '../../services/spoilerShield';
import { startOfLocalDay, endOfLocalDay, addDays, upcomingWeekendRange } from '../../utils/dates';
import type { Match } from '../../types/domain';

type Props = NativeStackScreenProps<MatchdayStackParamList, 'MatchdayHome'>;

export function MatchdayHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { items, loading: planLoading } = useWatchPlan();
  const { favoriteTeamIds } = useFavorites();
  const { preferences } = usePreferences();
  const { getReminderFor, setReminder, cancelReminder } = useReminders();
  const { getPredictionFor } = usePredictions();

  const matchIds = useMemo(() => items.map(i => i.matchId), [items]);
  const { matches, loading: matchesLoading } = useResolvedMatches(matchIds);
  const loading = planLoading || matchesLoading;

  const enriched = useMemo(() => {
    return items
      .map(item => ({ item, match: matches[item.matchId] }))
      .filter((x): x is { item: typeof items[number]; match: Match } => !!x.match);
  }, [items, matches]);

  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);
  const tomorrowStart = startOfLocalDay(addDays(now, 1));
  const tomorrowEnd = endOfLocalDay(addDays(now, 1));
  const weekend = upcomingWeekendRange(now);

  const notWatched = enriched.filter(e => !e.item.watched);
  const nextMatch = notWatched
    .filter(e => e.match.kickoffUtc && new Date(e.match.kickoffUtc).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.match.kickoffUtc as string).getTime() - new Date(b.match.kickoffUtc as string).getTime())[0];

  const inRange = (m: Match, start: Date, end: Date) =>
    m.kickoffUtc && new Date(m.kickoffUtc).getTime() >= start.getTime() && new Date(m.kickoffUtc).getTime() <= end.getTime();

  const todayItems = notWatched.filter(e => inRange(e.match, todayStart, todayEnd));
  const tomorrowItems = notWatched.filter(e => inRange(e.match, tomorrowStart, tomorrowEnd));
  const weekendItems = notWatched.filter(e => inRange(e.match, weekend.start, weekend.end));
  const watchLaterItems = enriched.filter(e => e.item.watchLater && !e.item.watched);
  const spoilerItems = enriched.filter(e => shouldShieldMatch(e.match, e.item, preferences.defaultSpoilerShieldEnabled));
  const watchedItems = enriched.filter(e => e.item.watched).slice(0, 10);

  const clashGroups = useMemo(() => {
    return groupClashes(
      notWatched.map(e => ({
        matchId: e.match.id,
        kickoffUtc: e.match.kickoffUtc,
        kickoffUnknown: e.match.kickoffUnknown,
        estimatedDurationMinutes: e.item.estimatedDurationMinutes,
        extraTimePossible: e.match.extraTimePossible,
        priority: e.item.priority,
        isFavoriteTeamMatch: favoriteTeamIds.has(e.match.homeTeamId) || favoriteTeamIds.has(e.match.awayTeamId),
        watchLater: e.item.watchLater,
      })),
    );
  }, [notWatched, favoriteTeamIds]);

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label={t('common.loading')} />
      </ScreenContainer>
    );
  }

  if (items.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          title={t('matchday.emptyTitle')}
          body={t('matchday.emptyBody')}
          action={
            <PrimaryButton
              label={t('matchday.browseMatches')}
              style={{ marginTop: 12 }}
              onPress={() => (navigation.getParent() as any)?.navigate('MatchesTab', { screen: 'MatchesHome' })}
            />
          }
        />
      </ScreenContainer>
    );
  }

  const renderCard = ({ item, match }: { item: typeof items[number]; match: Match }) => {
    const reminder = getReminderFor(match.id);
    return (
      <MatchCard
        key={match.id}
        match={match}
        spoilerShielded={shouldShieldMatch(match, item, preferences.defaultSpoilerShieldEnabled)}
        isFavorite={favoriteTeamIds.has(match.homeTeamId) || favoriteTeamIds.has(match.awayTeamId)}
        hasReminder={!!reminder && reminder.status === 'scheduled'}
        hasPrediction={!!getPredictionFor(match.id)}
        onPress={() => navigation.navigate('MatchDetails', { matchId: match.id, match })}
        onToggleReminder={() => (reminder ? cancelReminder(match.id) : setReminder(match, preferences.defaultReminderOffsetMinutes))}
      />
    );
  };

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('matchday.title')}</Text>

        {nextMatch ? (
          <View style={styles.section}>
            <SectionHeader title={t('matchday.nextMatch')} />
            {renderCard(nextMatch)}
          </View>
        ) : null}

        {clashGroups.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('matchday.clashWarnings')} />
            {clashGroups.map(group => (
              <PrimaryButton
                key={group.matchIds.join('-')}
                label={t('clash.conflictingMatches', { count: group.matchIds.length })}
                onPress={() => navigation.navigate('ClashDetails', { matchIds: group.matchIds })}
                style={styles.clashButton}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title={t('matchday.today')} />
          {todayItems.length === 0 ? <Text style={{ color: theme.colors.textMuted }}>{t('matches.emptyBody')}</Text> : todayItems.map(renderCard)}
        </View>

        <View style={styles.section}>
          <SectionHeader title={t('matchday.tomorrow')} />
          {tomorrowItems.length === 0 ? <Text style={{ color: theme.colors.textMuted }}>{t('matches.emptyBody')}</Text> : tomorrowItems.map(renderCard)}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title={t('matchday.thisWeekend')}
            action={<PrimaryButton label={t('weekendPlanner.title')} onPress={() => navigation.navigate('WeekendPlanner')} />}
          />
          {weekendItems.length === 0 ? <Text style={{ color: theme.colors.textMuted }}>{t('matches.emptyBody')}</Text> : weekendItems.map(renderCard)}
        </View>

        {watchLaterItems.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('matchday.watchLater')} />
            {watchLaterItems.map(renderCard)}
          </View>
        ) : null}

        {spoilerItems.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('matchday.spoilerProtected')} />
            {spoilerItems.map(renderCard)}
          </View>
        ) : null}

        {watchedItems.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('matchday.recentlyWatched')} />
            {watchedItems.map(renderCard)}
          </View>
        ) : null}
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  section: { paddingHorizontal: 16 },
  clashButton: { marginBottom: 8 },
});
