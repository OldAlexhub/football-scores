import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeScrollView } from '../../components/SafeScrollView';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PRIVACY_POLICY_TEXT } from '../../content/privacyPolicyText';
import { useTheme } from '../../theme/ThemeProvider';

export function PrivacyPolicyScreen() {
  const theme = useTheme();
  return (
    <ScreenContainer>
      <SafeScrollView contentBottomPadding={20}>
        <Text style={[styles.text, { color: theme.colors.textSecondary }]}>{PRIVACY_POLICY_TEXT}</Text>
      </SafeScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 13, lineHeight: 20, padding: 16 },
});
