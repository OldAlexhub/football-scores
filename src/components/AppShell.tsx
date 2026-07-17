import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { I18nManager, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AdProvider } from '../ads/AdProvider';
import { initI18n, isRtlLanguage } from '../i18n';
import { RootNavigator, linkingConfig } from '../navigation/RootNavigator';
import { getPreferences } from '../storage/preferencesRepo';
import { initDatabase } from '../storage/db';
import { FavoritesProvider } from '../state/FavoritesContext';
import { PreferencesProvider, usePreferences } from '../state/PreferencesContext';
import { PredictionsProvider } from '../state/PredictionsContext';
import { RemindersProvider } from '../state/RemindersContext';
import { WatchPlanProvider } from '../state/WatchPlanContext';
import { WidgetSyncEffect } from '../state/WidgetSyncEffect';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { LoadingState } from './ui';

const initialPreferences = getPreferences();
initI18n(initialPreferences.language);
if (I18nManager.isRTL !== isRtlLanguage(initialPreferences.language)) {
  I18nManager.allowRTL(isRtlLanguage(initialPreferences.language));
  I18nManager.forceRTL(isRtlLanguage(initialPreferences.language));
}

function ThemedNavigationContainer({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const navTheme = {
    ...DefaultTheme,
    dark: theme.mode === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      primary: theme.colors.accent,
    },
  };
  return (
    <NavigationContainer theme={navTheme} linking={linkingConfig as never}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      {children}
    </NavigationContainer>
  );
}

function ThemedApp() {
  const { preferences } = usePreferences();
  return (
    <ThemeProvider preference={preferences.theme}>
      <ThemedNavigationContainer>
        <FavoritesProvider>
          <WatchPlanProvider>
            <RemindersProvider>
              <PredictionsProvider>
                <AdProvider>
                  <WidgetSyncEffect />
                  <RootNavigator />
                </AdProvider>
              </PredictionsProvider>
            </RemindersProvider>
          </WatchPlanProvider>
        </FavoritesProvider>
      </ThemedNavigationContainer>
    </ThemeProvider>
  );
}

export function AppShell() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase().then(() => setDbReady(true));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {dbReady ? (
          <PreferencesProvider>
            <ThemedApp />
          </PreferencesProvider>
        ) : (
          <ThemeProvider preference="system">
            <LoadingState label="" />
          </ThemeProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
