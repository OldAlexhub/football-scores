import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import RNFS from 'react-native-fs';
import { errorCodes, isErrorWithCode, pick } from '@react-native-documents/picker';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, PrimaryButton, SecondaryButton, SectionHeader } from '../../components/ui';
import { useSuppressBanner } from '../../ads/useSuppressBanner';
import { maybeShowInterstitial } from '../../ads/InterstitialManager';
import { useTheme } from '../../theme/ThemeProvider';
import { buildCompleteBackup, restoreCompleteBackup, validateBackup } from '../../storage/backupService';
import { writeAndShareTextFile } from '../../services/exportService';
import { usePredictions } from '../../state/PredictionsContext';
import { useWatchPlan } from '../../state/WatchPlanContext';
import { useFavorites } from '../../state/FavoritesContext';
import { useReminders } from '../../state/RemindersContext';

export function BackupRestoreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [status, setStatus] = useState<'idle' | 'exporting' | 'importing' | 'success' | 'failure'>('idle');
  const [message, setMessage] = useState('');
  const { refresh: refreshPredictions } = usePredictions();
  const { refresh: refreshWatchPlan } = useWatchPlan();
  const { refresh: refreshFavorites } = useFavorites();
  const { refresh: refreshReminders } = useReminders();

  useSuppressBanner();

  const handleExport = async () => {
    setStatus('exporting');
    const backup = await buildCompleteBackup();
    const result = await writeAndShareTextFile('football-scores-backup', 'json', JSON.stringify(backup, null, 2), 'application/json');
    if (result.success) {
      setStatus('success');
      setMessage(t('export.success'));
      await maybeShowInterstitial('backup_export');
    } else {
      setStatus('failure');
      setMessage(t('export.failure'));
    }
  };

  const handleImport = async () => {
    try {
      const [pickResult] = await pick({ type: ['application/json'], mode: 'open' });
      const content = await RNFS.readFile(pickResult.uri, 'utf8');
      const parsed = JSON.parse(content);
      const validation = validateBackup(parsed);
      if (!validation.valid) {
        setStatus('failure');
        setMessage(t('errors.invalidBackup'));
        return;
      }
      setStatus('importing');
      await restoreCompleteBackup(parsed);
      await Promise.all([refreshPredictions(), refreshWatchPlan(), refreshFavorites(), refreshReminders()]);
      setStatus('success');
      setMessage(t('dataManagement.importSuccess'));
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        setStatus('idle');
        setMessage('');
        return;
      }
      setStatus('failure');
      setMessage(t('dataManagement.importFailure'));
    }
  };

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('more.dataManagement')}</Text>

        {message ? (
          <Text style={{ color: status === 'success' ? theme.colors.success : theme.colors.danger, paddingHorizontal: 16, marginBottom: 10 }}>
            {message}
          </Text>
        ) : null}

        <SectionHeader title={t('dataManagement.exportBackup')} />
        <Card style={styles.card}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginBottom: 10 }}>{t('dataSources.delayExplanation')}</Text>
          <PrimaryButton label={t('dataManagement.exportBackup')} onPress={handleExport} />
        </Card>

        <SectionHeader title={t('dataManagement.importBackup')} />
        <Card style={styles.card}>
          <SecondaryButton label={t('dataManagement.importBackup')} onPress={handleImport} />
        </Card>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  card: { marginHorizontal: 16, marginBottom: 10 },
});
