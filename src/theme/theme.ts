export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentText: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: (multiplier: number) => number;
  radius: { sm: number; md: number; lg: number };
}

const spacing = (multiplier: number) => 4 * multiplier;

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF0F3',
    border: '#E1E4E9',
    textPrimary: '#111318',
    textSecondary: '#4B5563',
    textMuted: '#8A8F98',
    accent: '#1E7A46',
    accentText: '#FFFFFF',
    success: '#1E7A46',
    warning: '#B45309',
    danger: '#C0362C',
    overlay: 'rgba(17,19,24,0.5)',
  },
  spacing,
  radius: { sm: 8, md: 14, lg: 22 },
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#0E1013',
    surface: '#181B20',
    surfaceAlt: '#22262D',
    border: '#2C3038',
    textPrimary: '#F2F3F5',
    textSecondary: '#B4B8C0',
    textMuted: '#797F8A',
    accent: '#34C77B',
    accentText: '#08150F',
    success: '#34C77B',
    warning: '#E0A030',
    danger: '#E5675C',
    overlay: 'rgba(0,0,0,0.6)',
  },
  spacing,
  radius: { sm: 8, md: 14, lg: 22 },
};
