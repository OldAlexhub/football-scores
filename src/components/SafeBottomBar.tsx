import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { SafeAdContainer } from '../ads/SafeAdContainer';
import { useTheme } from '../theme/ThemeProvider';

const TAB_ICONS: Record<string, string> = {
  MatchesTab: '⚽',
  MatchdayTab: '🗓',
  PredictTab: '🎯',
  InsightsTab: '📊',
  MoreTab: '☰',
};

const TAB_LABEL_KEYS: Record<string, string> = {
  MatchesTab: 'tabs.matches',
  MatchdayTab: 'tabs.matchday',
  PredictTab: 'tabs.predict',
  InsightsTab: 'tabs.insights',
  MoreTab: 'tabs.more',
};

/**
 * Custom bottom tab bar that hosts the one persistent banner slot directly
 * above the tab buttons, so the banner survives tab switches without
 * remounting and never overlaps the touch targets or the Android nav bar.
 */
export function SafeBottomBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ backgroundColor: theme.colors.surface }}>
      <SafeAdContainer />
      <View
        style={[
          styles.row,
          {
            paddingBottom: Math.max(insets.bottom, 8),
            borderTopColor: theme.colors.border,
            flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const labelKey = TAB_LABEL_KEYS[route.name] ?? route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? t(labelKey)}
              onPress={onPress}
              style={styles.tabButton}
              hitSlop={8}
            >
              <Text style={styles.icon}>{TAB_ICONS[route.name] ?? '•'}</Text>
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? theme.colors.accent : theme.colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  icon: { fontSize: 20 },
  label: { fontSize: 11, marginTop: 2 },
});
