import type { ThemeConfigV2 } from 'ohs-player-web-core';

const TYPEFACE = '"IBM Plex Sans", system-ui, -apple-system, sans-serif';

/** Brand pins over the generated scheme; every unpinned role takes its generated value. */
export const sysTheme: ThemeConfigV2 = {
  overrides: {
    primary: '#094F9A',
    'primary-container': '#DCE5FE',
    'surface-container': '#F1F2F4',
    'on-surface': '#0D0D0D',
  },
  darkOverrides: {
    surface: '#0D0D0D',
    'on-surface': '#FAFAFA',
    'surface-container-low': '#1A1A1A',
  },
  typography: { brandFamily: TYPEFACE, plainFamily: TYPEFACE },
};
