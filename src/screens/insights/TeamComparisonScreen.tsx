import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, LoadingState, SectionHeader } from '../../components/ui';
import { fetchForm, fetchStandings, fetchTeams } from '../../providers/providerManager';
import { useTheme } from '../../theme/ThemeProvider';
import type { FormResult } from '../../providers/types';
import type { StandingRow, Team } from '../../types/domain';

export function TeamComparisonScreen() {
  const route = useRoute();
  const { competitionId } = (route.params as { competitionId: string } | undefined) ?? { competitionId: '' };
  const { t } = useTranslation();
  const theme = useTheme();

  const [teams, setTeams] = useState<Team[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [teamA, setTeamA] = useState<string | null>(null);
  const [teamB, setTeamB] = useState<string | null>(null);
  const [formA, setFormA] = useState<FormResult | null>(null);
  const [formB, setFormB] = useState<FormResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!competitionId) return;
    const providerCompetitionId = competitionId.split(':').slice(1).join(':');
    Promise.all([fetchTeams(providerCompetitionId), fetchStandings(providerCompetitionId)]).then(([t1, t2]) => {
      setTeams(t1.data);
      setStandings(t2.data.filter(r => r.tableType === 'overall'));
      setLoading(false);
    });
  }, [competitionId]);

  useEffect(() => {
    if (!teamA) return;
    fetchForm(teamA.split(':').slice(1).join(':')).then(r => setFormA(r.data));
  }, [teamA]);
  useEffect(() => {
    if (!teamB) return;
    fetchForm(teamB.split(':').slice(1).join(':')).then(r => setFormB(r.data));
  }, [teamB]);

  const rowFor = (teamId: string | null) => standings.find(s => s.teamId === teamId) ?? null;
  const rowA = rowFor(teamA);
  const rowB = rowFor(teamB);

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
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('insights.teamComparison')}</Text>

        <View style={styles.pickerRow}>
          <TeamPicker teams={teams} selected={teamA} onSelect={setTeamA} theme={theme} />
          <TeamPicker teams={teams} selected={teamB} onSelect={setTeamB} theme={theme} />
        </View>

        {teamA && teamB ? (
          <Card style={styles.compareCard}>
            <SectionHeader title={t('insights.sampleSize', { count: (formA?.lastFive.length ?? 0) + (formB?.lastFive.length ?? 0) })} />
            <ComparisonRow label={t('insights.overallTable')} a={rowA ? `#${rowA.position}` : '—'} b={rowB ? `#${rowB.position}` : '—'} theme={theme} />
            <ComparisonRow label="Pts" a={rowA ? String(rowA.points) : '—'} b={rowB ? String(rowB.points) : '—'} theme={theme} />
            <ComparisonRow label="GD" a={rowA ? String(rowA.goalDifference) : '—'} b={rowB ? String(rowB.goalDifference) : '—'} theme={theme} />
            <ComparisonRow label={t('matchDetails.recentForm')} a={formA?.lastFive.join(' ') ?? '—'} b={formB?.lastFive.join(' ') ?? '—'} theme={theme} />
            <ComparisonRow label={t('teamDetails.homeForm')} a={formA?.homeForm.join(' ') ?? '—'} b={formB?.homeForm.join(' ') ?? '—'} theme={theme} />
            <ComparisonRow label={t('teamDetails.awayForm')} a={formA?.awayForm.join(' ') ?? '—'} b={formB?.awayForm.join(' ') ?? '—'} theme={theme} />
          </Card>
        ) : (
          <Text style={{ color: theme.colors.textMuted, padding: 16 }}>{t('insights.noSampleData')}</Text>
        )}
      </SafeScrollView>
    </ScreenContainer>
  );
}

function TeamPicker({ teams, selected, onSelect, theme }: { teams: Team[]; selected: string | null; onSelect: (id: string) => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.pickerCol}>
      {teams.slice(0, 8).map(team => (
        <Pressable key={team.id} onPress={() => onSelect(team.id)} style={[styles.teamOption, { backgroundColor: selected === team.id ? theme.colors.accent : theme.colors.surfaceAlt }]}>
          <Text numberOfLines={1} style={{ color: selected === team.id ? theme.colors.accentText : theme.colors.textSecondary, fontSize: 11 }}>
            {team.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ComparisonRow({ label, a, b, theme }: { label: string; a: string; b: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.compareRow}>
      <Text style={[styles.compareValue, { color: theme.colors.textPrimary }]}>{a}</Text>
      <Text style={[styles.compareLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.compareValue, { color: theme.colors.textPrimary }]}>{b}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, marginBottom: 10 },
  pickerRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  pickerCol: { flex: 1, gap: 6 },
  teamOption: { paddingHorizontal: 8, paddingVertical: 8, borderRadius: 8 },
  compareCard: { marginHorizontal: 16, marginTop: 14 },
  compareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  compareValue: { flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 13 },
  compareLabel: { flex: 1, textAlign: 'center', fontSize: 11 },
});
