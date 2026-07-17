import React from 'react';
import { Modal, StyleSheet, View, type ModalProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { useSuppressBanner } from '../ads/useSuppressBanner';

/**
 * Full-screen modal wrapper for destructive confirmations and share/export
 * previews. Always suppresses the persistent banner while visible.
 */
export function SafeModalContainer({
  visible,
  onRequestClose,
  children,
  ...rest
}: ModalProps & { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  useSuppressBanner(visible);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose} {...rest}>
      <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              paddingBottom: insets.bottom + 20,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    maxHeight: '85%',
  },
});
