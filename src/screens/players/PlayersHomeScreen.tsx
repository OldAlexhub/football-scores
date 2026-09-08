import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { AppIcon } from '../../components/AppIcon';
import { NewsThumb } from '../../components/NewsThumb';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, EmptyState } from '../../components/ui';
import { searchPlayers } from '../../providers/playersProvider';
import { listPlayerMeta } from '../../storage/repositories/followedPlayersRepo';
import { useTheme } from '../../theme/ThemeProvider';
import type { PlayersStackParamList } from '../../navigation/types';
import type { FollowedPlayerMeta, PlayerSearchResult } from '../../types/domain';

type Props = NativeStackScreenProps<PlayersStackParamList, 'PlayersHome'>;

const POPULAR = [
  'Mohamed Salah', 'Kylian Mbappé', 'Erling Haaland', 'Jude Bellingham', 'Vinícius Júnior',
  'Lamine Yamal', 'Bukayo Saka', 'Rodri', 'Harry Kane', 'Lionel Messi',
  'Cristiano Ronaldo', 'Kevin De Bruyne',
];

export function PlayersHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [followed, setFollowed] = useState<FollowedPlayerMeta[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    listPlayerMeta().then(list => { if (active) setFollowed(list); }).catch(() => undefined);
    return () => { active = false; };
  }, []));

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return undefined;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      searchPlayers(term)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  const openPlayer = (playerId?: string, name?: string) =>
    navigation.navigate('PlayerDetails', { playerId, query: name });

  const sections = useMemo(() => {
    if (query.trim().length >= 2) {
      return { mode: 'results' as const };
    }
    return { mode: 'idle' as const };
  }, [query]);

  const Row = ({ photo, name, subtitle, onPress }: { photo: string | null; name: string; subtitle: string | null; onPress: () => void }) => (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <NewsThumb uri={photo} size={46} />
        <View style={styles.rowText}>
          <Text style={[styles.rowName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{name}</Text>
          {subtitle ? <Text style={[styles.rowSub, { color: theme.colors.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <AppIcon name="chevronRight" size={16} color={theme.colors.textMuted} />
      </Card>
    </Pressable>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('players.title')}</Text>
        <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <AppIcon name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('players.searchPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            autoCorrect={false}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          />
          {searching ? <ActivityIndicator size="small" color={theme.colors.accent} /> : null}
        </View>
      </View>

      {sections.mode === 'results' ? (
        results.length === 0 && !searching ? (
          <EmptyState title={t('players.noResults', { query: query.trim() })} body={t('players.searchHint')} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Row
                photo={item.photoUrl}
                name={item.name}
                subtitle={[item.position, item.currentTeamName].filter(Boolean).join(' · ') || item.nationality}
                onPress={() => openPlayer(item.id, item.name)}
              />
            )}
          />
        )
      ) : (
        <SafeScrollView contentContainerStyle={styles.listContent} contentBottomPadding={8}>
          {followed.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{t('players.following')}</Text>
              {followed.map(player => (
                <Row
                  key={player.playerId}
                  photo={player.photoUrl}
                  name={player.name}
                  subtitle={[player.position, player.clubName].filter(Boolean).join(' · ') || player.nationality}
                  onPress={() => openPlayer(player.playerId, player.name)}
                />
              ))}
            </>
          ) : null}
          <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{t('players.popular')}</Text>
          {POPULAR.map(name => (
            <Row key={name} photo={null} name={name} subtitle={null} onPress={() => openPlayer(undefined, name)} />
          ))}
          <Text style={[styles.footNote, { color: theme.colors.textMuted }]}>{t('players.keylessNote')}</Text>
        </SafeScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 9 },
  title: { fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: -0.7, marginBottom: 12 },
  searchWrap: { height: 46, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 },
  searchInput: { flex: 1, height: 44, paddingVertical: 0, fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 },
  sectionLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 16, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 8 },
  rowText: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '800' },
  rowSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  footNote: { fontSize: 10, marginTop: 20, lineHeight: 15 },
});
