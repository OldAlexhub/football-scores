import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../components/AppIcon';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, SecondaryButton, SectionHeader } from '../../components/ui';
import { useTheme } from '../../theme/ThemeProvider';

const APP_VERSION = '1.0.0';
const SUPPORT_EMAIL = 'info@oldalexhub.com';

export function AboutScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();

  const handleEmail = async () => {
    const subject = encodeURIComponent(t('about.emailSubject'));
    await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {
      Alert.alert(t('about.contact'), t('about.emailUnavailable'));
    });
  };

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
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 }}>OpenFootball, TheSportsDB, ESPN, football-data.org, API-Football</Text>
        </Card>

        <SectionHeader title={t('about.contact')} />
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${t('about.emailUs')}: ${SUPPORT_EMAIL}`}
          onPress={handleEmail}
          style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}
        >
          <Card style={styles.contactCard}>
            <View style={[styles.contactIcon, { backgroundColor: theme.colors.accentSoft }]}>
              <AppIcon name="mail" size={19} color={theme.colors.accent} />
            </View>
            <View style={styles.contactCopy}>
              <Text style={[styles.contactLabel, { color: theme.colors.textMuted }]}>{t('about.emailUs')}</Text>
              <Text style={[styles.contactEmail, { color: theme.colors.accent }]}>{SUPPORT_EMAIL}</Text>
            </View>
            <AppIcon name="chevronRight" size={18} color={theme.colors.textMuted} />
          </Card>
        </Pressable>

        <SecondaryButton label={t('about.privacyPolicy')} onPress={() => navigation.navigate('PrivacyPolicy')} style={{ marginHorizontal: 16, marginTop: 10 }} />
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, textAlign: 'center' },
  card: { marginHorizontal: 16, marginTop: 14 },
  contactCard: { marginHorizontal: 16, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  contactIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactCopy: { flex: 1 },
  contactLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  contactEmail: { fontSize: 14, fontWeight: '800', marginTop: 2 },
});
