import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { resolveTeamCrest } from '../services/teamCrestResolver';
import { AppIcon } from './AppIcon';

export function TeamCrest({
  uri,
  name,
  initials: _initials,
  size = 44,
}: {
  uri?: string | null;
  name: string;
  initials?: string | null;
  size?: number;
}) {
  const theme = useTheme();
  const [sourceUri, setSourceUri] = useState<string | null>(uri ?? null);
  const isSvg = useMemo(() => !!sourceUri && /\.svg(?:\?|$)/i.test(sourceUri), [sourceUri]);

  const findFallback = useCallback(() => {
    resolveTeamCrest(name).then(setSourceUri).catch(() => setSourceUri(null));
  }, [name]);

  useEffect(() => {
    setSourceUri(uri ?? null);
    if (!uri) findFallback();
  }, [findFallback, uri]);

  const frameStyle = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.28),
  };

  if (sourceUri) {
    return (
      <View
        accessibilityLabel={`${name} crest`}
        style={[styles.frame, frameStyle, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}
      >
        {isSvg ? (
          <SvgUri width={size - 10} height={size - 10} uri={sourceUri} onError={() => sourceUri === uri ? findFallback() : setSourceUri(null)} />
        ) : (
          <Image
            source={{ uri: sourceUri }}
            resizeMode="contain"
            onError={() => sourceUri === uri ? findFallback() : setSourceUri(null)}
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
      <AppIcon name="shield" size={Math.max(18, size * 0.5)} color={theme.colors.textMuted} />
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
});
