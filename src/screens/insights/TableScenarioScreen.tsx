import { useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, LoadingState, PrimaryButton, SectionHeader } from '../../components/ui';
import { fetchMatches, fetchStandings } from '../../providers/providerManager';
import { useTheme } from '../../theme/ThemeProvider';
import { applyScenario, getTieBreakForCompetition, type ScenarioMatchInput } from '../../services/tableScenario';
import { maybeShowInterstitial } from '../../ads/InterstitialManager';
import { addDays } from '../../utils/dates';
import type { Match, StandingRow } from '../../types/domain';

export function TableScenarioScreen() {
  const route = useRoute();
  const { competitionId } = route.params as { competitionId: string };
  const { t } = useTranslation();
  const theme = useTheme();

  const [baseStandings, setBaseStandings] = useState<StandingRow[]>([]);
  const [scheduledMatches, setScheduledMatches] = useState<Match[]>([]);
  const [scenarioInputs, setScenarioInputs] = useState<Record<string, { home: string; away: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const providerCompetitionId = competitionId.split(':').slice(1).join(':');
    Promise.all([
      fetchStandings(providerCompetitionId),
      fetchMatches({ dateFromUtc: new Date().toISOString(), dateToUtc: addDays(new Date(), 60).toISOString(), competitionProviderIds: [providerCompetitionId] }),
    ]).then(([standingsResult, matchesResult]) => {
      setBaseStandings(standingsResult.data.filter(r => r.tableType === 'overall'));
      setScheduledMatches(matchesResult.data.filter(m => m.competitionId === competitionId && m.status === 'scheduled').slice(0, 15));
      setLoading(false);
    });
  }, [competitionId]);

  const scenarioMatches: ScenarioMatchInput[] = useMemo(() => {
    return scheduledMatches
      .map(m => {
        const input = scenarioInputs[m.id];
        if (!input || input.home === '' || input.away === '') return null;
        const home = parseInt(input.home, 10);
        const away = parseInt(input.away, 10);
        if (Number.isNaN(home) || Number.isNaN(away)) return null;
        return { matchId: m.id, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, homeScore: home, awayScore: away };
      })
      .filter((x): x is ScenarioMatchInput => x !== null);
  }, [scheduledMatches, scenarioInputs]);

  const scenarioTable = useMemo(
    () => applyScenario(baseStandings, scenarioMatches, getTieBreakForCompetition(competitionId)),
    [baseStandings, scenarioMatches, competitionId],
  );

  const handleSave = async () => {
    await maybeShowInterstitial('table_scenario_saved');
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
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('insights.tableScenario')}</Text>
        <Text style={[styles.disclaimer, { color: theme.colors.warning }]}>{t('insights.scenarioDisclaimer')}</Text>

        <SectionHeader title={t('matches.title')} />
        {scheduledMatches.map(m => {
          const input = scenarioInputs[m.id] ?? { home: '', away: '' };
          return (
            <Card key={m.id} style={styles.matchRow}>
              <Text style={{ color: theme.colors.textPrimary, flex: 1 }} numberOfLines={1}>{m.homeTeamName}</Text>
              <TextInput
                value={input.home}
                onChangeText={v => setScenarioInputs(prev => ({ ...prev, [m.id]: { ...input, home: v } }))}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.scoreInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              />
              <Text style={{ color: theme.colors.textMuted }}>-</Text>
              <TextInput
                value={input.away}
                onChangeText={v => setScenarioInputs(prev => ({ ...prev, [m.id]: { ...input, away: v } }))}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.scoreInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              />
              <Text style={{ color: theme.colors.textPrimary, flex: 1, textAlign: 'right' }} numberOfLines={1}>{m.awayTeamName}</Text>
            </Card>
          );
        })}

        <SectionHeader title={t('insights.standings')} />
        {scenarioTable.map(row => (
          <View key={row.teamId} style={styles.tableRow}>
            <Text style={[styles.pos, { color: theme.colors.textPrimary }]}>{row.position}</Text>
            <Text style={[styles.teamName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{row.teamName}</Text>
            <Text style={[styles.pts, { color: theme.colors.textPrimary, fontWeight: row.isProvisional ? '800' : '600' }]}>{row.points}</Text>
          </View>
        ))}

        <PrimaryButton label={t('insights.saveScenario')} onPress={handleSave} style={{ marginHorizontal: 16, marginTop: 16 }} />
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  disclaimer: { fontSize: 12, paddingHorizontal: 16, marginTop: 6, marginBottom: 6 },
  matchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, gap: 6 },
  scoreInput: { width: 34, textAlign: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingVertical: 4 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  pos: { width: 24, fontSize: 12 },
  teamName: { flex: 1, fontSize: 12 },
  pts: { width: 30, textAlign: 'right', fontSize: 12 },
});
