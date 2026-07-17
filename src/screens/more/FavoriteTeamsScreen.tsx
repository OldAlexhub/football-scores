import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../components/AppIcon';
import { TeamCrest } from '../../components/TeamCrest';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { LoadingState } from '../../components/ui';
import { useCompetitions } from '../../hooks/useCompetitions';
import { fetchTeams } from '../../providers/providerManager';
import { useFavorites } from '../../state/FavoritesContext';
import { useTheme } from '../../theme/ThemeProvider';
import type { Team } from '../../types/domain';

export function FavoriteTeamsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { competitions } = useCompetitions();
  const { favoriteCompetitionIds, favoriteTeamIds, toggleTeam, reorderTeams } = useFavorites();
  const [search, setSearch] = useState('');
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const favoriteCompetitions = competitions.filter(competition => favoriteCompetitionIds.has(competition.id));
    if (favoriteCompetitions.length === 0) {
      setAllTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(favoriteCompetitions.map(competition => fetchTeams(competition.providerCompetitionId))).then(results => {
      const unique = new Map<string, Team>();
      results.flatMap(result => result.data).forEach(team => unique.set(team.id, team));
      setAllTeams([...unique.values()]);
      setLoading(false);
    });
  }, [competitions, favoriteCompetitionIds]);

  const favorites = allTeams.filter(team => favoriteTeamIds.has(team.id));
  const others = allTeams.filter(team => !favoriteTeamIds.has(team.id) && team.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const move = (id: string, direction: -1 | 1) => {
    const order = favorites.map(team => team.id);
    const index = order.indexOf(id);
    const next = index + direction;
    if (next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    void reorderTeams(order);
  };

  if (loading) return <ScreenContainer><LoadingState label={t('common.loading')} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('more.favoriteTeams')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{t('onboarding.teamsBody')}</Text>
        </View>

        {favorites.map((team, index) => (
          <TeamRow
            key={team.id}
            team={team}
            active
            onToggle={() => toggleTeam(team.id)}
            onMoveUp={index > 0 ? () => move(team.id, -1) : undefined}
            onMoveDown={index < favorites.length - 1 ? () => move(team.id, 1) : undefined}
          />
        ))}

        <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <AppIcon name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('onboarding.searchTeams')}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.search, { color: theme.colors.textPrimary }]}
          />
        </View>

        {others.map(team => <TeamRow key={team.id} team={team} active={false} onToggle={() => toggleTeam(team.id)} />)}
        {allTeams.length === 0 ? <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t('onboarding.noTeamsYet')}</Text> : null}
      </SafeScrollView>
    </ScreenContainer>
  );
}

function TeamRow({ team, active, onToggle, onMoveUp, onMoveDown }: { team: Team; active: boolean; onToggle: () => void; onMoveUp?: () => void; onMoveDown?: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <TeamCrest uri={team.crestUrl} name={team.name} initials={team.initials} size={40} />
      <View style={styles.teamText}>
        <Text style={[styles.teamName, { color: theme.colors.textPrimary }]}>{team.name}</Text>
        {team.shortName ? <Text style={[styles.shortName, { color: theme.colors.textMuted }]}>{team.shortName}</Text> : null}
      </View>
      {onMoveUp ? <OrderButton direction="up" onPress={onMoveUp} /> : null}
      {onMoveDown ? <OrderButton direction="down" onPress={onMoveDown} /> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onToggle} hitSlop={8} style={styles.starButton}>
        <AppIcon name="star" size={21} color={active ? theme.colors.accent : theme.colors.textMuted} />
      </Pressable>
    </View>
  );
}

function OrderButton({ direction, onPress }: { direction: 'up' | 'down'; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={5} style={styles.orderButton}>
      <View style={{ transform: [{ rotate: direction === 'up' ? '-90deg' : '90deg' }] }}>
        <AppIcon name="chevronRight" size={17} color={theme.colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 9, paddingBottom: 12 },
  title: { fontSize: 25, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  row: { minHeight: 64, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamText: { flex: 1 },
  teamName: { fontSize: 13, fontWeight: '800' },
  shortName: { fontSize: 10, marginTop: 2 },
  starButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  orderButton: { width: 27, height: 34, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { height: 46, marginHorizontal: 16, marginVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  search: { flex: 1, height: 44, paddingVertical: 0 },
  empty: { paddingHorizontal: 16, paddingVertical: 20, textAlign: 'center', lineHeight: 18 },
});
