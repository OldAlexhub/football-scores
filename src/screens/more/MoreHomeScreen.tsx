import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon, type AppIconName } from '../../components/AppIcon';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeProvider';
import type { MoreStackParamList } from '../../navigation/types';

function MenuRow({ icon, label, onPress, last = false }: { icon: AppIconName; label: string; onPress: () => void; last?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, { opacity: pressed ? 0.62 : 1 }]}>
      <View style={[styles.rowIcon, { backgroundColor: theme.colors.accentSoft }]}><AppIcon name={icon} size={18} color={theme.colors.accent} /></View>
      <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
      <AppIcon name="chevronRight" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: theme.colors.textMuted }]}>{title}</Text>
      <Card style={styles.groupCard}>{children}</Card>
    </View>
  );
}

export function MoreHomeScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const theme = useTheme();
  const nav = (screen: keyof MoreStackParamList) => navigation.navigate(screen as never);

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={24}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('more.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{t('more.subtitle')}</Text>
        </View>

        <Group title={t('more.favorites')}>
          <MenuRow icon="trophy" label={t('more.favoriteCompetitions')} onPress={() => nav('FavoriteCompetitions')} />
          <MenuRow icon="users" label={t('more.favoriteTeams')} onPress={() => nav('FavoriteTeams')} last />
        </Group>

        <Group title={t('more.notifications')}>
          <MenuRow icon="bell" label={t('more.notificationSettings')} onPress={() => nav('NotificationSettings')} last />
        </Group>

        <Group title={t('more.display')}>
          <MenuRow icon="globe" label={t('more.languageSettings')} onPress={() => nav('LanguageSettings')} />
          <MenuRow icon="settings" label={t('more.display')} onPress={() => nav('DisplaySettings')} />
          <MenuRow icon="home" label={t('more.widgetSettings')} onPress={() => nav('WidgetSettings')} last />
        </Group>

        <Group title={t('more.dataSources')}>
          <MenuRow icon="chart" label={t('more.dataSources')} onPress={() => nav('DataSources')} />
          <MenuRow icon="bookmark" label={t('more.dataManagement')} onPress={() => nav('DataManagement')} />
          <MenuRow icon="shield" label={`${t('dataManagement.exportBackup')} / ${t('dataManagement.importBackup')}`} onPress={() => nav('BackupRestore')} last />
        </Group>

        <Group title={t('more.advertisingPrivacy')}>
          <MenuRow icon="settings" label={t('ads.privacyChoices')} onPress={() => nav('AdvertisingPrivacyChoices')} />
          <MenuRow icon="shield" label={t('about.privacyPolicy')} onPress={() => nav('PrivacyPolicy')} last />
        </Group>

        <Group title={t('more.about')}>
          <MenuRow icon="ball" label={t('about.title')} onPress={() => nav('About')} last />
        </Group>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 9, paddingBottom: 2 },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  group: { marginTop: 17 },
  groupTitle: { marginHorizontal: 20, marginBottom: 7, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  groupCard: { marginHorizontal: 16, paddingVertical: 2, paddingHorizontal: 13 },
  row: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
});
