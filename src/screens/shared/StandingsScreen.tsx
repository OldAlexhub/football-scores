import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { EmptyState, LoadingState } from '../../components/ui';
import { TeamCrest } from '../../components/TeamCrest';
import { fetchStandings } from '../../providers/providerManager';
import { useFavorites } from '../../state/FavoritesContext';
import { useTheme } from '../../theme/ThemeProvider';
import type { StandingRow } from '../../types/domain';

type TableType = 'overall' | 'home' | 'away';

export function StandingsScreen() {
  const route = useRoute();
  const { competitionId } = route.params as { competitionId: string };
  const { t } = useTranslation();
  const theme = useTheme();
  const { favoriteTeamIds } = useFavorites();

  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableType, setTableType] = useState<TableType>('overall');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const providerCompetitionId = competitionId.includes(':') ? competitionId.split(':').slice(1).join(':') : competitionId;
    fetchStandings(providerCompetitionId).then(result => {
      if (!mounted) return;
      setRows(result.data);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [competitionId]);

  const visibleRows = rows.filter(r => r.tableType === tableType);

  return (
    <ScreenContainer>
      <View style={styles.tabs}>
        {(['overall', 'home', 'away'] as TableType[]).map(tt => (
          <Pressable
            key={tt}
            onPress={() => setTableType(tt)}
            style={[styles.tab, { backgroundColor: tableType === tt ? theme.colors.accent : theme.colors.surfaceAlt }]}
          >
            <Text style={{ color: tableType === tt ? theme.colors.accentText : theme.colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
              {t(`insights.${tt}Table`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : visibleRows.length === 0 ? (
        <EmptyState title={t('competitionDetails.noStandings')} body="" />
      ) : (
        <SafeScrollView>
          <View style={styles.headerRow}>
            <Text style={[styles.headCell, styles.posCell, { color: theme.colors.textMuted }]}>#</Text>
            <Text style={[styles.headCell, styles.teamCell, { color: theme.colors.textMuted }]}>{t('teamDetails.title')}</Text>
            <Text style={[styles.headCell, styles.numCell, { color: theme.colors.textMuted }]}>P</Text>
            <Text style={[styles.headCell, styles.numCell, { color: theme.colors.textMuted }]}>GD</Text>
            <Text style={[styles.headCell, styles.numCell, { color: theme.colors.textMuted }]}>Pts</Text>
          </View>
          {visibleRows
            .sort((a, b) => a.position - b.position)
            .map(row => (
              <View
                key={row.teamId}
                style={[
                  styles.row,
                  { borderColor: theme.colors.border, backgroundColor: favoriteTeamIds.has(row.teamId) ? theme.colors.surfaceAlt : 'transparent' },
                ]}
              >
                <Text style={[styles.cell, styles.posCell, { color: theme.colors.textPrimary }]}>{row.position}</Text>
                <View style={styles.teamCell}>
                  <TeamCrest uri={row.teamCrestUrl} name={row.teamName} size={27} />
                  <Text style={[styles.cell, styles.teamName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{row.teamName}</Text>
                </View>
                <Text style={[styles.cell, styles.numCell, { color: theme.colors.textSecondary }]}>{row.played}</Text>
                <Text style={[styles.cell, styles.numCell, { color: theme.colors.textSecondary }]}>{row.goalDifference}</Text>
                <Text style={[styles.cell, styles.numCell, { color: theme.colors.textPrimary, fontWeight: '700' }]}>{row.points}</Text>
              </View>
            ))}
        </SafeScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  headerRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 6 },
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { fontSize: 12 },
  headCell: { fontSize: 10, fontWeight: '700' },
  posCell: { width: 26 },
  teamCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamName: { flex: 1, fontWeight: '700' },
  numCell: { width: 34, textAlign: 'center' },
});
