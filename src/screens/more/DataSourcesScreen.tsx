import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, DangerButton, SectionHeader } from '../../components/ui';
import { LIVE_PROVIDERS, getProviderHealth } from '../../providers/providerManager';
import { clearAllCache, getCacheEntryCount, getCacheSizeBytes } from '../../storage/repositories/providerCacheRepo';
import { useTheme } from '../../theme/ThemeProvider';

export function DataSourcesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [cacheSize, setCacheSize] = useState(0);
  const [cacheCount, setCacheCount] = useState(0);
  const health = getProviderHealth();

  const refreshCacheStats = async () => {
    setCacheSize(await getCacheSizeBytes());
    setCacheCount(await getCacheEntryCount());
  };

  useEffect(() => {
    void refreshCacheStats();
  }, []);

  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('dataSources.title')}</Text>
        <Text style={{ color: theme.colors.textMuted, paddingHorizontal: 16, marginBottom: 10 }}>{t('dataSources.delayExplanation')}</Text>

        <SectionHeader title={t('dataSources.activeProviders')} />
        {LIVE_PROVIDERS.map(provider => {
          const providerHealth = health.find(h => h.providerId === provider.id);
          return (
            <Card key={provider.id} style={styles.card}>
              <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{provider.displayName}</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 4 }}>
                {provider.capabilities.requiresApiKey
                  ? provider.isConfigured() ? t('dataSources.keyConfigured') : t('dataSources.keyMissing')
                  : t('dataSources.keyConfigured')}
              </Text>
              <View style={styles.row}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 11, flex: 1 }}>{t('dataSources.lastSuccess')}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{providerHealth?.lastSuccessAtUtc ? new Date(providerHealth.lastSuccessAtUtc).toLocaleString() : '—'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 11, flex: 1 }}>{t('dataSources.lastFailure')}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{providerHealth?.lastFailureAtUtc ? new Date(providerHealth.lastFailureAtUtc).toLocaleString() : '—'}</Text>
              </View>
            </Card>
          );
        })}

        <SectionHeader title={t('dataSources.cacheSize')} />
        <Card style={styles.card}>
          <Text style={{ color: theme.colors.textPrimary }}>{cacheCount} entries · {(cacheSize / 1024).toFixed(1)} KB</Text>
          <DangerButton
            label={t('dataSources.clearCache')}
            style={{ marginTop: 10 }}
            onPress={async () => {
              await clearAllCache();
              await refreshCacheStats();
            }}
          />
        </Card>

        <SectionHeader title={t('dataSources.attribution')} />
        <Card style={styles.card}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>football-data.org, API-Football, OpenFootball (public domain)</Text>
        </Card>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  card: { marginHorizontal: 16, marginBottom: 10 },
  row: { flexDirection: 'row', marginTop: 6 },
});
