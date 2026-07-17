import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, SectionHeader } from '../../components/ui';
import { useTheme } from '../../theme/ThemeProvider';
import type { MoreStackParamList } from '../../navigation/types';

function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: theme.colors.textMuted }}>›</Text>
    </Pressable>
  );
}

export function MoreHomeScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();

  const nav = (screen: keyof MoreStackParamList) => navigation.navigate(screen as never);

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('more.title')}</Text>

        <SectionHeader title={t('more.favorites')} />
        <Card>
          <MenuRow label={t('more.favoriteCompetitions')} onPress={() => nav('FavoriteCompetitions')} />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <MenuRow label={t('more.favoriteTeams')} onPress={() => nav('FavoriteTeams')} />
        </Card>

        <SectionHeader title={t('more.notifications')} />
        <Card>
          <MenuRow label={t('more.notificationSettings')} onPress={() => nav('NotificationSettings')} />
        </Card>

        <SectionHeader title={t('more.display')} />
        <Card>
          <MenuRow label={t('more.languageSettings')} onPress={() => nav('LanguageSettings')} />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <MenuRow label={t('more.display')} onPress={() => nav('DisplaySettings')} />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <MenuRow label={t('more.widgetSettings')} onPress={() => nav('WidgetSettings')} />
        </Card>

        <SectionHeader title={t('more.dataSources')} />
        <Card>
          <MenuRow label={t('more.dataSources')} onPress={() => nav('DataSources')} />
        </Card>

        <SectionHeader title={t('more.dataManagement')} />
        <Card>
          <MenuRow label={t('more.dataManagement')} onPress={() => nav('DataManagement')} />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <MenuRow label={t('dataManagement.exportBackup') + ' / ' + t('dataManagement.importBackup')} onPress={() => nav('BackupRestore')} />
        </Card>

        <SectionHeader title={t('more.advertisingPrivacy')} />
        <Card>
          <MenuRow label={t('ads.privacyChoices')} onPress={() => nav('AdvertisingPrivacyChoices')} />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <MenuRow label={t('about.privacyPolicy')} onPress={() => nav('PrivacyPolicy')} />
        </Card>

        <SectionHeader title={t('more.about')} />
        <Card>
          <MenuRow label={t('about.title')} onPress={() => nav('About')} />
        </Card>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  divider: { height: StyleSheet.hairlineWidth },
});
