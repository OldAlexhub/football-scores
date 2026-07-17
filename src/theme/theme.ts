export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
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
    surfaceElevated: '#FFFFFF',
    surfaceAlt: '#F0F4F2',
    border: '#DDE5E1',
    textPrimary: '#102019',
    textSecondary: '#4A5D54',
    textMuted: '#7B8A83',
    accent: '#0A8F52',
    accentSoft: '#DDF5E9',
    accentText: '#FFFFFF',
    success: '#0A8F52',
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
    surface: '#151C18',
    surfaceElevated: '#1A241F',
    surfaceAlt: '#202C26',
    border: '#2C3A33',
    textPrimary: '#F0F7F3',
    textSecondary: '#B3C2BA',
    textMuted: '#7F9187',
    accent: '#35D07F',
    accentSoft: '#173D29',
    accentText: '#08150F',
    success: '#34C77B',
    warning: '#E0A030',
    danger: '#E5675C',
    overlay: 'rgba(0,0,0,0.6)',
  },
  spacing,
  radius: { sm: 8, md: 14, lg: 22 },
};
