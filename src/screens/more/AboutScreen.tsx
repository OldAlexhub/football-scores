import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, SecondaryButton, SectionHeader } from '../../components/ui';
import { useTheme } from '../../theme/ThemeProvider';

const APP_VERSION = '1.0.0';

export function AboutScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('common.appName')}</Text>

        <Card style={styles.card}>
          <Text style={{ color: theme.colors.textSecondary }}>{t('about.version', { version: APP_VERSION })}</Text>
          <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>{t('about.developer', { developer: 'Old Alex Hub' })}</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 }}>{t('about.nonAffiliation')}</Text>
        </Card>

        <SectionHeader title={t('about.dataAttribution')} />
        <Card style={styles.card}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>OpenFootball (public domain), football-data.org, API-Football</Text>
        </Card>

        <SectionHeader title={t('about.contact')} />
        <Card style={styles.card}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>[insert support contact]</Text>
        </Card>

        <SecondaryButton label={t('about.privacyPolicy')} onPress={() => navigation.navigate('PrivacyPolicy')} style={{ marginHorizontal: 16, marginTop: 10 }} />
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, textAlign: 'center' },
  card: { marginHorizontal: 16, marginTop: 14 },
});
