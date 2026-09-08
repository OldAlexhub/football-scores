import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppIcon } from './AppIcon';

interface Props {
  uri: string | null;
  size?: number;
}

/** Remote thumbnail with a neutral icon fallback (mirrors TeamCrest's pattern). */
export function NewsThumb({ uri, size = 84 }: Props) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const dims = { width: size, height: size, borderRadius: 10 };

  if (!uri || failed) {
    return (
      <View style={[dims, styles.fallback, { backgroundColor: theme.colors.surfaceAlt }]}>
        <AppIcon name="news" size={size * 0.34} color={theme.colors.textMuted} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[dims, { backgroundColor: theme.colors.surfaceAlt }]}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
