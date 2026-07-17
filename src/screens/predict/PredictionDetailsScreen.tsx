import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, PrimaryButton, SecondaryButton, SectionHeader } from '../../components/ui';
import { usePredictions } from '../../state/PredictionsContext';
import { useTheme } from '../../theme/ThemeProvider';
import { shareImageUri } from '../../services/exportService';

export function PredictionDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { matchId } = route.params as { matchId: string };
  const { getPredictionFor } = usePredictions();
  const shotRef = useRef<ViewShot>(null);

  const prediction = getPredictionFor(matchId);

  if (!prediction) {
    return (
      <ScreenContainer>
        <Text style={{ color: theme.colors.textMuted, padding: 24, textAlign: 'center' }}>{t('common.dataUnavailable')}</Text>
      </ScreenContainer>
    );
  }

  const handleShare = async () => {
    const uri = await shotRef.current?.capture?.();
    if (uri) await shareImageUri(uri);
  };

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 0.9 }}>
          <Card style={styles.card}>
            <Text style={[styles.appName, { color: theme.colors.textMuted }]}>{t('export.appName')}</Text>
            <Text style={[styles.matchup, { color: theme.colors.textPrimary }]}>
              {prediction.homeTeamName} vs {prediction.awayTeamName}
            </Text>
            <Text style={[styles.predictedScore, { color: theme.colors.accent }]}>
              {prediction.homeScore} : {prediction.awayScore}
            </Text>
            <Text style={{ color: theme.colors.textSecondary }}>{t(`predict.${prediction.outcome}`)}</Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 8 }}>
              {'★'.repeat(prediction.confidence)}{'☆'.repeat(5 - prediction.confidence)}
            </Text>
            {prediction.gradedAt ? (
              <Text style={{ color: prediction.isCorrectOutcome ? theme.colors.success : theme.colors.danger, marginTop: 8, fontWeight: '700' }}>
                {prediction.pointsAwarded} pts
              </Text>
            ) : null}
          </Card>
        </ViewShot>

        {prediction.note ? (
          <View style={styles.section}>
            <SectionHeader title={t('predict.note')} />
            <Text style={{ color: theme.colors.textSecondary }}>{prediction.note}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton label={t('predict.shareCard')} onPress={handleShare} style={{ marginBottom: 10 }} />
          <SecondaryButton
            label={t('common.edit')}
            onPress={() => navigation.navigate('PredictionEditor', { matchId })}
          />
        </View>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, alignItems: 'center', paddingVertical: 24 },
  appName: { fontSize: 11, marginBottom: 8 },
  matchup: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  predictedScore: { fontSize: 32, fontWeight: '800', marginVertical: 10 },
  section: { paddingHorizontal: 16, marginTop: 10 },
  actions: { paddingHorizontal: 16, marginTop: 20 },
});
