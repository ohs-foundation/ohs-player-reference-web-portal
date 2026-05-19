import type { ThemeConfig } from 'ohs-player-web-core';

/**
 * Coordinated green Material 3 variant. Toggle with `VITE_THEME_ALT=true`.
 */
export const alternateTheme: ThemeConfig = {
  colors: {
    primary: '#16A34A',
    primaryHover: '#15803D',
    primaryContrast: '#FFFFFF',
    primaryContainer: '#D1FAE5',
    secondary: '#0F766E',
    surface: '#FFFFFF',
    background: '#F1FAF4',
    text: '#1F2933',
    textMuted: '#52606D',
    border: '#C8E6D2',
    focusRing: 'rgba(22, 163, 74, 0.28)',
    error: '#B3261E',
    warning: '#E08C00',
    success: '#15803D',
    info: '#0F766E',
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif',
    headingFontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif',
    baseFontSize: 16,
  },
  spacing: { unit: 8 },
  borderRadius: { default: 12 },
};
