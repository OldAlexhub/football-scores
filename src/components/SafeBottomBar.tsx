import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { SafeAdContainer } from '../ads/SafeAdContainer';
import { useTheme } from '../theme/ThemeProvider';
import { AppIcon, type AppIconName } from './AppIcon';

const TAB_ICONS: Record<string, AppIconName> = {
  MatchesTab: 'ball',
  MatchdayTab: 'calendar',
  PredictTab: 'target',
  InsightsTab: 'chart',
  NewsTab: 'news',
  MoreTab: 'menu',
};

const TAB_LABEL_KEYS: Record<string, string> = {
  MatchesTab: 'tabs.matches',
  MatchdayTab: 'tabs.matchday',
  PredictTab: 'tabs.predict',
  InsightsTab: 'tabs.insights',
  NewsTab: 'news.title',
  MoreTab: 'tabs.more',
};

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
            paddingBottom: Math.max(insets.bottom, 7),
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
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? t(labelKey)}
              onPress={onPress}
              style={({ pressed }) => [styles.tabButton, { opacity: pressed ? 0.66 : 1 }]}
              hitSlop={5}
            >
              <View style={[styles.iconWrap, isFocused && { backgroundColor: theme.colors.accentSoft }]}>
                <AppIcon
                  name={TAB_ICONS[route.name] ?? 'ball'}
                  size={21}
                  color={isFocused ? theme.colors.accent : theme.colors.textMuted}
                />
              </View>
              <Text
                style={[styles.label, { color: isFocused ? theme.colors.accent : theme.colors.textMuted }]}
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
  row: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 51 },
  iconWrap: { width: 42, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, fontWeight: '700', marginTop: 2 },
});
