import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MatchCard } from '../../components/MatchCard';
import { EmptyState, LoadingState } from '../../components/ui';
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
import { addDays, endOfLocalDay, formatKickoffDate, startOfLocalDay, upcomingWeekendRange } from '../../utils/dates';
import { shouldShieldMatch } from '../../services/spoilerShield';
import type { Match, MatchStatus } from '../../types/domain';

type Filter = 'all' | 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled' | 'favorites';

const STATUS_FOR_FILTER: Partial<Record<Filter, MatchStatus[]>> = {
  scheduled: ['scheduled'],
  live: ['live', 'half_time'],
  finished: ['finished'],
  postponed: ['postponed', 'suspended', 'abandoned'],
  cancelled: ['cancelled'],
};

type Props = NativeStackScreenProps<MatchesStackParamList, 'MatchesHome'>;

export function MatchesHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { preferences } = usePreferences();
  const { favoriteCompetitionIds, favoriteTeamIds } = useFavorites();
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
  const { matches, loading, refreshing, providerId, isFromCache, isStale, errorMessage, lastRefreshedAtUtc, refresh, canRefresh } =
    useMatchesRange(dateFromUtc, dateToUtc);

  const dateStrip = useMemo(() => {
    const days: Date[] = [];
    for (let offset = -2; offset <= 4; offset += 1) {
      days.push(addDays(startOfLocalDay(new Date()), offset));
    }
    return days;
  }, []);

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (selectedCompetitionId && m.competitionId !== selectedCompetitionId) return false;
      if (filter === 'favorites') {
        if (!favoriteTeamIds.has(m.homeTeamId) && !favoriteTeamIds.has(m.awayTeamId)) return false;
      } else {
        const statuses = STATUS_FOR_FILTER[filter];
        if (statuses && !statuses.includes(m.status)) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${m.homeTeamName} ${m.awayTeamName} ${m.competitionName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matches, filter, favoriteTeamIds, search, selectedCompetitionId]);

  const goToWeekend = () => {
    const { start } = upcomingWeekendRange();
    setSelectedDate(start);
  };

  const renderItem = ({ item }: { item: Match }) => {
    const planItem = getItem(item.id) ?? null;
    const shielded = shouldShieldMatch(item, planItem, preferences.defaultSpoilerShieldEnabled);
    const reminder = getReminderFor(item.id);
    return (
      <MatchCard
        match={item}
        spoilerShielded={shielded}
        isFavorite={favoriteTeamIds.has(item.homeTeamId) || favoriteTeamIds.has(item.awayTeamId)}
        hasReminder={!!reminder && reminder.status === 'scheduled'}
        hasPrediction={!!getPredictionFor(item.id)}
        onPress={() => navigation.navigate('MatchDetails', { matchId: item.id, match: item })}
        onAddToMatchday={() => addOrUpdate(item.id, { manuallyAdded: true })}
        onToggleReminder={() => {
          if (reminder && reminder.status === 'scheduled') {
            cancelReminder(item.id);
          } else {
            setReminder(item, preferences.defaultReminderOffsetMinutes);
          }
        }}
        onToggleSpoilerShield={() => addOrUpdate(item.id, { spoilerShieldEnabled: !(planItem?.spoilerShieldEnabled ?? preferences.defaultSpoilerShieldEnabled) })}
      />
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('matches.title')}</Text>
          <Pressable onPress={() => navigation.navigate('News')} hitSlop={8} style={styles.newsButton}>
            <Text style={{ fontSize: 20 }}>📰</Text>
          </Pressable>
        </View>
        <TextInput
          placeholder={t('matches.searchTeamsOrCompetitions')}
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
          style={[styles.search, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
        <Chip label={t('matches.allCompetitions')} active={!selectedCompetitionId} onPress={() => setSelectedCompetitionId(null)} />
        {competitions
          .filter(c => favoriteCompetitionIds.has(c.id))
          .map(c => (
            <Chip key={c.id} label={c.name} active={selectedCompetitionId === c.id} onPress={() => setSelectedCompetitionId(c.id)} />
          ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateStrip} contentContainerStyle={styles.chipsContent}>
        {dateStrip.map(d => (
          <Pressable
            key={d.toISOString()}
            onPress={() => setSelectedDate(d)}
            style={[
              styles.dateChip,
              {
                backgroundColor: d.toDateString() === selectedDate.toDateString() ? theme.colors.accent : theme.colors.surfaceAlt,
              },
            ]}
          >
            <Text style={{ color: d.toDateString() === selectedDate.toDateString() ? theme.colors.accentText : theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              {formatKickoffDate(d.toISOString(), preferences.language)}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={goToWeekend} style={[styles.dateChip, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{t('matches.weekend')}</Text>
        </Pressable>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
        {(['all', 'scheduled', 'live', 'finished', 'postponed', 'cancelled', 'favorites'] as Filter[]).map(f => (
          <Chip
            key={f}
            label={t(`matches.filter${f.charAt(0).toUpperCase()}${f.slice(1)}`)}
            active={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </ScrollView>

      {providerId ? (
        <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
          {isFromCache
            ? isStale
              ? t('matches.staleNotice')
              : t('matches.cachedNotice', { time: lastRefreshedAtUtc ?? '' })
            : t('matches.activeSource', { provider: providerId })}
        </Text>
      ) : null}
      {errorMessage ? (
        <Text style={[styles.metaText, { color: theme.colors.warning }]}>
          {t('matches.providerErrorNotice', { provider: providerId ?? '' })}
        </Text>
      ) : null}

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : filteredMatches.length === 0 ? (
        <EmptyState title={t('matches.emptyTitle')} body={t('matches.emptyBody')} />
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={canRefresh ? () => refresh(true) : undefined}
        />
      )}
    </ScreenContainer>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? theme.colors.accent : theme.colors.surfaceAlt }]}
    >
      <Text style={{ color: active ? theme.colors.accentText : theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerBlock: { paddingHorizontal: 16, paddingTop: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  newsButton: { padding: 4 },
  search: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  chipsRow: { marginTop: 8, maxHeight: 40 },
  dateStrip: { marginTop: 8, maxHeight: 40 },
  chipsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  dateChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  metaText: { fontSize: 11, paddingHorizontal: 16, marginTop: 6 },
  list: { paddingHorizontal: 16, paddingTop: 10 },
});
