import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AdsConsentStatus } from 'react-native-google-mobile-ads';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, PrimaryButton, SectionHeader } from '../../components/ui';
import { useSuppressBanner } from '../../ads/useSuppressBanner';
import { isPrivacyOptionsFormRequired, openPrivacyOptionsForm } from '../../ads/AdConsentManager';
import { useTheme } from '../../theme/ThemeProvider';

const STATUS_LABEL: Record<AdsConsentStatus, string> = {
  [AdsConsentStatus.OBTAINED]: 'Obtained',
  [AdsConsentStatus.NOT_REQUIRED]: 'Not required',
  [AdsConsentStatus.REQUIRED]: 'Required',
  [AdsConsentStatus.UNKNOWN]: 'Unknown',
};

export function AdvertisingPrivacyChoicesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [status, setStatus] = useState<AdsConsentStatus>(AdsConsentStatus.UNKNOWN);
  const [formRequired, setFormRequired] = useState(false);

  useSuppressBanner();

  useEffect(() => {
    isPrivacyOptionsFormRequired().then(setFormRequired);
  }, []);

  const handleOpenForm = async () => {
    const result = await openPrivacyOptionsForm();
    setStatus(result.status);
  };

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('ads.privacyChoices')}</Text>

        <Card style={styles.card}>
          <Text style={{ color: theme.colors.textSecondary, lineHeight: 20 }}>{t('ads.thirdPartyDisclosure')}</Text>
        </Card>

        <SectionHeader title={t('ads.consentStatus')} />
        <Card style={styles.card}>
          <Text style={{ color: theme.colors.textPrimary }}>{STATUS_LABEL[status] ?? 'Unknown'}</Text>
        </Card>

        {formRequired ? (
          <PrimaryButton label={t('ads.openPrivacyForm')} onPress={handleOpenForm} style={{ marginHorizontal: 16, marginTop: 10 }} />
        ) : null}

        <Card style={styles.card}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{t('ads.freeWithAds')}</Text>
        </Card>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  card: { marginHorizontal: 16, marginTop: 10 },
});
