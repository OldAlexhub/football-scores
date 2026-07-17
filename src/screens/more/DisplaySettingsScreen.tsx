import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, SectionHeader } from '../../components/ui';
import { usePreferences } from '../../state/PreferencesContext';
import { useTheme } from '../../theme/ThemeProvider';
import type { ClockPreference, DefaultTab, ThemePreference } from '../../types/domain';

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];
const TAB_OPTIONS: DefaultTab[] = ['matches', 'matchday', 'predict', 'insights', 'more'];

export function DisplaySettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { preferences, update } = usePreferences();

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('more.display')}</Text>

        <SectionHeader title={t('onboarding.theme')} />
        <Card style={styles.section}>
          <View style={styles.optionRow}>
            {THEME_OPTIONS.map(opt => (
              <Pressable
                key={opt}
                onPress={() => update({ theme: opt })}
                style={[styles.chip, { backgroundColor: preferences.theme === opt ? theme.colors.accent : theme.colors.surfaceAlt }]}
              >
                <Text style={{ color: preferences.theme === opt ? theme.colors.accentText : theme.colors.textSecondary, fontSize: 12 }}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <SectionHeader title={t('onboarding.clock')} />
        <Card style={styles.section}>
          <View style={styles.optionRow}>
            {(['12h', '24h'] as ClockPreference[]).map(opt => (
              <Pressable
                key={opt}
                onPress={() => update({ clock: opt })}
                style={[styles.chip, { backgroundColor: preferences.clock === opt ? theme.colors.accent : theme.colors.surfaceAlt }]}
              >
                <Text style={{ color: preferences.clock === opt ? theme.colors.accentText : theme.colors.textSecondary, fontSize: 12 }}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <SectionHeader title={t('onboarding.openingTab')} />
        <Card style={styles.section}>
          <View style={styles.optionRow}>
            {TAB_OPTIONS.map(opt => (
              <Pressable
                key={opt}
                onPress={() => update({ defaultOpeningTab: opt })}
                style={[styles.chip, { backgroundColor: preferences.defaultOpeningTab === opt ? theme.colors.accent : theme.colors.surfaceAlt }]}
              >
                <Text style={{ color: preferences.defaultOpeningTab === opt ? theme.colors.accentText : theme.colors.textSecondary, fontSize: 12 }}>
                  {t(`tabs.${opt}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={styles.section}>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textPrimary }}>Show completed matches</Text>
            <Switch value={preferences.showCompletedMatches} onValueChange={v => update({ showCompletedMatches: v })} />
          </View>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textPrimary }}>{t('onboarding.spoilerDefault')}</Text>
            <Switch value={preferences.defaultSpoilerShieldEnabled} onValueChange={v => update({ defaultSpoilerShieldEnabled: v })} />
          </View>
        </Card>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, marginBottom: 10 },
  section: { marginHorizontal: 16, marginBottom: 4 },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
});
