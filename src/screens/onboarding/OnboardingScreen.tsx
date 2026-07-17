import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SafeStickyAction } from '../../components/SafeStickyAction';
import { LoadingState, PrimaryButton, SecondaryButton } from '../../components/ui';
import { useSuppressBanner } from '../../ads/useSuppressBanner';
import { useCompetitions } from '../../hooks/useCompetitions';
import { useFavorites } from '../../state/FavoritesContext';
import { usePreferences } from '../../state/PreferencesContext';
import { useTheme } from '../../theme/ThemeProvider';
import { fetchTeams } from '../../providers/providerManager';
import type {
  ClockPreference, DefaultTab, LanguagePreference, ThemePreference,
} from '../../types/domain';
import type { Team } from '../../types/domain';

const STEPS = ['intro', 'competitions', 'teams', 'preferences', 'review'] as const;
type Step = typeof STEPS[number];

// Shown by default in the teams step so it's never empty, before the user
// has picked any favorite competitions — matches this app's "minimal input,
// everything optional" onboarding philosophy.
const DEFAULT_POPULAR_COMPETITION_CODES = ['en.1', 'es.1', 'de.1', 'it.1', 'fr.1', 'mls.1'];

export function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { competitions } = useCompetitions();
  const { toggleCompetition, toggleTeam, favoriteCompetitionIds, favoriteTeamIds } = useFavorites();
  const { preferences, update } = usePreferences();

  useSuppressBanner();

  const [stepIndex, setStepIndex] = useState(0);
  const [competitionSearch, setCompetitionSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [teamsForFavorites, setTeamsForFavorites] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const step: Step = STEPS[stepIndex];

  const favoriteCompetitions = useMemo(
    () => competitions.filter(c => favoriteCompetitionIds.has(c.id)),
    [competitions, favoriteCompetitionIds],
  );
  const showingPopularDefault = favoriteCompetitions.length === 0;

  React.useEffect(() => {
    if (competitions.length === 0) return;
    const source = showingPopularDefault
      ? competitions.filter(c => DEFAULT_POPULAR_COMPETITION_CODES.includes(c.providerCompetitionId))
      : favoriteCompetitions;
    setTeamsLoading(true);
    Promise.all(source.map(c => fetchTeams(c.providerCompetitionId))).then(results => {
      setTeamsForFavorites(results.flatMap(r => r.data));
      setTeamsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitions, favoriteCompetitions, showingPopularDefault]);

  const goNext = () => setStepIndex(i => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIndex(i => Math.max(i - 1, 0));

  const finish = async () => {
    await update({ onboardingCompleted: true });
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const filteredCompetitions = competitions.filter(c => c.name.toLowerCase().includes(competitionSearch.toLowerCase()) || c.country?.toLowerCase().includes(competitionSearch.toLowerCase()));
  const filteredTeams = teamsForFavorites.filter(tm => tm.name.toLowerCase().includes(teamSearch.toLowerCase()));

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        {step === 'intro' ? (
          <View style={styles.introBlock}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.appTitle, { color: theme.colors.textPrimary }]}>{t('onboarding.welcomeTitle')}</Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{t('onboarding.welcomeBody')}</Text>
          </View>
        ) : null}

        {step === 'competitions' ? (
          <View style={styles.block}>
            <Text style={[styles.stepTitle, { color: theme.colors.textPrimary }]}>{t('onboarding.competitionsTitle')}</Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary, textAlign: 'left' }]}>{t('onboarding.competitionsBody')}</Text>
            <TextInput
              value={competitionSearch}
              onChangeText={setCompetitionSearch}
              placeholder={t('onboarding.searchCompetitions')}
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.search, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
            />
            <View style={styles.chipWrap}>
              {filteredCompetitions.map(c => (
                <Pressable
                  key={c.id}
                  onPress={() => toggleCompetition(c.id)}
                  style={[styles.chip, { backgroundColor: favoriteCompetitionIds.has(c.id) ? theme.colors.accent : theme.colors.surfaceAlt }]}
                >
                  <Text style={{ color: favoriteCompetitionIds.has(c.id) ? theme.colors.accentText : theme.colors.textSecondary, fontSize: 12 }}>
                    {c.name} · {c.country}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {step === 'teams' ? (
          <View style={styles.block}>
            <Text style={[styles.stepTitle, { color: theme.colors.textPrimary }]}>{t('onboarding.teamsTitle')}</Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary, textAlign: 'left' }]}>
              {showingPopularDefault ? t('onboarding.teamsBodyDefault') : t('onboarding.teamsBody')}
            </Text>
            {teamsLoading ? (
              <LoadingState label={t('common.loading')} />
            ) : (
              <>
                <TextInput
                  value={teamSearch}
                  onChangeText={setTeamSearch}
                  placeholder={t('onboarding.searchTeams')}
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.search, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                />
                <View style={styles.chipWrap}>
                  {filteredTeams.map(tm => (
                    <Pressable
                      key={tm.id}
                      onPress={() => toggleTeam(tm.id)}
                      style={[styles.chip, { backgroundColor: favoriteTeamIds.has(tm.id) ? theme.colors.accent : theme.colors.surfaceAlt }]}
                    >
                      <Text style={{ color: favoriteTeamIds.has(tm.id) ? theme.colors.accentText : theme.colors.textSecondary, fontSize: 12 }}>
                        {tm.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        ) : null}

        {step === 'preferences' ? (
          <View style={styles.block}>
            <Text style={[styles.stepTitle, { color: theme.colors.textPrimary }]}>{t('onboarding.preferencesTitle')}</Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary, textAlign: 'left' }]}>{t('onboarding.preferencesBody')}</Text>

            <PreferenceRow label={t('onboarding.language')} options={['en', 'ar']} displayLabels={['English', 'العربية']}
              value={preferences.language} onSelect={v => update({ language: v as LanguagePreference })} theme={theme} />
            <PreferenceRow label={t('onboarding.theme')} options={['system', 'light', 'dark']}
              value={preferences.theme} onSelect={v => update({ theme: v as ThemePreference })} theme={theme} />
            <PreferenceRow label={t('onboarding.clock')} options={['12h', '24h']}
              value={preferences.clock} onSelect={v => update({ clock: v as ClockPreference })} theme={theme} />
            <PreferenceRow label={t('onboarding.openingTab')} options={['matches', 'matchday', 'predict', 'insights', 'more']}
              value={preferences.defaultOpeningTab} onSelect={v => update({ defaultOpeningTab: v as DefaultTab })} theme={theme}
              displayLabels={['matches', 'matchday', 'predict', 'insights', 'more'].map(k => t(`tabs.${k}`))} />
          </View>
        ) : null}

        {step === 'review' ? (
          <View style={styles.block}>
            <Text style={[styles.stepTitle, { color: theme.colors.textPrimary }]}>{t('onboarding.reviewTitle')}</Text>
            <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>
              {t('onboarding.selectedCompetitions')}: {favoriteCompetitionIds.size > 0 ? favoriteCompetitionIds.size : t('onboarding.none')}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>
              {t('onboarding.selectedTeams')}: {favoriteTeamIds.size > 0 ? favoriteTeamIds.size : t('onboarding.none')}
            </Text>
          </View>
        ) : null}
      </SafeScrollView>

      <SafeStickyAction>
        <View style={styles.footerRow}>
          {stepIndex > 0 ? <SecondaryButton label={t('common.back')} onPress={goBack} style={styles.footerButton} /> : <View style={styles.footerButton} />}
          {step === 'review' ? (
            <PrimaryButton label={t('onboarding.enterApp')} onPress={finish} style={styles.footerButton} />
          ) : (
            <PrimaryButton label={t('common.continue')} onPress={goNext} style={styles.footerButton} />
          )}
        </View>
        {step !== 'review' ? <SecondaryButton label={t('onboarding.skipOnboarding')} onPress={finish} style={{ marginTop: 10 }} /> : null}
      </SafeStickyAction>
    </ScreenContainer>
  );
}

function PreferenceRow({
  label, options, value, onSelect, theme, displayLabels,
}: {
  label: string; options: string[]; value: string; onSelect: (v: string) => void; theme: ReturnType<typeof useTheme>; displayLabels?: string[];
}) {
  return (
    <View style={styles.prefRow}>
      <Text style={{ color: theme.colors.textPrimary, fontWeight: '600', marginBottom: 6 }}>{label}</Text>
      <View style={styles.chipWrap}>
        {options.map((opt, i) => (
          <Pressable
            key={opt}
            onPress={() => onSelect(opt)}
            style={[styles.chip, { backgroundColor: value === opt ? theme.colors.accent : theme.colors.surfaceAlt }]}
          >
            <Text style={{ color: value === opt ? theme.colors.accentText : theme.colors.textSecondary, fontSize: 12 }}>
              {displayLabels ? displayLabels[i] : opt}
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
  appTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  stepTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  search: { marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  prefRow: { marginTop: 16 },
  footerRow: { flexDirection: 'row', gap: 10 },
  footerButton: { flex: 1 },
});
