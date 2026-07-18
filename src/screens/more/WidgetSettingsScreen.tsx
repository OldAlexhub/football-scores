import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../components/AppIcon';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, PrimaryButton, SecondaryButton } from '../../components/ui';
import {
  getWidgetCount,
  isWidgetPinningSupported,
  refreshInstalledWidgets,
  requestPinWidget,
} from '../../services/widgetBridge';
import { useFavorites } from '../../state/FavoritesContext';
import { usePreferences } from '../../state/PreferencesContext';
import { useReminders } from '../../state/RemindersContext';
import { syncWidgetSnapshotNow } from '../../state/WidgetSyncEffect';
import { useWatchPlan } from '../../state/WatchPlanContext';
import { useTheme } from '../../theme/ThemeProvider';

export function WidgetSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { favoriteTeamIds } = useFavorites();
  const { items } = useWatchPlan();
  const { reminders } = useReminders();
  const { preferences } = usePreferences();
  const [widgetCount, setWidgetCount] = useState(0);
  const [pinSupported, setPinSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getWidgetCount(), isWidgetPinningSupported()]).then(([count, supported]) => {
      setWidgetCount(count);
      setPinSupported(supported);
    });
  }, []);

  const syncNow = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await syncWidgetSnapshotNow({
        favoriteTeamIds,
        watchPlanItems: items,
        reminders,
        language: preferences.language,
      });
      const count = await refreshInstalledWidgets();
      setWidgetCount(count);
      setMessage(t('widget.refreshComplete'));
    } catch {
      setMessage(t('widget.refreshFailed'));
    } finally {
      setBusy(false);
    }
  };

  const addWidget = async () => {
    setBusy(true);
    setMessage(null);
    const requested = await requestPinWidget();
    setBusy(false);
    setMessage(requested ? t('widget.pinPromptOpened') : t('widget.manualAdd'));
  };

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={24}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('widget.settingsTitle')}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{t('widget.description')}</Text>

        <Card style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={[styles.brand, { color: theme.colors.accent }]}>{t('common.appName').toLocaleUpperCase()}</Text>
            <View style={[styles.liveBadge, { backgroundColor: theme.colors.accentSoft }]}>
              <Text style={[styles.liveBadgeText, { color: theme.colors.accent }]}>{t('widget.next')}</Text>
            </View>
          </View>
          <Text style={[styles.competition, { color: theme.colors.textMuted }]}>🌍 FIFA World Cup</Text>
          <Text style={[styles.match, { color: theme.colors.textPrimary }]}>France  vs  England</Text>
          <Text style={[styles.kickoff, { color: theme.colors.textSecondary }]}>{t('widget.previewKickoff')}</Text>
        </Card>

        <Card style={styles.statusCard}>
          <View style={[styles.statusIcon, { backgroundColor: theme.colors.accentSoft }]}>
            <AppIcon name="home" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: theme.colors.textPrimary }]}>
              {widgetCount > 0 ? t('widget.activeCount', { count: widgetCount }) : t('widget.notAdded')}
            </Text>
            <Text style={[styles.statusBody, { color: theme.colors.textMuted }]}>{t('widget.updateBehavior')}</Text>
          </View>
        </Card>

        {pinSupported ? (
          <PrimaryButton
            label={t('widget.addToHomeScreen')}
            onPress={addWidget}
            disabled={busy}
            style={styles.action}
          />
        ) : (
          <Card style={styles.instructionsCard}>
            <Text style={[styles.instructions, { color: theme.colors.textSecondary }]}>{t('widget.manualAdd')}</Text>
          </Card>
        )}

        <SecondaryButton
          label={busy ? t('widget.refreshing') : t('widget.refreshNow')}
          onPress={syncNow}
          disabled={busy}
          style={styles.secondaryAction}
        />

        {message ? <Text style={[styles.message, { color: theme.colors.accent }]}>{message}</Text> : null}
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '900', paddingHorizontal: 16, paddingTop: 8 },
  subtitle: { fontSize: 12, lineHeight: 18, paddingHorizontal: 16, marginTop: 4 },
  previewCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 20 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flex: 1, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  liveBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  liveBadgeText: { fontSize: 9, fontWeight: '900' },
  competition: { fontSize: 11, marginTop: 12 },
  match: { fontSize: 17, fontWeight: '900', marginTop: 5 },
  kickoff: { fontSize: 12, marginTop: 4 },
  statusCard: { marginHorizontal: 16, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1 },
  statusTitle: { fontSize: 14, fontWeight: '800' },
  statusBody: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  action: { marginHorizontal: 16, marginTop: 16 },
  secondaryAction: { marginHorizontal: 16, marginTop: 10 },
  instructionsCard: { marginHorizontal: 16, marginTop: 14 },
  instructions: { fontSize: 12, lineHeight: 18 },
  message: { marginHorizontal: 20, marginTop: 12, textAlign: 'center', fontSize: 12, fontWeight: '700' },
});
