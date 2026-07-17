import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

/**
 * A bottom-pinned action bar for screens presented outside the tab bar
 * (Prediction Editor, Reminder Editor, …). Never place a banner behind
 * this — those screens call useSuppressBanner() so no banner is mounted
 * while they're on screen.
 */
export function SafeStickyAction({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + 12,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
