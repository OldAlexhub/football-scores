import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { AppIcon } from '../../components/AppIcon';
import { NewsThumb } from '../../components/NewsThumb';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, EmptyState } from '../../components/ui';
import { useFavorites } from '../../state/FavoritesContext';
import { listPlayerMeta } from '../../storage/repositories/followedPlayersRepo';
import { useTheme } from '../../theme/ThemeProvider';
import type { FollowedPlayerMeta } from '../../types/domain';

export function FavoritePlayersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { togglePlayer, favoritePlayerIds } = useFavorites();
  const [players, setPlayers] = useState<FollowedPlayerMeta[]>([]);

  const reload = useCallback(() => {
    listPlayerMeta().then(setPlayers).catch(() => setPlayers([]));
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const visible = players.filter(p => favoritePlayerIds.has(p.playerId));

  if (visible.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState title={t('more.favoritePlayers')} body={t('players.searchHint')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SafeScrollView contentContainerStyle={styles.content} contentBottomPadding={8}>
        {visible.map(player => (
          <Card key={player.playerId} style={styles.row}>
            <Pressable
              style={styles.rowMain}
              onPress={() => navigation.navigate('PlayerDetails', { playerId: player.playerId, query: player.name })}
            >
              <NewsThumb uri={player.photoUrl} size={44} />
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>{player.name}</Text>
                <Text style={[styles.sub, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  {[player.position, player.clubName].filter(Boolean).join(' · ') || player.nationality}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('players.unfollow')}
              hitSlop={8}
              onPress={() => { void togglePlayer(player.playerId); }}
              style={styles.remove}
            >
              <AppIcon name="star" size={18} color={theme.colors.accent} />
            </Pressable>
          </Card>
        ))}
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowText: { flex: 1 },
  name: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  remove: { paddingHorizontal: 6, paddingVertical: 8 },
});
