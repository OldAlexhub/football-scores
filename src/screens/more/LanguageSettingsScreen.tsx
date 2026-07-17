import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/ui';
import { usePreferences } from '../../state/PreferencesContext';
import { useTheme } from '../../theme/ThemeProvider';
import type { LanguagePreference } from '../../types/domain';

export function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { preferences, update } = usePreferences();

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('more.languageSettings')}</Text>
        <Card style={styles.section}>
          {(['en', 'ar'] as LanguagePreference[]).map(lang => (
            <Pressable key={lang} onPress={() => update({ language: lang })} style={styles.row}>
              <Text style={{ color: theme.colors.textPrimary }}>{lang === 'en' ? 'English' : 'العربية'}</Text>
              <Text style={{ color: preferences.language === lang ? theme.colors.accent : theme.colors.border }}>
                {preferences.language === lang ? '●' : '○'}
              </Text>
            </Pressable>
          ))}
        </Card>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, marginBottom: 10 },
  section: { marginHorizontal: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
});
