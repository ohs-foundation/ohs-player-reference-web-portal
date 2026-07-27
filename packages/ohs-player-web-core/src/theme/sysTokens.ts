import { refPalettes } from './palettes';

/**
 * M3 system colour roles emitted as `--ohs-sys-color-*`.
 * `success`/`warning`/`info` are ours — M3 publishes no such roles.
 * @public
 */
export type SysColorRole =
  | 'primary'
  | 'on-primary'
  | 'primary-container'
  | 'on-primary-container'
  | 'secondary'
  | 'on-secondary'
  | 'secondary-container'
  | 'on-secondary-container'
  | 'tertiary'
  | 'on-tertiary'
  | 'error'
  | 'on-error'
  | 'error-container'
  | 'on-error-container'
  | 'surface'
  | 'on-surface'
  | 'on-surface-variant'
  | 'surface-container-lowest'
  | 'surface-container-low'
  | 'surface-container'
  | 'surface-container-high'
  | 'surface-container-highest'
  | 'surface-dim'
  | 'surface-bright'
  | 'outline'
  | 'outline-variant'
  | 'inverse-surface'
  | 'inverse-on-surface'
  | 'inverse-primary'
  | 'scrim'
  | 'shadow'
  | 'success'
  | 'success-container'
  | 'on-success-container'
  | 'warning'
  | 'warning-container'
  | 'on-warning-container'
  | 'info'
  | 'info-container'
  | 'on-info-container';

/** Typescale roles emitted as `--ohs-sys-typescale-<role>-{font,size,line-height,weight}`. @public */
export type TypescaleRole =
  | 'display-small'
  | 'headline-medium'
  | 'title-large'
  | 'title-medium'
  | 'body-large'
  | 'body-medium'
  | 'body-small'
  | 'label-large'
  | 'label-medium'
  | 'label-small';

/** @public */
export interface TypescaleMetrics {
  size: string;
  lineHeight: string;
  weight: number;
  typeface?: 'brand' | 'plain';
}

/** Corner-radius scale emitted as `--ohs-sys-shape-corner-*`. @public */
export type ShapeToken =
  | 'none'
  | 'extra-small'
  | 'small'
  | 'medium'
  | 'large'
  | 'extra-large'
  | 'full';

export type SysColorScheme = Record<SysColorRole, string>;

const P = refPalettes;

/** Light scheme; unpinned roles come from the generated palettes. */
const LIGHT_SCHEME: SysColorScheme = {
  primary: P.primary[40],
  'on-primary': '#ffffff',
  'primary-container': P.primary[90],
  'on-primary-container': P.primary[10],
  secondary: P.secondary[40],
  'on-secondary': '#ffffff',
  'secondary-container': P.secondary[90],
  'on-secondary-container': P.secondary[10],
  tertiary: P.tertiary[40],
  'on-tertiary': '#ffffff',
  error: P.error[40],
  'on-error': '#ffffff',
  'error-container': P.error[90],
  'on-error-container': P.error[10],
  surface: '#ffffff',
  'on-surface': P.neutral[10],
  'on-surface-variant': P.neutralVariant[30],
  'surface-container-lowest': P.neutral[100],
  'surface-container-low': P.neutral[96],
  'surface-container': P.neutral[94],
  'surface-container-high': P.neutral[92],
  'surface-container-highest': P.neutral[90],
  'surface-dim': P.neutral[87],
  'surface-bright': P.neutral[98],
  outline: P.neutralVariant[50],
  'outline-variant': P.neutralVariant[80],
  'inverse-surface': P.neutral[20],
  'inverse-on-surface': P.neutral[96],
  'inverse-primary': P.primary[80],
  scrim: '#000000',
  shadow: '#000000',
  success: '#006e29',
  'success-container': '#e6f6ec',
  'on-success-container': '#00522a',
  warning: '#8f5d00',
  'warning-container': '#ffeb99',
  'on-warning-container': '#5c4a00',
  info: P.primary[40],
  'info-container': P.primary[90],
  'on-info-container': P.primary[10],
};

/** Dark scheme; unpinned roles come from the generated palettes. */
const DARK_SCHEME: SysColorScheme = {
  primary: P.primary[70],
  'on-primary': P.primary[20],
  'primary-container': P.primary[30],
  'on-primary-container': P.primary[90],
  secondary: P.secondary[80],
  'on-secondary': P.secondary[20],
  'secondary-container': P.secondary[30],
  'on-secondary-container': P.secondary[90],
  tertiary: P.tertiary[80],
  'on-tertiary': P.tertiary[20],
  error: P.error[80],
  'on-error': P.error[20],
  'error-container': P.error[30],
  'on-error-container': P.error[90],
  surface: P.neutral[10],
  'on-surface': P.neutral[90],
  'on-surface-variant': P.neutralVariant[80],
  'surface-container-lowest': P.neutral[4],
  'surface-container-low': P.neutral[10],
  'surface-container': P.neutral[12],
  'surface-container-high': P.neutral[17],
  'surface-container-highest': P.neutral[22],
  'surface-dim': P.neutral[6],
  'surface-bright': P.neutral[24],
  outline: P.neutralVariant[60],
  'outline-variant': P.neutralVariant[30],
  'inverse-surface': P.neutral[90],
  'inverse-on-surface': P.neutral[20],
  'inverse-primary': P.primary[40],
  scrim: '#000000',
  shadow: '#000000',
  success: '#00e04b',
  'success-container': '#00522a',
  'on-success-container': '#e6f6ec',
  warning: '#ffe066',
  'warning-container': '#5c4a00',
  'on-warning-container': '#ffeb99',
  info: P.primary[70],
  'info-container': P.primary[30],
  'on-info-container': P.primary[90],
};

/** M3 role names carrying this product's existing IBM Plex metrics. */
const TYPESCALE: Record<TypescaleRole, TypescaleMetrics> = {
  'display-small': { size: '40px', lineHeight: '48px', weight: 500, typeface: 'brand' },
  'headline-medium': { size: '24px', lineHeight: '32px', weight: 600, typeface: 'brand' },
  'title-large': { size: '20px', lineHeight: '28px', weight: 500, typeface: 'brand' },
  'title-medium': { size: '16px', lineHeight: '24px', weight: 600, typeface: 'brand' },
  'body-large': { size: '16px', lineHeight: '24px', weight: 400 },
  'body-medium': { size: '14px', lineHeight: '20px', weight: 400 },
  'body-small': { size: '12px', lineHeight: '16px', weight: 400 },
  'label-large': { size: '16px', lineHeight: '24px', weight: 500 },
  'label-medium': { size: '14px', lineHeight: '20px', weight: 500 },
  'label-small': { size: '12px', lineHeight: '16px', weight: 500 },
};

const SHAPE: Record<ShapeToken, string> = {
  none: '0',
  'extra-small': '4px',
  small: '8px',
  medium: '12px',
  large: '16px',
  'extra-large': '28px',
  full: '9999px',
};

const STATE = {
  'hover-opacity': '0.08',
  'focus-opacity': '0.12',
  'pressed-opacity': '0.12',
  'dragged-opacity': '0.16',
  'disabled-content-opacity': '0.38',
  'disabled-container-opacity': '0.12',
};

const ELEVATION = {
  level0: 'none',
  level1: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)',
  level2: '0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15)',
  level3: '0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 8px 3px rgba(0, 0, 0, 0.15)',
  level4: '0 2px 3px rgba(0, 0, 0, 0.3), 0 6px 10px 4px rgba(0, 0, 0, 0.15)',
  level5: '0 4px 4px rgba(0, 0, 0, 0.3), 0 8px 12px 6px rgba(0, 0, 0, 0.15)',
};

const MOTION = {
  'duration-short2': '100ms',
  'duration-short4': '200ms',
  'duration-medium2': '300ms',
  'easing-standard': 'cubic-bezier(0.2, 0, 0, 1)',
  'easing-standard-decelerate': 'cubic-bezier(0, 0, 0, 1)',
  'easing-standard-accelerate': 'cubic-bezier(0.3, 0, 1, 1)',
};

/* Not emitted as `--ohs-spacing-N`: applyTheme sets that name inline with different values. */
const SPACING_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20];

export const sysColorSchemes = { light: LIGHT_SCHEME, dark: DARK_SCHEME };
export const sysTypescale = TYPESCALE;
export const sysShape = SHAPE;

/** Mode-independent sys tokens: typescale, shape, state, elevation, motion, spacing. */
export function staticSysTokens(
  typography: { brandFamily: string; plainFamily: string },
  typescale: Record<TypescaleRole, TypescaleMetrics> = TYPESCALE,
  shape: Record<ShapeToken, string> = SHAPE,
  density: 0 | -1 | -2 = 0,
): Record<string, string> {
  const out: Record<string, string> = {
    '--ohs-ref-typeface-brand': typography.brandFamily,
    '--ohs-ref-typeface-plain': typography.plainFamily,
    '--ohs-sys-density-scale': String(density),
  };

  for (const [role, m] of Object.entries(typescale) as Array<[TypescaleRole, TypescaleMetrics]>) {
    const prefix = `--ohs-sys-typescale-${role}`;
    out[`${prefix}-font`] = `var(--ohs-ref-typeface-${m.typeface ?? 'plain'})`;
    out[`${prefix}-size`] = m.size;
    out[`${prefix}-line-height`] = m.lineHeight;
    out[`${prefix}-weight`] = String(m.weight);
  }
  for (const [token, value] of Object.entries(shape)) {
    out[`--ohs-sys-shape-corner-${token}`] = value;
  }
  for (const [token, value] of Object.entries(STATE)) out[`--ohs-sys-state-${token}`] = value;
  for (const [token, value] of Object.entries(ELEVATION))
    out[`--ohs-sys-elevation-${token}`] = value;
  for (const [token, value] of Object.entries(MOTION)) out[`--ohs-sys-motion-${token}`] = value;
  for (const step of SPACING_STEPS) out[`--ohs-sys-spacing-${step}`] = `${step * 4}px`;

  return out;
}

/** Reference palette tokens, `--ohs-ref-palette-<name>-<tone>`. */
export function refPaletteTokens(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, tones] of Object.entries(refPalettes)) {
    for (const [tone, hex] of Object.entries(tones)) {
      out[`--ohs-ref-palette-${name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}-${tone}`] =
        hex;
    }
  }
  return out;
}

/** Sys colour tokens for one mode, with overrides applied over the generated scheme. */
export function sysColorTokens(
  mode: 'light' | 'dark',
  overrides: Partial<SysColorScheme> = {},
): Record<string, string> {
  const scheme = { ...sysColorSchemes[mode], ...overrides };
  const out: Record<string, string> = {};
  for (const [role, value] of Object.entries(scheme)) out[`--ohs-sys-color-${role}`] = value;
  return out;
}
