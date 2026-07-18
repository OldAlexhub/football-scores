import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../components/AppIcon';
import { InFeedNativeAd } from '../../ads/InFeedNativeAd';
import { maybeShowInterstitial } from '../../ads/InterstitialManager';
import { FilterChip } from '../../components/FilterChip';
import { MatchCard } from '../../components/MatchCard';
import { SafeModalContainer } from '../../components/SafeModalContainer';
import { EmptyState, LoadingState, PrimaryButton } from '../../components/ui';
import { ScreenContainer } from '../../components/ScreenContainer';
import { COMPETITION_CATALOG, type CompetitionCategory } from '../../config/competitionCatalog';
import { useMatchesRange } from '../../hooks/useMatchesRange';
import { fetchMatchPrediction } from '../../providers/providerManager';
import type { MatchesStackParamList } from '../../navigation/types';
import { usePreferences } from '../../state/PreferencesContext';
import { useReminders } from '../../state/RemindersContext';
import { useTheme } from '../../theme/ThemeProvider';
import { addDays, endOfLocalDay, startOfLocalDay, upcomingWeekendRange } from '../../utils/dates';
import type { Match, MatchPrediction, MatchStatus, ProviderId } from '../../types/domain';

type Filter = 'all' | 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

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
  thesportsdb: 'TheSportsDB',
  espn: 'ESPN',
  cached: 'Saved data',
};

const PICKER_CATEGORY_ORDER: CompetitionCategory[] = ['international', 'club', 'domestic'];

type Props = NativeStackScreenProps<MatchesStackParamList, 'MatchesHome'>;

export function MatchesHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { preferences } = usePreferences();
  const { getReminderFor, setReminder, cancelReminder } = useReminders();

  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selectedCompetitionKey, setSelectedCompetitionKey] = useState<string | null>(null);
  const [competitionPickerOpen, setCompetitionPickerOpen] = useState(false);
  const [competitionSearch, setCompetitionSearch] = useState('');
  const [modelPredictions, setModelPredictions] = useState<Record<string, MatchPrediction>>({});

  const dateFromUtc = selectedDate.toISOString();
  const dateToUtc = endOfLocalDay(selectedDate).toISOString();
  const selectedCompetition = COMPETITION_CATALOG.find(item => item.key === selectedCompetitionKey) ?? null;
  const result = useMatchesRange(dateFromUtc, dateToUtc, selectedCompetition?.canonicalId);

  const dateStrip = useMemo(() => {
    const days: Date[] = [];
    for (let offset = -2; offset <= 4; offset += 1) days.push(addDays(startOfLocalDay(new Date()), offset));
    return days;
  }, []);

  const filteredMatches = useMemo(() => result.matches.filter(match => {
    if (selectedCompetitionKey) {
      const selected = COMPETITION_CATALOG.find(item => item.key === selectedCompetitionKey);
      if (selected && !selected.names.some(name => name === match.competitionName)) return false;
    }
    const statuses = STATUS_FOR_FILTER[filter];
    if (statuses && !statuses.includes(match.status)) return false;
    if (search.trim()) {
      const query = search.trim().toLocaleLowerCase();
      const searchable = `${match.homeTeamName} ${match.awayTeamName} ${match.competitionName}`.toLocaleLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  }), [result.matches, selectedCompetitionKey, filter, search]);
  const normalizedCompetitionSearch = competitionSearch.trim().toLocaleLowerCase();
  const pickerGroups = PICKER_CATEGORY_ORDER.map(category => ({
    category,
    competitions: COMPETITION_CATALOG.filter(competition => competition.category === category
      && (!normalizedCompetitionSearch
        || `${competition.label} ${competition.names.join(' ')}`.toLocaleLowerCase().includes(normalizedCompetitionSearch))),
  })).filter(group => group.competitions.length > 0);
  const locale = preferences.language === 'ar' ? 'ar' : 'en-US';
  const titleDate = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(selectedDate);

  const goToWeekend = () => setSelectedDate(upcomingWeekendRange().start);

  useEffect(() => {
    let mounted = true;
    const candidates = result.matches
      .filter(match => match.status === 'scheduled')
      .slice(0, 6);
    Promise.all(candidates.map(async match => ({ matchId: match.id, prediction: await fetchMatchPrediction(match) }))).then(items => {
      if (!mounted) return;
      setModelPredictions(current => {
        const next = { ...current };
        items.forEach(item => { if (item.prediction) next[item.matchId] = item.prediction; });
        return next;
      });
    });
    return () => { mounted = false; };
  }, [result.matches]);

  const renderItem = ({ item, index }: { item: Match; index: number }) => {
    const reminder = getReminderFor(item.id);
    return (
      <>
        <MatchCard
        match={item}
        hasReminder={!!reminder && reminder.status === 'scheduled'}
        modelPrediction={modelPredictions[item.id]}
        onPress={async () => {
          await maybeShowInterstitial('match_detail_open');
          navigation.navigate('MatchDetails', { matchId: item.id, match: item });
        }}
        onToggleReminder={item.status === 'scheduled' ? () => {
          if (reminder?.status === 'scheduled') cancelReminder(item.id);
          else setReminder(item, preferences.defaultReminderOffsetMinutes);
        } : undefined}
        />
        {index === 1 ? <InFeedNativeAd compact /> : null}
      </>
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

      <View style={styles.competitionSelectorWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('matches.chooseCompetition')}
          onPress={() => setCompetitionPickerOpen(true)}
          style={({ pressed }) => [
            styles.competitionSelector,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.72 : 1 },
          ]}
        >
          <View style={[styles.competitionSelectorIcon, { backgroundColor: theme.colors.accentSoft }]}>
            <AppIcon name="trophy" size={19} color={theme.colors.accent} />
          </View>
          <View style={styles.competitionSelectorText}>
            <Text style={[styles.competitionSelectorLabel, { color: theme.colors.textMuted }]}>{t('matches.competition')}</Text>
            <Text style={[styles.competitionSelectorValue, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {selectedCompetition?.label ?? t('matches.allCompetitions')}
            </Text>
          </View>
          <View style={styles.selectorChevron}><AppIcon name="chevronRight" size={18} color={theme.colors.textMuted} /></View>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateStrip}
        contentContainerStyle={styles.dateContent}
      >
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statusStrip}
        contentContainerStyle={styles.statusContent}
      >
        {(['all', 'live', 'scheduled', 'finished', 'postponed'] as Filter[]).map(value => (
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

      <SafeModalContainer visible={competitionPickerOpen} onRequestClose={() => setCompetitionPickerOpen(false)}>
        <View style={styles.pickerHeader}>
          <View>
            <Text style={[styles.pickerTitle, { color: theme.colors.textPrimary }]}>{t('matches.chooseCompetition')}</Text>
            <Text style={[styles.pickerSubtitle, { color: theme.colors.textMuted }]}>{t('matches.chooseCompetitionBody')}</Text>
          </View>
          <Pressable onPress={() => setCompetitionPickerOpen(false)} hitSlop={8}>
            <Text style={[styles.pickerDone, { color: theme.colors.accent }]}>{t('common.done')}</Text>
          </Pressable>
        </View>
        <View style={[styles.pickerSearch, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
          <AppIcon name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={competitionSearch}
            onChangeText={setCompetitionSearch}
            placeholder={t('matches.searchCompetitions')}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.pickerSearchInput, { color: theme.colors.textPrimary }]}
          />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!normalizedCompetitionSearch ? (
            <CompetitionPickerRow
              label={t('matches.allCompetitions')}
              selected={!selectedCompetitionKey}
              onPress={() => { setSelectedCompetitionKey(null); setCompetitionPickerOpen(false); }}
            />
          ) : null}
          {pickerGroups.map(group => (
            <View key={group.category}>
              <Text style={[styles.pickerSection, { color: theme.colors.textMuted }]}>{t(`matches.category${group.category.charAt(0).toUpperCase()}${group.category.slice(1)}`)}</Text>
              {group.competitions.map(competition => (
                <CompetitionPickerRow
                  key={competition.key}
                  label={competition.label}
                  selected={selectedCompetitionKey === competition.key}
                  onPress={() => { setSelectedCompetitionKey(competition.key); setCompetitionPickerOpen(false); }}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeModalContainer>
    </ScreenContainer>
  );
}

function CompetitionPickerRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.pickerRow, { backgroundColor: selected ? theme.colors.accentSoft : 'transparent', opacity: pressed ? 0.68 : 1 }]}
    >
      <Text style={[styles.pickerRowLabel, { color: selected ? theme.colors.accent : theme.colors.textPrimary }]}>{label}</Text>
      <View style={[styles.radioOuter, { borderColor: selected ? theme.colors.accent : theme.colors.border }]}>
        {selected ? <View style={[styles.radioInner, { backgroundColor: theme.colors.accent }]} /> : null}
      </View>
    </Pressable>
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
  competitionSelectorWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 },
  competitionSelector: { minHeight: 56, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  competitionSelectorIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  competitionSelectorText: { flex: 1 },
  competitionSelectorLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  competitionSelectorValue: { fontSize: 14, lineHeight: 19, fontWeight: '900', marginTop: 1 },
  selectorChevron: { transform: [{ rotate: '90deg' }] },
  dateStrip: { height: 76, flexGrow: 0, flexShrink: 0 },
  dateContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  dateTile: { width: 55, height: 55, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateWeekday: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dateDay: { fontSize: 18, lineHeight: 22, fontWeight: '900' },
  weekendTile: { minWidth: 80, height: 55, borderRadius: 16, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', gap: 3 },
  weekendLabel: { fontSize: 10, fontWeight: '800' },
  statusStrip: { height: 54, flexGrow: 0, flexShrink: 0 },
  statusContent: { paddingHorizontal: 16, paddingVertical: 9, gap: 8, alignItems: 'center' },
  metaRow: { minHeight: 31, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sourcePill: { height: 24, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 6 },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  metaText: { fontSize: 10, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingTop: 5, paddingBottom: 20 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyAction: { marginTop: 14 },
  pickerHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 14 },
  pickerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  pickerSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  pickerDone: { fontSize: 13, fontWeight: '900', paddingVertical: 4 },
  pickerSearch: { height: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pickerSearchInput: { flex: 1, height: 42, paddingVertical: 0, fontSize: 13 },
  pickerSection: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 14, marginBottom: 5, paddingHorizontal: 4 },
  pickerRow: { minHeight: 48, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pickerRowLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
});
