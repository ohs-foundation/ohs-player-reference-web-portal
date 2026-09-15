import type { ThemeConfigV2 } from 'ohs-player-web-core';

const TYPEFACE = '"Google Sans", system-ui, -apple-system, sans-serif';
const MONO_TYPEFACE = '"Google Sans Code", ui-monospace, "SF Mono", "Menlo", monospace';

/** Brand pins over the generated scheme; every unpinned role takes its generated value. */
export const sysTheme: ThemeConfigV2 = {
  overrides: {
    primary: '#094F9A',
    'on-primary': '#FAFAFA',
    'primary-container': '#DCE5FE',
    'surface-container': '#FAFAFA',
    'on-surface': '#0D0D0D',
    'on-surface-variant': '#696969',
    'outline-variant': '#EDEDED',
    error: '#E50000',
  },
  darkOverrides: {
    'primary-container': '#04366D',
    surface: '#1A1A1A',
    'surface-container': '#0D0D0D',
    'surface-container-low': '#1A1A1A',
    'on-surface': '#FAFAFA',
    'on-surface-variant': '#9E9E9E',
    'outline-variant': '#363636',
    error: '#FF8F8F',
  },
  typography: { brandFamily: TYPEFACE, plainFamily: TYPEFACE, monoFamily: MONO_TYPEFACE },
};
