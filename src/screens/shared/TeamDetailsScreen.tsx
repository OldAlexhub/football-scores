import { useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, PrimaryButton, SectionHeader } from '../../components/ui';
import { fetchForm } from '../../providers/providerManager';
import { useFavorites } from '../../state/FavoritesContext';
import { usePredictions } from '../../state/PredictionsContext';
import { useTheme } from '../../theme/ThemeProvider';

export function TeamDetailsScreen() {
  const route = useRoute();
  const { teamId } = route.params as { teamId: string };
  const { t } = useTranslation();
  const theme = useTheme();
  const { favoriteTeamIds, toggleTeam } = useFavorites();
  const { predictions } = usePredictions();

  const [form, setForm] = useState<{ lastFive: string[]; homeForm: string[]; awayForm: string[] }>({
    lastFive: [], homeForm: [], awayForm: [],
  });

  const providerTeamId = useMemo(() => teamId.split(':').slice(1).join(':'), [teamId]);
  const teamName = useMemo(() => providerTeamId.split(':').pop() ?? providerTeamId, [providerTeamId]);

  useEffect(() => {
    let mounted = true;
    fetchForm(providerTeamId).then(result => {
      if (!mounted) return;
      setForm(result.data);
    });
    return () => {
      mounted = false;
    };
  }, [providerTeamId]);

  const relatedPredictions = predictions.filter(p => p.homeTeamId === teamId || p.awayTeamId === teamId);

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{teamName}</Text>
          <PrimaryButton
            label={`${favoriteTeamIds.has(teamId) ? '★' : '☆'} ${t('common.save')}`}
            onPress={() => toggleTeam(teamId)}
            style={styles.favButton}
          />
        </View>

        <Card style={styles.section}>
          <SectionHeader title={t('matchDetails.recentForm')} />
          <Text style={{ color: theme.colors.textPrimary }}>
            {form.lastFive.length > 0 ? form.lastFive.join(' ') : t('common.dataUnavailable')}
          </Text>
        </Card>

        <Card style={styles.section}>
          <SectionHeader title={t('teamDetails.homeForm')} />
          <Text style={{ color: theme.colors.textPrimary }}>
            {form.homeForm.length > 0 ? form.homeForm.join(' ') : t('common.dataUnavailable')}
          </Text>
        </Card>

        <Card style={styles.section}>
          <SectionHeader title={t('teamDetails.awayForm')} />
          <Text style={{ color: theme.colors.textPrimary }}>
            {form.awayForm.length > 0 ? form.awayForm.join(' ') : t('common.dataUnavailable')}
          </Text>
        </Card>

        <Card style={styles.section}>
          <SectionHeader title={t('teamDetails.predictionHistory')} />
          {relatedPredictions.length === 0 ? (
            <Text style={{ color: theme.colors.textMuted }}>{t('predict.emptyBody')}</Text>
          ) : (
            relatedPredictions.slice(0, 10).map(p => (
              <Text key={p.id} style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                {p.homeTeamName} {p.homeScore}-{p.awayScore} {p.awayTeamName} · {p.pointsAwarded ?? t('predict.pendingPredictions')}
              </Text>
            ))
          )}
        </Card>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  favButton: { paddingHorizontal: 24 },
  section: { marginHorizontal: 16, marginTop: 14 },
});
