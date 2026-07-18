import { useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TeamCrest } from '../../components/TeamCrest';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/ui';
import { fetchForm, resolveTeamById } from '../../providers/providerManager';
import { useTheme } from '../../theme/ThemeProvider';
import type { Team } from '../../types/domain';

export function TeamDetailsScreen() {
  const route = useRoute();
  const { teamId } = route.params as { teamId: string };
  const { t } = useTranslation();
  const theme = useTheme();
  const [team, setTeam] = useState<Team | null>(null);
  const [form, setForm] = useState<{ lastFive: string[]; homeForm: string[]; awayForm: string[] }>({ lastFive: [], homeForm: [], awayForm: [] });
  const providerTeamId = useMemo(() => teamId.split(':').slice(1).join(':'), [teamId]);
  const fallbackName = useMemo(() => providerTeamId.split(':').pop() ?? providerTeamId, [providerTeamId]);

  useEffect(() => {
    let mounted = true;
    Promise.all([resolveTeamById(teamId), fetchForm(providerTeamId)]).then(([resolvedTeam, formResult]) => {
      if (!mounted) return;
      setTeam(resolvedTeam);
      setForm(formResult.data);
    });
    return () => { mounted = false; };
  }, [providerTeamId, teamId]);

  const teamName = team?.name ?? fallbackName;

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={24}>
        <View style={styles.header}>
          <TeamCrest uri={team?.crestUrl} name={teamName} initials={team?.initials} size={78} />
          <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{teamName}</Text>
          {team?.shortName ? <Text style={[styles.shortName, { color: theme.colors.textMuted }]}>{team.shortName}</Text> : null}
        </View>

        <Card style={styles.section}>
          <Heading title={t('matchDetails.recentForm')} />
          <FormPills form={form.lastFive} />
          <View style={[styles.formDivider, { backgroundColor: theme.colors.border }]} />
          <Heading title={t('teamDetails.homeForm')} compact />
          <FormPills form={form.homeForm} />
          <Heading title={t('teamDetails.awayForm')} compact />
          <FormPills form={form.awayForm} />
        </Card>

      </SafeScrollView>
    </ScreenContainer>
  );
}

function Heading({ title, compact = false }: { title: string; compact?: boolean }) {
  const theme = useTheme();
  return <Text style={[styles.heading, compact && styles.compactHeading, { color: theme.colors.textPrimary }]}>{title}</Text>;
}

function FormPills({ form }: { form: string[] }) {
  const theme = useTheme();
  if (!form.length) return <Text style={[styles.empty, { color: theme.colors.textMuted }]}>—</Text>;
  return (
    <View style={styles.formPills}>
      {form.map((result, index) => {
        const color = result === 'W' ? theme.colors.success : result === 'L' ? theme.colors.danger : theme.colors.warning;
        return <Text key={`${result}:${index}`} style={[styles.formPill, { backgroundColor: color, color: theme.colors.accentText }]}>{result}</Text>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 13, alignItems: 'center' },
  name: { fontSize: 23, fontWeight: '900', textAlign: 'center', marginTop: 10 },
  shortName: { fontSize: 11, marginTop: 3 },
  section: { marginHorizontal: 16, marginTop: 14 },
  heading: { fontSize: 16, fontWeight: '900', marginBottom: 11 },
  compactHeading: { fontSize: 12, marginTop: 14, marginBottom: 8 },
  formPills: { flexDirection: 'row', gap: 7 },
  formPill: { width: 31, height: 31, borderRadius: 10, textAlign: 'center', textAlignVertical: 'center', fontSize: 11, fontWeight: '900' },
  formDivider: { height: StyleSheet.hairlineWidth, marginTop: 16 },
  empty: { fontSize: 12, lineHeight: 18 },
  predictionRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  predictionTeams: { flex: 1, fontSize: 11, fontWeight: '700' },
  predictionPoints: { fontSize: 10, fontWeight: '900' },
});
