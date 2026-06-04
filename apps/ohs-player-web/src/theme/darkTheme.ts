import type { ThemeConfig } from 'ohs-player-web-core';

/**
 * Dark theme — counterpart of {@link lightTheme}. Maps the managed `--ohs-*` colour tokens to dark
 * values per the OHS Player theme spec: foreground inverts across the neutral ramp, surfaces step up
 * from black, and accents shift one step lighter so they stay legible on dark surfaces. The non-managed
 * static tokens (surface-variant, borders, quaternary text, status tints) flip via the
 * `[data-theme='dark']` block in `components/ui/theme.css`.
 */
export const darkTheme: ThemeConfig = {
  colors: {
    primary: '#106AC9', // Brand/600
    primaryHover: '#1F87FC', // Brand/500
    primaryContrast: '#FAFAFA',
    primaryContainer: '#04366D', // Brand/800
    surface: '#1A1A1A', // Surface L0 (Neutral/900) — cards, drawers, top bar, sidebar
    background: '#0D0D0D', // Background (Neutral/950) — page
    text: '#FAFAFA', // Content/Primary (Neutral/50)
    textMuted: '#9E9E9E', // Content/Tertiary (Neutral/400)
    border: '#363636', // Border (Neutral/800) — lifted from the spec's 900 for visibility on dark surfaces
    focusRing: 'rgba(31, 135, 252, 0.4)',
    error: '#FF8F8F', // Negative (Red/200)
    warning: '#FFE066', // Notice (Yellow/300)
    success: '#00E04B', // Positive (Green/400)
    info: '#99A9FF', // Info (Blue/200)
  },
  typography: {
    fontFamily: '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
    headingFontFamily: '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
    baseFontSize: 16,
  },
  borderRadius: { default: 8 },
};
