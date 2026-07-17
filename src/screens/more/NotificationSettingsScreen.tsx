import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, SectionHeader } from '../../components/ui';
import { usePreferences } from '../../state/PreferencesContext';
import { useReminders } from '../../state/RemindersContext';
import { useTheme } from '../../theme/ThemeProvider';
import { hasNotificationPermission, requestNotificationPermission } from '../../services/notifications';

const OFFSET_LABEL_KEYS: Record<number, string> = {
  1440: 'reminders.oneDayBefore', 120: 'reminders.twoHoursBefore', 60: 'reminders.oneHourBefore',
  30: 'reminders.thirtyMinutesBefore', 15: 'reminders.fifteenMinutesBefore', 10: 'reminders.tenMinutesBefore', 0: 'reminders.atKickoff',
};

export function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { preferences, update } = usePreferences();
  const { reminders } = useReminders();
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    hasNotificationPermission().then(setPermissionGranted);
  }, []);

  const handleToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);
      await update({ notificationsEnabled: granted });
    } else {
      await update({ notificationsEnabled: false });
    }
  };

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('more.notificationSettings')}</Text>

        <Card style={styles.section}>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textPrimary }}>{t('more.notifications')}</Text>
            <Switch value={preferences.notificationsEnabled} onValueChange={handleToggle} />
          </View>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
            {permissionGranted ? t('common.on') : t('reminders.permissionDenied')}
          </Text>
        </Card>

        <SectionHeader title={t('onboarding.reminderDefault')} />
        <Card style={styles.section}>
          {[1440, 120, 60, 30, 15, 10, 0].map(offset => (
            <Text
              key={offset}
              onPress={() => update({ defaultReminderOffsetMinutes: offset })}
              style={{
                color: preferences.defaultReminderOffsetMinutes === offset ? theme.colors.accent : theme.colors.textPrimary,
                fontWeight: preferences.defaultReminderOffsetMinutes === offset ? '700' : '400',
                paddingVertical: 8,
              }}
            >
              {t(OFFSET_LABEL_KEYS[offset])}
            </Text>
          ))}
        </Card>

        <SectionHeader title={t('reminders.title')} />
        <Card style={styles.section}>
          {reminders.length === 0 ? (
            <Text style={{ color: theme.colors.textMuted }}>{t('matchday.emptyBody')}</Text>
          ) : (
            reminders.map(r => (
              <View key={r.id} style={styles.reminderRow}>
                <Text style={{ color: theme.colors.textPrimary, flex: 1 }}>{r.matchId}</Text>
                <Text style={{ color: r.status === 'needs_reschedule' ? theme.colors.warning : theme.colors.success, fontSize: 11 }}>
                  {r.status === 'needs_reschedule' ? t('reminders.needsReschedule') : t('common.on')}
                </Text>
              </View>
            ))
          )}
        </Card>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, marginBottom: 10 },
  section: { marginHorizontal: 16, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reminderRow: { flexDirection: 'row', paddingVertical: 6 },
});
