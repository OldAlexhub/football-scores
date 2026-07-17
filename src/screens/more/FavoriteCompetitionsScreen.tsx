import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useCompetitions } from '../../hooks/useCompetitions';
import { useFavorites } from '../../state/FavoritesContext';
import { useTheme } from '../../theme/ThemeProvider';

export function FavoriteCompetitionsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { competitions, loading } = useCompetitions();
  const { favoriteCompetitionIds, toggleCompetition, reorderCompetitions } = useFavorites();
  const [search, setSearch] = useState('');

  const favorites = competitions.filter(c => favoriteCompetitionIds.has(c.id));
  const others = competitions.filter(c => !favoriteCompetitionIds.has(c.id) && c.name.toLowerCase().includes(search.toLowerCase()));

  const move = (id: string, direction: -1 | 1) => {
    const order = favorites.map(c => c.id);
    const index = order.indexOf(id);
    const next = index + direction;
    if (next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    reorderCompetitions(order);
  };

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('more.favoriteCompetitions')}</Text>

        {favorites.map((c, index) => (
          <View key={c.id} style={[styles.row, { borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textPrimary, flex: 1 }}>{c.name}</Text>
            <Pressable onPress={() => move(c.id, -1)} disabled={index === 0} hitSlop={8}>
              <Text style={{ color: index === 0 ? theme.colors.border : theme.colors.textSecondary, marginHorizontal: 6 }}>↑</Text>
            </Pressable>
            <Pressable onPress={() => move(c.id, 1)} disabled={index === favorites.length - 1} hitSlop={8}>
              <Text style={{ color: index === favorites.length - 1 ? theme.colors.border : theme.colors.textSecondary, marginHorizontal: 6 }}>↓</Text>
            </Pressable>
            <Pressable onPress={() => toggleCompetition(c.id)} hitSlop={8}>
              <Text style={{ color: theme.colors.accent, marginLeft: 6 }}>★</Text>
            </Pressable>
          </View>
        ))}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('onboarding.searchCompetitions')}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.search, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
        />

        {!loading && others.map(c => (
          <View key={c.id} style={[styles.row, { borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textPrimary, flex: 1 }}>{c.name}</Text>
            <Pressable onPress={() => toggleCompetition(c.id)} hitSlop={8}>
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
