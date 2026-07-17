import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Badge, Card, LoadingState, SectionHeader } from '../../components/ui';
import { useResolvedMatches } from '../../hooks/useResolvedMatches';
import { useFavorites } from '../../state/FavoritesContext';
import { usePreferences } from '../../state/PreferencesContext';
import { useWatchPlan } from '../../state/WatchPlanContext';
import { useTheme } from '../../theme/ThemeProvider';
import { estimatedEndUtc, findGaps, findPairOverlaps } from '../../services/clashDetection';
import { formatKickoffTime } from '../../utils/dates';

const SEVERITY_TONE: Record<string, 'neutral' | 'warning' | 'danger'> = {
  none: 'neutral',
  short: 'neutral',
  partial: 'warning',
  major: 'warning',
  nearly_complete: 'danger',
};

export function ClashDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { matchIds } = route.params as { matchIds: string[] };
  const { t } = useTranslation();
  const theme = useTheme();
  const { preferences } = usePreferences();
  const { favoriteTeamIds } = useFavorites();
  const { items, getItem, addOrUpdate } = useWatchPlan();
  const { matches, loading } = useResolvedMatches(matchIds);

  const inputs = useMemo(() => matchIds
    .map(id => matches[id])
    .filter(Boolean)
    .map(m => {
      const item = items.find(i => i.matchId === m.id);
      return {
        matchId: m.id,
        kickoffUtc: m.kickoffUtc,
        kickoffUnknown: m.kickoffUnknown,
        estimatedDurationMinutes: item?.estimatedDurationMinutes ?? 120,
        extraTimePossible: m.extraTimePossible,
        priority: item?.priority ?? 'normal',
        isFavoriteTeamMatch: favoriteTeamIds.has(m.homeTeamId) || favoriteTeamIds.has(m.awayTeamId),
        watchLater: item?.watchLater ?? false,
      };
    }), [matchIds, matches, items, favoriteTeamIds]);

  const overlaps = useMemo(() => findPairOverlaps(inputs), [inputs]);
  const gaps = useMemo(() => findGaps(inputs), [inputs]);
  const hasExtraTimeRisk = matchIds.some(id => matches[id]?.extraTimePossible);

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
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('clash.title')}</Text>

        {hasExtraTimeRisk ? (
          <Card style={styles.warningCard}>
            <Text style={{ color: theme.colors.warning }}>{t('clash.extraTimeWarning')}</Text>
          </Card>
        ) : null}

        <SectionHeader title={t('clash.suggestedSequence')} />
        {matchIds.map((id, index) => {
          const match = matches[id];
          if (!match) return null;
          return (
            <Card key={id} style={styles.matchCard}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>#{index + 1}</Text>
              <Text
                style={{ color: theme.colors.textPrimary, fontWeight: '700' }}
                onPress={() => navigation.navigate('MatchDetails', { matchId: match.id, match })}
              >
                {match.homeTeamName} vs {match.awayTeamName}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                {t('clash.estimatedStart')}: {formatKickoffTime(match.kickoffUtc, match.kickoffUnknown, preferences.clock, preferences.language, t('common.timeNotConfirmed'))}
                {match.kickoffUtc ? ` · ${t('clash.estimatedEnd')}: ${formatKickoffTime(estimatedEndUtc(match.kickoffUtc, getItem(id)?.estimatedDurationMinutes ?? 120), false, preferences.clock, preferences.language, '')}` : ''}
              </Text>
              <View style={styles.priorityRow}>
                {(['low', 'normal', 'high'] as const).map(p => (
                  <Text
                    key={p}
                    onPress={() => addOrUpdate(id, { priority: p })}
                    style={[
                      styles.priorityChip,
                      {
                        backgroundColor: (getItem(id)?.priority ?? 'normal') === p ? theme.colors.accent : theme.colors.surfaceAlt,
                        color: (getItem(id)?.priority ?? 'normal') === p ? theme.colors.accentText : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {t(`matchday.priority${p.charAt(0).toUpperCase()}${p.slice(1)}`)}
                  </Text>
                ))}
              </View>
            </Card>
          );
        })}

        <SectionHeader title={t('clash.conflictingMatches', { count: overlaps.length })} />
        {overlaps.map(o => (
          <Card key={`${o.matchIdA}-${o.matchIdB}`} style={styles.matchCard}>
            <Badge label={t(`clash.${o.severity === 'nearly_complete' ? 'nearlyCompleteOverlap' : o.severity + 'Overlap'}`)} tone={SEVERITY_TONE[o.severity]} />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 6 }}>{t('clash.overlapMinutes', { minutes: o.overlapMinutes })}</Text>
          </Card>
        ))}

        {gaps.filter(g => g.isBackToBack).length > 0 ? (
          <>
            <SectionHeader title={t('clash.backToBack')} />
            {gaps.filter(g => g.isBackToBack).map(g => (
              <Card key={`${g.afterMatchId}-${g.beforeMatchId}`} style={styles.matchCard}>
                <Text style={{ color: theme.colors.textSecondary }}>{t('clash.gapMinutes', { minutes: g.gapMinutes })}</Text>
              </Card>
            ))}
          </>
        ) : null}
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, marginBottom: 8 },
  warningCard: { marginHorizontal: 16, marginBottom: 8 },
  matchCard: { marginHorizontal: 16, marginBottom: 10 },
  priorityRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  priorityChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, fontSize: 11, fontWeight: '600', overflow: 'hidden' },
});
