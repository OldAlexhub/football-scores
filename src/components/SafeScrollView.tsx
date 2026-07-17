import React from 'react';
import { RefreshControl, ScrollView, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Adds bottom padding for the tab bar + persistent banner + gesture inset so
 * the last row of content is never hidden behind them.
 */
export function SafeScrollView({
  children,
  contentBottomPadding = 0,
  onRefresh,
  refreshing = false,
  ...rest
}: ScrollViewProps & {
  children: React.ReactNode;
  contentBottomPadding?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <ScrollView
      {...rest}
      contentContainerStyle={[
        { paddingBottom: insets.bottom + contentBottomPadding + 24 },
        rest.contentContainerStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
