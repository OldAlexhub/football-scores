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
    background: '#F3F6F8',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceAlt: '#EDF3F0',
    border: '#DEE6E9',
    textPrimary: '#102019',
    textSecondary: '#4A5D54',
    textMuted: '#7B8A83',
    accent: '#3A7E22',
    accentSoft: '#DDF5E9',
    accentText: '#FFFFFF',
    success: '#3A7E22',
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
    background: '#0B1118',
    surface: '#121B25',
    surfaceElevated: '#172330',
    surfaceAlt: '#1D2B39',
    border: '#2A3A4B',
    textPrimary: '#F1F5F8',
    textSecondary: '#B0BECC',
    textMuted: '#879AAC',
    accent: '#B2F477',
    accentSoft: '#223624',
    accentText: '#14220A',
    success: '#34C77B',
    warning: '#E0A030',
    danger: '#E5675C',
    overlay: 'rgba(0,0,0,0.6)',
  },
  spacing,
  radius: { sm: 8, md: 14, lg: 22 },
};
