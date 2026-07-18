import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSuppressBanner } from '../../ads/useSuppressBanner';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SafeStickyAction } from '../../components/SafeStickyAction';
import { PrimaryButton, SecondaryButton } from '../../components/ui';
import { usePreferences } from '../../state/PreferencesContext';
import { useTheme } from '../../theme/ThemeProvider';
import type { ClockPreference, LanguagePreference, ThemePreference } from '../../types/domain';

export function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { preferences, update } = usePreferences();
  const [showPreferences, setShowPreferences] = useState(false);

  useSuppressBanner();

  const finish = async () => {
    await update({ onboardingCompleted: true, defaultOpeningTab: 'matches' });
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        {!showPreferences ? (
          <View style={styles.introBlock}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.appTitle, { color: theme.colors.textPrimary }]}>{t('onboarding.welcomeTitle')}</Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{t('onboarding.welcomeBody')}</Text>
            <View style={[styles.promiseCard, { backgroundColor: theme.colors.accentSoft }]}>
              <Text style={[styles.promiseTitle, { color: theme.colors.accent }]}>{t('onboarding.readOnlyPromiseTitle')}</Text>
              <Text style={[styles.promiseBody, { color: theme.colors.textSecondary }]}>{t('onboarding.readOnlyPromiseBody')}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.block}>
            <Text style={[styles.stepTitle, { color: theme.colors.textPrimary }]}>{t('onboarding.preferencesTitle')}</Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary, textAlign: 'left' }]}>{t('onboarding.preferencesBody')}</Text>
            <PreferenceRow label={t('onboarding.language')} options={['en', 'ar']} displayLabels={['English', 'العربية']}
              value={preferences.language} onSelect={value => update({ language: value as LanguagePreference })} />
            <PreferenceRow label={t('onboarding.theme')} options={['system', 'light', 'dark']}
              value={preferences.theme} onSelect={value => update({ theme: value as ThemePreference })} />
            <PreferenceRow label={t('onboarding.clock')} options={['12h', '24h']}
              value={preferences.clock} onSelect={value => update({ clock: value as ClockPreference })} />
          </View>
        )}
      </SafeScrollView>

      <SafeStickyAction>
        <View style={styles.footerRow}>
          {showPreferences ? <SecondaryButton label={t('common.back')} onPress={() => setShowPreferences(false)} style={styles.footerButton} /> : null}
          <PrimaryButton
            label={showPreferences ? t('onboarding.enterApp') : t('common.continue')}
            onPress={showPreferences ? finish : () => setShowPreferences(true)}
            style={styles.footerButton}
          />
        </View>
        {!showPreferences ? <SecondaryButton label={t('onboarding.skipOnboarding')} onPress={finish} style={styles.skipButton} /> : null}
      </SafeStickyAction>
    </ScreenContainer>
  );
}

function PreferenceRow({ label, options, value, onSelect, displayLabels }: {
  label: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  displayLabels?: string[];
}) {
  const theme = useTheme();
  return (
    <View style={styles.prefRow}>
      <Text style={[styles.prefLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View style={styles.chipWrap}>
        {options.map((option, index) => (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.chip, { backgroundColor: value === option ? theme.colors.accent : theme.colors.surfaceAlt }]}
          >
            <Text style={{ color: value === option ? theme.colors.accentText : theme.colors.textSecondary, fontSize: 12 }}>
              {displayLabels?.[index] ?? option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  introBlock: { padding: 20, alignItems: 'center' },
  logo: { width: 120, height: 120, borderRadius: 26, marginBottom: 20 },
  block: { padding: 16 },
  appTitle: { fontSize: 25, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  stepTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  promiseCard: { width: '100%', borderRadius: 18, padding: 16, marginTop: 24 },
  promiseTitle: { fontSize: 15, fontWeight: '900', textAlign: 'center' },
  promiseBody: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  prefRow: { marginTop: 20 },
  prefLabel: { fontWeight: '700', marginBottom: 7 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  footerRow: { flexDirection: 'row', gap: 10 },
  footerButton: { flex: 1 },
  skipButton: { marginTop: 10 },
});
