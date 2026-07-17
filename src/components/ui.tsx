import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      {action}
    </View>
  );
}

export function PrimaryButton({
  label,
  disabled,
  style,
  ...rest
}: PressableProps & { label: string; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buttonBase,
        { backgroundColor: theme.colors.accent, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style as ViewStyle,
      ]}
    >
      <Text style={[styles.buttonLabel, { color: theme.colors.accentText }]}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  disabled,
  style,
  ...rest
}: PressableProps & { label: string; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buttonBase,
        {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
        style as ViewStyle,
      ]}
    >
      <Text style={[styles.buttonLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function DangerButton({
  label,
  disabled,
  style,
  ...rest
}: PressableProps & { label: string; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buttonBase,
        { backgroundColor: theme.colors.danger, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style as ViewStyle,
      ]}
    >
      <Text style={[styles.buttonLabel, { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

export function LoadingState({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.colors.accent} />
      <Text style={[styles.centerLabel, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{body}</Text>
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Text style={[styles.emptyBody, { color: theme.colors.danger }]}>{message}</Text>
      {onRetry ? <PrimaryButton label={retryLabel} onPress={onRetry} style={{ marginTop: 12 }} /> : null}
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'warning' | 'success' | 'danger' }) {
  const theme = useTheme();
  const color =
    tone === 'warning' ? theme.colors.warning : tone === 'success' ? theme.colors.success : tone === 'danger' ? theme.colors.danger : theme.colors.textMuted;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
    elevation: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  buttonBase: { minHeight: 46, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { fontSize: 14, fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  centerLabel: { marginTop: 10, fontSize: 13 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
