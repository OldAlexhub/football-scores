import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, EmptyState, SecondaryButton, SectionHeader } from '../../components/ui';
import { usePredictions } from '../../state/PredictionsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { computePredictionStats } from '../../services/predictionStats';

type HistoryFilter = 'all' | 'pending' | 'correct' | 'exact' | 'incorrect';

export function PredictHomeScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { predictions } = usePredictions();
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const stats = useMemo(() => computePredictionStats(predictions), [predictions]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'pending':
        return predictions.filter(p => !p.gradedAt);
      case 'correct':
        return predictions.filter(p => p.gradedAt && p.isCorrectOutcome);
      case 'exact':
        return predictions.filter(p => p.gradedAt && p.isExactScore);
      case 'incorrect':
        return predictions.filter(p => p.gradedAt && !p.isCorrectOutcome);
      default:
        return predictions;
    }
  }, [predictions, filter]);

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('predict.title')}</Text>
        <Text style={{ color: theme.colors.textMuted, paddingHorizontal: 16 }}>{t('predict.subtitle')}</Text>

        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <Stat label={t('predict.totalPredictions')} value={String(stats.total)} theme={theme} />
            <Stat label={t('predict.gradedPredictions')} value={String(stats.graded)} theme={theme} />
            <Stat label={t('predict.pendingPredictions')} value={String(stats.pending)} theme={theme} />
            <Stat label={t('predict.outcomeAccuracy')} value={stats.outcomeAccuracy != null ? `${Math.round(stats.outcomeAccuracy * 100)}%` : '—'} theme={theme} />
            <Stat label={t('predict.exactScoreRate')} value={stats.exactScoreRate != null ? `${Math.round(stats.exactScoreRate * 100)}%` : '—'} theme={theme} />
            <Stat label={t('predict.totalPoints')} value={String(stats.totalPoints)} theme={theme} />
            <Stat label={t('predict.currentStreak')} value={String(stats.currentStreak)} theme={theme} />
            <Stat label={t('predict.bestStreak')} value={String(stats.bestStreak)} theme={theme} />
          </View>
          <SecondaryButton
            label={t('predict.shareStatsCard')}
            style={{ marginTop: 10 }}
            onPress={() => navigation.navigate('ExportPreview', { kind: 'stats_card' })}
          />
        </Card>

        <SectionHeader title={t('predict.history')} />
        <View style={styles.filterRow}>
          {(['all', 'pending', 'correct', 'exact', 'incorrect'] as HistoryFilter[]).map(f => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, { backgroundColor: filter === f ? theme.colors.accent : theme.colors.surfaceAlt }]}
            >
              <Text style={{ color: filter === f ? theme.colors.accentText : theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                {t(`predict.filter${f.charAt(0).toUpperCase()}${f.slice(1)}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {filtered.length === 0 ? (
          <EmptyState title={t('predict.emptyTitle')} body={t('predict.emptyBody')} />
        ) : (
          filtered.map(p => (
            <Pressable key={p.id} onPress={() => navigation.navigate('PredictionDetails', { matchId: p.matchId })}>
              <Card style={styles.predictionCard}>
                <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>
                  {p.homeTeamName} {p.homeScore}-{p.awayScore} {p.awayTeamName}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{p.competitionName}</Text>
                <Text style={{ color: p.gradedAt ? (p.isCorrectOutcome ? theme.colors.success : theme.colors.danger) : theme.colors.textMuted, fontSize: 12 }}>
                  {p.gradedAt ? `${p.pointsAwarded} pts` : t('predict.pendingPredictions')}
                </Text>
              </Card>
            </Pressable>
          ))
        )}

        <View style={styles.exportsRow}>
          <SecondaryButton label={t('dataManagement.exportPredictionsCsv')} onPress={() => navigation.navigate('ExportPreview', { kind: 'predictions_csv' })} style={{ marginBottom: 8 }} />
          <SecondaryButton label={t('dataManagement.exportPredictionsJson')} onPress={() => navigation.navigate('ExportPreview', { kind: 'predictions_json' })} />
        </View>
      </SafeScrollView>
    </ScreenContainer>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  statsCard: { marginHorizontal: 16, marginTop: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statBox: { width: '25%', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 2 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  predictionCard: { marginHorizontal: 16, marginBottom: 10 },
  exportsRow: { paddingHorizontal: 16, marginTop: 16 },
});
