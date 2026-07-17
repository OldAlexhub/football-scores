import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SafeStickyAction } from '../../components/SafeStickyAction';
import { PrimaryButton, SecondaryButton } from '../../components/ui';
import { useSuppressBanner } from '../../ads/useSuppressBanner';
import { maybeShowInterstitial } from '../../ads/InterstitialManager';
import { usePredictions } from '../../state/PredictionsContext';
import { useWatchPlan } from '../../state/WatchPlanContext';
import { useTheme } from '../../theme/ThemeProvider';
import { buildMatchdayJson, buildPredictionsCsv, buildPredictionsJson, writeAndShareTextFile } from '../../services/exportService';
import { buildCompleteBackup } from '../../storage/backupService';

type ExportKind =
  | 'predictions_csv' | 'predictions_json' | 'prediction_card' | 'stats_card'
  | 'matchday_item' | 'matchday_plan' | 'weekend_plan' | 'backup';

export function ExportPreviewScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { kind } = route.params as { kind: ExportKind };
  const { predictions } = usePredictions();
  const { items } = useWatchPlan();
  const [status, setStatus] = useState<'idle' | 'success' | 'failure'>('idle');

  useSuppressBanner();

  const buildContent = (): { content: string; ext: string; mime: string; placement: Parameters<typeof maybeShowInterstitial>[0] } => {
    switch (kind) {
      case 'predictions_csv':
        return { content: buildPredictionsCsv(predictions), ext: 'csv', mime: 'text/csv', placement: 'prediction_export' };
      case 'predictions_json':
        return { content: buildPredictionsJson(predictions), ext: 'json', mime: 'application/json', placement: 'prediction_export' };
      case 'matchday_plan':
        return { content: buildMatchdayJson(items), ext: 'json', mime: 'application/json', placement: 'reminder_batch_done' };
      default:
        return { content: '', ext: 'txt', mime: 'text/plain', placement: 'backup_export' };
    }
  };

  const preview = kind === 'backup' ? t('export.appName') : buildContent().content;

  const handleExport = async () => {
    if (kind === 'backup') {
      const backup = await buildCompleteBackup();
      const result = await writeAndShareTextFile('football-scores-backup', 'json', JSON.stringify(backup, null, 2), 'application/json');
      setStatus(result.success ? 'success' : 'failure');
      if (result.success) await maybeShowInterstitial('backup_export');
      return;
    }
    const { content, ext, mime, placement } = buildContent();
    const result = await writeAndShareTextFile(kind, ext, content, mime);
    setStatus(result.success ? 'success' : 'failure');
    if (result.success) await maybeShowInterstitial(placement);
  };

  const handleReturn = () => navigation.goBack();

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('common.export')}</Text>
        {status === 'success' ? (
          <Text style={{ color: theme.colors.success, marginBottom: 10 }}>{t('export.success')}</Text>
        ) : status === 'failure' ? (
          <Text style={{ color: theme.colors.danger, marginBottom: 10 }}>{t('export.failure')}</Text>
        ) : null}
        <Text style={[styles.preview, { color: theme.colors.textSecondary, borderColor: theme.colors.border }]} numberOfLines={20}>
          {preview.slice(0, 2000) || t('common.dataUnavailable')}
        </Text>
      </ScrollView>
      <SafeStickyAction>
        <PrimaryButton label={t('common.export')} onPress={handleExport} style={{ marginBottom: 10 }} />
        <SecondaryButton label={t('export.returnToApp')} onPress={handleReturn} />
      </SafeStickyAction>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  preview: { fontSize: 12, fontFamily: 'monospace', borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
});
