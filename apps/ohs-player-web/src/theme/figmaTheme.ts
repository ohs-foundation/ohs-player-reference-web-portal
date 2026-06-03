import type { ThemeConfig } from 'ohs-player-web-core';

/**
 * Figma-aligned default theme (ticket #18). Overrides the managed `--ohs-*` colour/typography/radius
 * tokens with the OHS Player design values; the remaining neutral scale, border-secondary/tertiary,
 * quaternary text, status tints, and the granular type scale are defined in `components/ui/theme.css`
 * (they are not part of the library's `applyTheme` contract).
 */
export const figmaTheme: ThemeConfig = {
  colors: {
    primary: '#094F9A', // Background/Brand, Content/Brand
    primaryHover: '#073C75',
    primaryContrast: '#FAFAFA', // Content/Primary Inverse
    primaryContainer: '#E6EEF6',
    surface: '#FFFFFF', // Background/Primary
    background: '#FFFFFF', // no separate gray page fill
    text: '#0D0D0D', // Content/Primary (Neutral/950)
    textMuted: '#696969', // Content/Tertiary (Neutral/600)
    border: '#EDEDED', // Border/Primary (Neutral/100)
    focusRing: 'rgba(9, 79, 154, 0.28)',
    success: '#009933', // Content/Positive
  },
  typography: {
    fontFamily: '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
    headingFontFamily: '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
    baseFontSize: 16,
  },
  borderRadius: { default: 8 },
};
