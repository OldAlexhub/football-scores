import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../components/AppIcon';
import { TeamCrest } from '../../components/TeamCrest';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useCompetitions } from '../../hooks/useCompetitions';
import { useFavorites } from '../../state/FavoritesContext';
import { useTheme } from '../../theme/ThemeProvider';
import { flagForCountry } from '../../utils/countryFlags';
import type { Competition } from '../../types/domain';

export function FavoriteCompetitionsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { competitions } = useCompetitions();
  const { favoriteCompetitionIds, toggleCompetition, reorderCompetitions } = useFavorites();
  const [search, setSearch] = useState('');
  const favorites = competitions.filter(item => favoriteCompetitionIds.has(item.id));
  const others = competitions
    .filter(item => !favoriteCompetitionIds.has(item.id) && item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
    .slice(0, search.trim() ? 100 : 60);
  const move = (id: string, direction: -1 | 1) => {
    const order = favorites.map(item => item.id);
    const index = order.indexOf(id);
    const next = index + direction;
    if (next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    void reorderCompetitions(order);
  };

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('more.favoriteCompetitions')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{t('onboarding.competitionsBody')}</Text>
        </View>
        {favorites.map((competition, index) => (
          <CompetitionRow
            key={competition.id}
            competition={competition}
            active
            onToggle={() => toggleCompetition(competition.id)}
            onMoveUp={index > 0 ? () => move(competition.id, -1) : undefined}
            onMoveDown={index < favorites.length - 1 ? () => move(competition.id, 1) : undefined}
          />
        ))}
        <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <AppIcon name="search" size={18} color={theme.colors.textMuted} />
          <TextInput value={search} onChangeText={setSearch} placeholder={t('onboarding.searchCompetitions')} placeholderTextColor={theme.colors.textMuted} style={[styles.search, { color: theme.colors.textPrimary }]} />
        </View>
        {others.map(competition => <CompetitionRow key={competition.id} competition={competition} active={false} onToggle={() => toggleCompetition(competition.id)} />)}
      </SafeScrollView>
    </ScreenContainer>
  );
}

function CompetitionRow({ competition, active, onToggle, onMoveUp, onMoveDown }: { competition: Competition; active: boolean; onToggle: () => void; onMoveUp?: () => void; onMoveDown?: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <TeamCrest uri={competition.emblemUrl} name={competition.name} size={40} />
      <View style={styles.competitionText}>
        <Text style={[styles.competitionName, { color: theme.colors.textPrimary }]}>{competition.name}</Text>
        <Text style={[styles.country, { color: theme.colors.textMuted }]}>{flagForCountry(competition.country)}  {competition.country ?? 'International'}</Text>
      </View>
      {onMoveUp ? <OrderButton direction="up" onPress={onMoveUp} /> : null}
      {onMoveDown ? <OrderButton direction="down" onPress={onMoveDown} /> : null}
      <Pressable onPress={onToggle} hitSlop={8} style={styles.starButton}>
        <AppIcon name="star" size={21} color={active ? theme.colors.accent : theme.colors.textMuted} />
      </Pressable>
    </View>
  );
}

function OrderButton({ direction, onPress }: { direction: 'up' | 'down'; onPress: () => void }) {
  const theme = useTheme();
  return <Pressable onPress={onPress} style={styles.orderButton}><View style={{ transform: [{ rotate: direction === 'up' ? '-90deg' : '90deg' }] }}><AppIcon name="chevronRight" size={17} color={theme.colors.textMuted} /></View></Pressable>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 9, paddingBottom: 12 },
  title: { fontSize: 25, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  row: { minHeight: 64, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 10 },
  competitionText: { flex: 1 },
  competitionName: { fontSize: 13, fontWeight: '800' },
  country: { fontSize: 10, marginTop: 3 },
  starButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  orderButton: { width: 27, height: 34, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { height: 46, marginHorizontal: 16, marginVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  search: { flex: 1, height: 44, paddingVertical: 0 },
});
