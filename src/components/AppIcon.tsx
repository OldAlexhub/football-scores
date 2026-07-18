import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type AppIconName =
  | 'ball'
  | 'calendar'
  | 'target'
  | 'chart'
  | 'menu'
  | 'news'
  | 'search'
  | 'bell'
  | 'shield'
  | 'star'
  | 'plus'
  | 'clock'
  | 'trophy'
  | 'users'
  | 'settings'
  | 'chevronRight'
  | 'home'
  | 'globe'
  | 'spark'
  | 'bookmark'
  | 'alert'
  | 'mail';

export function AppIcon({ name, size = 22, color }: { name: AppIconName; size?: number; color: string }) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {name === 'ball' ? (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="m9.2 9.1 2.8-2 2.8 2-1.1 3.3h-3.4L9.2 9.1Z" {...common} />
          <Path d="m12 7.1-.2-4M9.2 9.1 5.5 7.8m4.8 4.6-2.2 3.1m5.6-3.1 2.2 3.1m-1.1-6.4 3.7-1.3M8.1 15.5l.5 3.7m7.3-3.7-.5 3.7" {...common} />
        </>
      ) : name === 'calendar' ? (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="3" {...common} />
          <Line x1="8" y1="3" x2="8" y2="7" {...common} />
          <Line x1="16" y1="3" x2="16" y2="7" {...common} />
          <Line x1="3" y1="10" x2="21" y2="10" {...common} />
        </>
      ) : name === 'target' ? (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Circle cx="12" cy="12" r="5" {...common} />
          <Circle cx="12" cy="12" r="1.5" fill={color} />
        </>
      ) : name === 'chart' ? (
        <Path d="M4 19V9m6 10V5m6 14v-7m4 7H2" {...common} />
      ) : name === 'menu' ? (
        <>
          <Line x1="4" y1="6" x2="20" y2="6" {...common} />
          <Line x1="4" y1="12" x2="20" y2="12" {...common} />
          <Line x1="4" y1="18" x2="20" y2="18" {...common} />
        </>
      ) : name === 'news' ? (
        <>
          <Rect x="4" y="3" width="16" height="18" rx="2" {...common} />
          <Rect x="7" y="7" width="4" height="4" rx="1" {...common} />
          <Line x1="14" y1="8" x2="17" y2="8" {...common} />
          <Line x1="14" y1="11" x2="17" y2="11" {...common} />
          <Line x1="7" y1="15" x2="17" y2="15" {...common} />
          <Line x1="7" y1="18" x2="14" y2="18" {...common} />
        </>
      ) : name === 'search' ? (
        <>
          <Circle cx="10.5" cy="10.5" r="6.5" {...common} />
          <Line x1="15.5" y1="15.5" x2="21" y2="21" {...common} />
        </>
      ) : name === 'bell' ? (
        <>
          <Path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8Z" {...common} />
          <Path d="M10 21h4" {...common} />
        </>
      ) : name === 'shield' ? (
        <Path d="M12 3 5 6v5c0 4.8 2.8 8.2 7 10 4.2-1.8 7-5.2 7-10V6l-7-3Z" {...common} />
      ) : name === 'star' ? (
        <Path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" {...common} />
      ) : name === 'plus' ? (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...common} />
          <Line x1="5" y1="12" x2="19" y2="12" {...common} />
        </>
      ) : name === 'clock' ? (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Polyline points="12 7 12 12 15.5 14" {...common} />
        </>
      ) : name === 'trophy' ? (
        <>
          <Path d="M8 4h8v4c0 3-1.7 5-4 5s-4-2-4-5V4Z" {...common} />
          <Path d="M8 6H4v1c0 2.4 1.5 4 4.4 4M16 6h4v1c0 2.4-1.5 4-4.4 4M12 13v4m-4 4h8m-6-4h4" {...common} />
        </>
      ) : name === 'users' ? (
        <>
          <Circle cx="9" cy="8" r="3" {...common} />
          <Path d="M3.5 19c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M15 5.5a3 3 0 0 1 0 5.5m1 2c2.7.5 4.2 2.4 4.5 5" {...common} />
        </>
      ) : name === 'settings' ? (
        <>
          <Line x1="4" y1="6" x2="20" y2="6" {...common} />
          <Line x1="4" y1="12" x2="20" y2="12" {...common} />
          <Line x1="4" y1="18" x2="20" y2="18" {...common} />
          <Circle cx="9" cy="6" r="2" fill={color} />
          <Circle cx="15" cy="12" r="2" fill={color} />
          <Circle cx="7" cy="18" r="2" fill={color} />
        </>
      ) : name === 'chevronRight' ? (
        <Polyline points="9 5 16 12 9 19" {...common} />
      ) : name === 'home' ? (
        <Path d="m3 11 9-8 9 8v9h-6v-6H9v6H3v-9Z" {...common} />
      ) : name === 'globe' ? (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" {...common} />
        </>
      ) : name === 'spark' ? (
        <Path d="m12 2 1.5 5.4L19 9l-5.5 1.6L12 16l-1.5-5.4L5 9l5.5-1.6L12 2Zm6 13 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15Z" {...common} />
      ) : name === 'bookmark' ? (
        <Path d="M6 3h12v18l-6-4-6 4V3Z" {...common} />
      ) : name === 'mail' ? (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="3" {...common} />
          <Path d="m4.5 7 7.5 6 7.5-6" {...common} />
        </>
      ) : (
        <>
          <Path d="M12 3 2.8 20h18.4L12 3Z" {...common} />
          <Line x1="12" y1="9" x2="12" y2="14" {...common} />
          <Circle cx="12" cy="17" r=".8" fill={color} />
        </>
      )}
    </Svg>
  );
}
