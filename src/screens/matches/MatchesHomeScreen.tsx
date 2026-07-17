import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../components/AppIcon';
import { FilterChip } from '../../components/FilterChip';
import { MatchCard } from '../../components/MatchCard';
import { EmptyState, LoadingState, PrimaryButton } from '../../components/ui';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useCompetitions } from '../../hooks/useCompetitions';
import { useMatchesRange } from '../../hooks/useMatchesRange';
import type { MatchesStackParamList } from '../../navigation/types';
import { useFavorites } from '../../state/FavoritesContext';
import { usePreferences } from '../../state/PreferencesContext';
import { useReminders } from '../../state/RemindersContext';
import { useWatchPlan } from '../../state/WatchPlanContext';
import { usePredictions } from '../../state/PredictionsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { addDays, endOfLocalDay, startOfLocalDay, upcomingWeekendRange } from '../../utils/dates';
import { shouldShieldMatch } from '../../services/spoilerShield';
import type { Match, MatchStatus, ProviderId } from '../../types/domain';

type Filter = 'all' | 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled' | 'favorites';

const STATUS_FOR_FILTER: Partial<Record<Filter, MatchStatus[]>> = {
  scheduled: ['scheduled'],
  live: ['live', 'half_time'],
  finished: ['finished'],
  postponed: ['postponed', 'suspended', 'abandoned'],
  cancelled: ['cancelled'],
};

const SOURCE_LABEL: Record<ProviderId, string> = {
  'api-football': 'API-Football',
  'football-data-org': 'football-data.org',
  openfootball: 'Community data',
  cached: 'Saved data',
};

type Props = NativeStackScreenProps<MatchesStackParamList, 'MatchesHome'>;

export function MatchesHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { preferences } = usePreferences();
  const { favoriteCompetitionIds, favoriteTeamIds, toggleTeam } = useFavorites();
  const { competitions } = useCompetitions();
  const { getItem, addOrUpdate } = useWatchPlan();
  const { getReminderFor, setReminder, cancelReminder } = useReminders();
  const { getPredictionFor } = usePredictions();

  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);

  const dateFromUtc = selectedDate.toISOString();
  const dateToUtc = endOfLocalDay(selectedDate).toISOString();
  const result = useMatchesRange(dateFromUtc, dateToUtc);

  const dateStrip = useMemo(() => {
    const days: Date[] = [];
    for (let offset = -2; offset <= 4; offset += 1) days.push(addDays(startOfLocalDay(new Date()), offset));
    return days;
  }, []);

  const filteredMatches = useMemo(() => result.matches.filter(match => {
    if (selectedCompetitionId && match.competitionId !== selectedCompetitionId) return false;
    if (filter === 'favorites') {
      if (!favoriteTeamIds.has(match.homeTeamId) && !favoriteTeamIds.has(match.awayTeamId)) return false;
    } else {
      const statuses = STATUS_FOR_FILTER[filter];
      if (statuses && !statuses.includes(match.status)) return false;
    }
    if (search.trim()) {
      const query = search.trim().toLocaleLowerCase();
      const searchable = `${match.homeTeamName} ${match.awayTeamName} ${match.competitionName}`.toLocaleLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  }), [result.matches, selectedCompetitionId, filter, favoriteTeamIds, search]);

  const favoriteCompetitions = competitions.filter(competition => favoriteCompetitionIds.has(competition.id));
  const locale = preferences.language === 'ar' ? 'ar' : 'en-US';
  const titleDate = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(selectedDate);

  const goToWeekend = () => setSelectedDate(upcomingWeekendRange().start);

  const renderItem = ({ item }: { item: Match }) => {
    const planItem = getItem(item.id) ?? null;
    const shielded = shouldShieldMatch(item, planItem, preferences.defaultSpoilerShieldEnabled);
    const reminder = getReminderFor(item.id);
    const homeFavorite = favoriteTeamIds.has(item.homeTeamId);
    const awayFavorite = favoriteTeamIds.has(item.awayTeamId);
    return (
      <MatchCard
        match={item}
        spoilerShielded={shielded}
        isFavorite={homeFavorite || awayFavorite}
        hasReminder={!!reminder && reminder.status === 'scheduled'}
        hasPrediction={!!getPredictionFor(item.id)}
        onPress={() => navigation.navigate('MatchDetails', { matchId: item.id, match: item })}
        onToggleFavorite={() => toggleTeam(homeFavorite ? item.homeTeamId : awayFavorite ? item.awayTeamId : item.homeTeamId)}
        onAddToMatchday={() => addOrUpdate(item.id, { manuallyAdded: true })}
        onToggleReminder={() => {
          if (reminder?.status === 'scheduled') cancelReminder(item.id);
          else setReminder(item, preferences.defaultReminderOffsetMinutes);
        }}
        onToggleSpoilerShield={() => addOrUpdate(item.id, {
          spoilerShieldEnabled: !(planItem?.spoilerShieldEnabled ?? preferences.defaultSpoilerShieldEnabled),
        })}
      />
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('matches.title')}</Text>
            <Text style={[styles.dateSubtitle, { color: theme.colors.textMuted }]}>{titleDate}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('news.title')}
            onPress={() => navigation.navigate('News')}
            hitSlop={8}
            style={({ pressed }) => [styles.headerAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.65 : 1 }]}
          >
            <AppIcon name="news" size={21} color={theme.colors.accent} />
          </Pressable>
        </View>
        <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <AppIcon name="search" size={19} color={theme.colors.textMuted} />
          <TextInput
            placeholder={t('matches.searchTeamsOrCompetitions')}
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.search, { color: theme.colors.textPrimary }]}
          />
        </View>
      </View>

      {favoriteCompetitions.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          <FilterChip label={t('matches.allCompetitions')} active={!selectedCompetitionId} onPress={() => setSelectedCompetitionId(null)} />
          {favoriteCompetitions.map(competition => (
            <FilterChip
              key={competition.id}
              label={competition.name}
              active={selectedCompetitionId === competition.id}
              onPress={() => setSelectedCompetitionId(competition.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateContent}>
        {dateStrip.map(date => {
          const selected = date.toDateString() === selectedDate.toDateString();
          return (
            <Pressable
              key={date.toISOString()}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setSelectedDate(date)}
              style={({ pressed }) => [
                styles.dateTile,
                {
                  backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
                  borderColor: selected ? theme.colors.accent : theme.colors.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <Text style={[styles.dateWeekday, { color: selected ? theme.colors.accentText : theme.colors.textMuted }]}>
                {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)}
              </Text>
              <Text style={[styles.dateDay, { color: selected ? theme.colors.accentText : theme.colors.textPrimary }]}>
                {new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={goToWeekend}
          style={({ pressed }) => [styles.weekendTile, { backgroundColor: theme.colors.accentSoft, opacity: pressed ? 0.7 : 1 }]}
        >
          <AppIcon name="calendar" size={17} color={theme.colors.accent} />
          <Text style={[styles.weekendLabel, { color: theme.colors.accent }]}>{t('matches.weekend')}</Text>
        </Pressable>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusContent}>
        {(['all', 'live', 'scheduled', 'finished', 'postponed', 'favorites'] as Filter[]).map(value => (
          <FilterChip
            key={value}
            compact
            label={t(`matches.filter${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
            active={filter === value}
            onPress={() => setFilter(value)}
          />
        ))}
      </ScrollView>

      {result.providerId ? (
        <View style={styles.metaRow}>
          <View style={[styles.sourcePill, { backgroundColor: theme.colors.surfaceAlt }]}>
            <View style={[styles.sourceDot, { backgroundColor: result.isStale ? theme.colors.warning : theme.colors.success }]} />
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
              {result.isFromCache ? t('matches.staleNotice') : SOURCE_LABEL[result.providerId]}
            </Text>
          </View>
          {result.errorMessage ? <Text style={[styles.metaText, { color: theme.colors.warning }]}>{t('errors.providerUnavailable')}</Text> : null}
        </View>
      ) : null}

      {result.loading ? (
        <LoadingState label={t('common.loading')} />
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, filteredMatches.length === 0 && styles.emptyList]}
          refreshing={result.refreshing}
          onRefresh={result.canRefresh ? () => result.refresh(true) : undefined}
          ListEmptyComponent={
            <EmptyState
              title={t('matches.emptyTitle')}
              body={t('matches.emptyBody')}
              action={<PrimaryButton label={t('matches.weekend')} onPress={goToWeekend} style={styles.emptyAction} />}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBlock: { paddingHorizontal: 16, paddingTop: 9, paddingBottom: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  title: { fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: -0.7 },
  dateSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  headerAction: { width: 42, height: 42, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { height: 46, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 },
  search: { flex: 1, height: 44, paddingVertical: 0, fontSize: 14 },
  chipsContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 3, gap: 8 },
  dateContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 8 },
  dateTile: { width: 55, height: 55, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateWeekday: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dateDay: { fontSize: 18, lineHeight: 22, fontWeight: '900' },
  weekendTile: { minWidth: 80, height: 55, borderRadius: 16, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', gap: 3 },
  weekendLabel: { fontSize: 10, fontWeight: '800' },
  statusContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 5, gap: 8 },
  metaRow: { minHeight: 31, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sourcePill: { height: 24, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 6 },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  metaText: { fontSize: 10, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingTop: 5, paddingBottom: 20 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyAction: { marginTop: 14 },
});
