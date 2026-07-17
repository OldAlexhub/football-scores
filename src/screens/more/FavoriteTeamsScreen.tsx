import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
    const favComps = competitions.filter(c => favoriteCompetitionIds.has(c.id));
    if (favComps.length === 0) {
      setAllTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(favComps.map(c => fetchTeams(c.providerCompetitionId))).then(results => {
      const merged = results.flatMap(r => r.data);
      setAllTeams(merged);
      setLoading(false);
    });
  }, [competitions, favoriteCompetitionIds]);

  const favorites = allTeams.filter(tm => favoriteTeamIds.has(tm.id));
  const others = allTeams.filter(tm => !favoriteTeamIds.has(tm.id) && tm.name.toLowerCase().includes(search.toLowerCase()));

  const move = (id: string, direction: -1 | 1) => {
    const order = favorites.map(tm => tm.id);
    const index = order.indexOf(id);
    const next = index + direction;
    if (next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    reorderTeams(order);
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
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('more.favoriteTeams')}</Text>

        {favorites.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted, paddingHorizontal: 16 }}>{t('onboarding.noTeamsYet')}</Text>
        ) : (
          favorites.map((tm, index) => (
            <View key={tm.id} style={[styles.row, { borderColor: theme.colors.border }]}>
              <Text style={{ color: theme.colors.textPrimary, flex: 1 }}>{tm.name}</Text>
              <Pressable onPress={() => move(tm.id, -1)} disabled={index === 0} hitSlop={8}>
                <Text style={{ color: index === 0 ? theme.colors.border : theme.colors.textSecondary, marginHorizontal: 6 }}>↑</Text>
              </Pressable>
              <Pressable onPress={() => move(tm.id, 1)} disabled={index === favorites.length - 1} hitSlop={8}>
                <Text style={{ color: index === favorites.length - 1 ? theme.colors.border : theme.colors.textSecondary, marginHorizontal: 6 }}>↓</Text>
              </Pressable>
              <Pressable onPress={() => toggleTeam(tm.id)} hitSlop={8}>
                <Text style={{ color: theme.colors.accent, marginLeft: 6 }}>★</Text>
              </Pressable>
            </View>
          ))
        )}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('onboarding.searchTeams')}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.search, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
        />

        {others.map(tm => (
          <View key={tm.id} style={[styles.row, { borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textPrimary, flex: 1 }}>{tm.name}</Text>
            <Pressable onPress={() => toggleTeam(tm.id)} hitSlop={8}>
              <Text style={{ color: theme.colors.textMuted }}>☆</Text>
            </Pressable>
          </View>
        ))}
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  search: { marginHorizontal: 16, marginVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
});
