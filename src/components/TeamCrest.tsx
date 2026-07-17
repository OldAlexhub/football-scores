import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

function initialsFor(name: string, supplied?: string): string {
  if (supplied?.trim()) return supplied.trim().slice(0, 3).toUpperCase();
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map(word => word[0]).join('').toUpperCase();
}

export function TeamCrest({
  uri,
  name,
  initials,
  size = 44,
}: {
  uri?: string | null;
  name: string;
  initials?: string | null;
  size?: number;
}) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const isSvg = useMemo(() => !!uri && /\.svg(?:\?|$)/i.test(uri), [uri]);

  useEffect(() => setFailed(false), [uri]);

  const frameStyle = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.28),
  };

  if (uri && !failed) {
    return (
      <View
        accessibilityLabel={`${name} crest`}
        style={[styles.frame, frameStyle, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}
      >
        {isSvg ? (
          <SvgUri width={size - 10} height={size - 10} uri={uri} onError={() => setFailed(true)} />
        ) : (
          <Image
            source={{ uri }}
            resizeMode="contain"
            onError={() => setFailed(true)}
            style={{ width: size - 10, height: size - 10 }}
          />
        )}
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`${name} crest unavailable`}
      style={[
        styles.frame,
        frameStyle,
        { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.initials, { color: theme.colors.accent, fontSize: Math.max(10, size * 0.24) }]}> 
        {initialsFor(name, initials ?? undefined)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  initials: { fontWeight: '900', letterSpacing: 0.3 },
});
