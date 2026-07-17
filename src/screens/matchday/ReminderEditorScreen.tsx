import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardSafeScreen } from '../../components/KeyboardSafeScreen';
import { SafeScrollView } from '../../components/SafeScrollView';
import { SafeStickyAction } from '../../components/SafeStickyAction';
import { PrimaryButton, SecondaryButton } from '../../components/ui';
import { useSuppressBanner } from '../../ads/useSuppressBanner';
import type { MatchDetailsParams } from '../../navigation/types';
import { useReminders } from '../../state/RemindersContext';
import { useTheme } from '../../theme/ThemeProvider';
import { REMINDER_OFFSET_OPTIONS } from '../../services/reminderService';

const OFFSET_LABEL_KEYS: Record<number, string> = {
  1440: 'reminders.oneDayBefore',
  120: 'reminders.twoHoursBefore',
  60: 'reminders.oneHourBefore',
  30: 'reminders.thirtyMinutesBefore',
  15: 'reminders.fifteenMinutesBefore',
  10: 'reminders.tenMinutesBefore',
  0: 'reminders.atKickoff',
};

export function ReminderEditorScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();
  const params = route.params as MatchDetailsParams;
  const { getReminderFor, setReminder, cancelReminder } = useReminders();

  useSuppressBanner();

  const existing = getReminderFor(params.matchId);
  const [selectedOffset, setSelectedOffset] = useState<number | 'custom'>(existing?.offsetMinutes ?? 60);
  const [customMinutes, setCustomMinutes] = useState(existing?.offsetMinutes ? String(existing.offsetMinutes) : '');

  const handleSave = async () => {
    if (!params.match) return;
    const offset = selectedOffset === 'custom' ? parseInt(customMinutes, 10) : selectedOffset;
    if (Number.isNaN(offset) || offset < 0) return;
    await setReminder(params.match, offset);
    navigation.goBack();
  };

  const handleCancel = async () => {
    await cancelReminder(params.matchId);
    navigation.goBack();
  };

  return (
    <KeyboardSafeScreen>
      <SafeScrollView>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('reminders.title')}</Text>
        {existing?.status === 'needs_reschedule' ? (
          <Text style={[styles.notice, { color: theme.colors.warning }]}>{t('reminders.needsReschedule')}</Text>
        ) : null}
        <View style={styles.optionsGrid}>
          {REMINDER_OFFSET_OPTIONS.map(offset => (
            <Pressable
              key={offset}
              onPress={() => setSelectedOffset(offset)}
              style={[
                styles.option,
                { backgroundColor: selectedOffset === offset ? theme.colors.accent : theme.colors.surfaceAlt },
              ]}
            >
              <Text style={{ color: selectedOffset === offset ? theme.colors.accentText : theme.colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                {t(OFFSET_LABEL_KEYS[offset])}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setSelectedOffset('custom')}
            style={[styles.option, { backgroundColor: selectedOffset === 'custom' ? theme.colors.accent : theme.colors.surfaceAlt }]}
          >
            <Text style={{ color: selectedOffset === 'custom' ? theme.colors.accentText : theme.colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
              {t('reminders.custom')}
            </Text>
          </Pressable>
        </View>
        {selectedOffset === 'custom' ? (
          <TextInput
            value={customMinutes}
            onChangeText={setCustomMinutes}
            keyboardType="number-pad"
            placeholder="90"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
          />
        ) : null}
      </SafeScrollView>
      <SafeStickyAction>
        {existing ? <SecondaryButton label={t('reminders.cancelled')} onPress={handleCancel} style={{ marginBottom: 10 }} /> : null}
        <PrimaryButton label={t('common.save')} onPress={handleSave} />
      </SafeStickyAction>
    </KeyboardSafeScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, marginBottom: 12 },
  notice: { paddingHorizontal: 16, marginBottom: 10, fontSize: 12 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  option: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  input: { marginHorizontal: 16, marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10, fontSize: 14 },
});
