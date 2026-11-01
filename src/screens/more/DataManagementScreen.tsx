import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, DangerButton, SecondaryButton, SectionHeader } from '../../components/ui';
import { usePredictions } from '../../state/PredictionsContext';
import { useWatchPlan } from '../../state/WatchPlanContext';
import { useTheme } from '../../theme/ThemeProvider';
import { clearPredictions } from '../../storage/repositories/predictionsRepo';
import { clearWatchPlanItems } from '../../storage/repositories/watchPlanRepo';
import { clearAllCache } from '../../storage/repositories/providerCacheRepo';
import { clearFavorites } from '../../storage/repositories/favoritesRepo';
import { clearReminders } from '../../storage/repositories/remindersRepo';
import { DEFAULT_PREFERENCES } from '../../storage/preferencesRepo';
import {usePreferences} from '../../state/PreferencesContext';
import {useReminders} from '../../state/RemindersContext';
import {useFavorites} from '../../state/FavoritesContext';
import {runExecute} from '../../storage/db';
import notifee from '@notifee/react-native';

export function DataManagementScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();
  const {preferences,update}=usePreferences();
  const {refresh:refreshReminders}=useReminders();
  const {refresh:refreshFavorites}=useFavorites();
  const { refresh: refreshPredictions } = usePredictions();
  const { refresh: refreshWatchPlan } = useWatchPlan();

  const confirm = (message: string, onConfirm: () => void) => {
    Alert.alert(message, '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), style: 'destructive', onPress: onConfirm },
    ]);
  };

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('dataManagement.title')}</Text>

        <SectionHeader title={t('common.export')} />
        <Card style={styles.card}>
          <SecondaryButton label={t('dataManagement.exportPredictionsCsv')} onPress={() => navigation.navigate('ExportPreview', { kind: 'predictions_csv' })} style={{ marginBottom: 8 }} />
          <SecondaryButton label={t('dataManagement.exportPredictionsJson')} onPress={() => navigation.navigate('ExportPreview', { kind: 'predictions_json' })} style={{ marginBottom: 8 }} />
          <SecondaryButton label={t('dataManagement.exportMatchdayJson')} onPress={() => navigation.navigate('ExportPreview', { kind: 'matchday_plan' })} />
        </Card>

        <SectionHeader title={t('dataManagement.title')} />
        <Card style={styles.card}>
          <SecondaryButton label={t('dataManagement.exportBackup')} onPress={() => navigation.navigate('BackupRestore')} style={{ marginBottom: 8 }} />
          <SecondaryButton label={t('dataManagement.importBackup')} onPress={() => navigation.navigate('BackupRestore')} />
        </Card>

        <SectionHeader title={t('common.delete')} />
        <Card style={styles.card}>
          <DangerButton
            label={t('dataManagement.clearPredictions')}
            style={{ marginBottom: 8 }}
            onPress={() => confirm(t('dataManagement.clearPredictions') + '?', async () => { await clearPredictions(); await refreshPredictions(); })}
          />
          <DangerButton
            label={t('dataManagement.clearMatchday')}
            style={{ marginBottom: 8 }}
            onPress={() => confirm(t('dataManagement.clearMatchday') + '?', async () => { await clearWatchPlanItems(); await refreshWatchPlan(); })}
          />
          <DangerButton
            label={t('dataManagement.clearApiCache')}
            style={{ marginBottom: 8 }}
            onPress={() => confirm(t('dataManagement.clearApiCache') + '?', () => clearAllCache())}
          />
          <DangerButton
            label={t('dataManagement.resetAll')}
            onPress={() => confirm(t('dataManagement.resetAllConfirm'), async () => {
              await update({notificationsEnabled:false,favoriteTeamReminders:false});
              await notifee.cancelAllNotifications();
              await runExecute('DELETE FROM reminder_rules');
              await clearPredictions();
              await clearWatchPlanItems();
              await clearReminders();
              await clearFavorites();
              await clearAllCache();
              await update({...DEFAULT_PREFERENCES,language:preferences.language,onboardingCompleted:preferences.onboardingCompleted,dataDisclosureVersion:preferences.dataDisclosureVersion,notificationsEnabled:false,favoriteTeamReminders:false});
              await refreshReminders();
              await refreshFavorites();
              await refreshPredictions();
              await refreshWatchPlan();
            })}
          />
        </Card>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  card: { marginHorizontal: 16, marginBottom: 10 },
});
