import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeProvider';

export function WidgetSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('widget.settingsTitle')}</Text>
        <Card style={styles.card}>
          <Text style={{ color: theme.colors.textSecondary, lineHeight: 20 }}>{t('widget.description')}</Text>
        </Card>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, marginBottom: 10 },
  card: { marginHorizontal: 16 },
});
