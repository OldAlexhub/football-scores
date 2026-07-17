import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function FilterChip({
  label,
  active,
  onPress,
  compact = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        {
          backgroundColor: active ? theme.colors.accent : theme.colors.surface,
          borderColor: active ? theme.colors.accent : theme.colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          compact && styles.compactLabel,
          { color: active ? theme.colors.accentText : theme.colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compact: { minHeight: 34, paddingHorizontal: 12, borderRadius: 17 },
  label: { fontSize: 13, fontWeight: '700' },
  compactLabel: { fontSize: 12 },
});
