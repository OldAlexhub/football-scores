import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { ScreenContainer } from './ScreenContainer';

export function KeyboardSafeScreen({ children }: { children: React.ReactNode }) {
  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'android' ? 'height' : 'padding'}
        keyboardVerticalOffset={0}
      >
        {children}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
