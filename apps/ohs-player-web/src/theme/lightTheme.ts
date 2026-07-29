import type { ThemeConfig } from 'ohs-player-web-core';

/**
 * Light theme — the OHS Player design values for the managed `--ohs-*` colour/typography/radius tokens.
 * The remaining neutral scale, secondary/tertiary borders, quaternary text, status tints, and the
 * granular type scale live in `components/ui/theme.css` (not part of the library's `applyTheme`
 * contract); their dark values are under the `[data-theme='dark']` block there.
 */
export const lightTheme: ThemeConfig = {
  colors: {
    primary: '#094F9A', // Background/Brand, Content/Brand
    primaryHover: '#073C75',
    primaryContrast: '#FAFAFA', // Content/Primary Inverse
    primaryContainer: '#DCE5FE', // Brand-subtle surface — selected segment / selected tree row (matches county badge)
    surface: '#FFFFFF', // Background/Primary — the content card, drawers
    background: '#FAFAFA', // Background/Secondary — page fill behind the white content card
    text: '#0D0D0D', // Content/Primary (Neutral/950)
    textMuted: '#696969', // Content/Tertiary (Neutral/600)
    border: '#EDEDED', // Border/Primary (Neutral/100)
    focusRing: 'rgba(9, 79, 154, 0.28)',
    success: '#006E29', // Content/Positive
  },
  typography: {
    fontFamily: '"Google Sans", system-ui, -apple-system, sans-serif',
    headingFontFamily: '"Google Sans", system-ui, -apple-system, sans-serif',
    baseFontSize: 16,
  },
  borderRadius: { default: 8 },
};
