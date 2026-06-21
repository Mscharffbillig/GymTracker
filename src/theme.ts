export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryMuted: string;
  success: string;
  danger: string;
  warning: string;
}

export const lightColors: ThemeColors = {
  background: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F5',
  border: '#E3E6ED',
  text: '#1A1D29',
  textMuted: '#6B7080',
  primary: '#2F6FED',
  primaryMuted: '#E8EFFD',
  success: '#1FA971',
  danger: '#E0473E',
  warning: '#D98A1B',
};

export const darkColors: ThemeColors = {
  background: '#14151C',
  surface: '#1D1F29',
  surfaceAlt: '#262835',
  border: '#323543',
  text: '#F1F2F6',
  textMuted: '#9296A6',
  primary: '#5C8DFB',
  primaryMuted: '#23314F',
  success: '#34C28B',
  danger: '#FF6B61',
  warning: '#F0A93B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

export const fontStyles = {
  title: { fontSize: 24, fontWeight: '700' as const },
  heading: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15 },
  bodyMuted: { fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600' as const },
};
