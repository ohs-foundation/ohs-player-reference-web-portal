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

/**
 * Typescale roles emitted as
 * `--ohs-sys-typescale-<role>-{font,size,line-height,weight,letter-spacing}`.
 * `heading-*`/`text-*` are ours — M3 has no role at those steps.
 * @public
 */
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
  | 'label-small'
  | 'heading-5xl'
  | 'heading-4xl'
  | 'heading-3xl'
  | 'heading-2xl'
  | 'heading-l'
  | 'text-xl'
  | 'text-xs'
  | 'text-2xs';

/** @public */
export interface TypescaleMetrics {
  size: string;
  lineHeight: string;
  weight: number;
  /** Tracking; omitted means `normal`. */
  letterSpacing?: string;
  typeface?: 'brand' | 'plain';
}

/**
 * Corner-radius scale emitted as `--ohs-sys-shape-corner-*`.
 * `extra-large-decreased` (24px) is ours — M3's scale steps 20 → 28.
 * @public
 */
export type ShapeToken =
  | 'none'
  | 'extra-small'
  | 'small'
  | 'medium'
  | 'large'
  | 'extra-large-decreased'
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

const TYPESCALE: Record<TypescaleRole, TypescaleMetrics> = {
  'display-small': { size: '40px', lineHeight: '48px', weight: 500, letterSpacing: '-1px', typeface: 'brand' },
  'headline-medium': { size: '24px', lineHeight: '32px', weight: 500, letterSpacing: '-0.5px', typeface: 'brand' },
  'title-large': { size: '20px', lineHeight: '28px', weight: 500, letterSpacing: '-0.5px', typeface: 'brand' },
  'title-medium': { size: '16px', lineHeight: '24px', weight: 500, letterSpacing: '-0.5px', typeface: 'brand' },
  'body-large': { size: '16px', lineHeight: '24px', weight: 400, letterSpacing: '-0.5px' },
  'body-medium': { size: '14px', lineHeight: '20px', weight: 400, letterSpacing: '-0.5px' },
  'body-small': { size: '12px', lineHeight: '16px', weight: 400, letterSpacing: '-0.5px' },
  'label-large': { size: '16px', lineHeight: '24px', weight: 500, letterSpacing: '-0.5px' },
  'label-medium': { size: '14px', lineHeight: '20px', weight: 500, letterSpacing: '-0.5px' },
  'label-small': { size: '12px', lineHeight: '16px', weight: 500, letterSpacing: '-0.5px' },
  'heading-5xl': { size: '72px', lineHeight: '80px', weight: 500, letterSpacing: '-1.5px', typeface: 'brand' },
  'heading-4xl': { size: '64px', lineHeight: '72px', weight: 500, letterSpacing: '-1.5px', typeface: 'brand' },
  'heading-3xl': { size: '56px', lineHeight: '64px', weight: 500, letterSpacing: '-1.5px', typeface: 'brand' },
  'heading-2xl': { size: '48px', lineHeight: '64px', weight: 500, letterSpacing: '-1.5px', typeface: 'brand' },
  'heading-l': { size: '32px', lineHeight: '40px', weight: 500, letterSpacing: '-1px', typeface: 'brand' },
  'text-xl': { size: '20px', lineHeight: '28px', weight: 400, letterSpacing: '-0.5px' },
  'text-xs': { size: '10px', lineHeight: '14px', weight: 400, letterSpacing: '-0.5px' },
  'text-2xs': { size: '8px', lineHeight: '12px', weight: 400, letterSpacing: '-0.5px' },
};

const SHAPE: Record<ShapeToken, string> = {
  none: '0',
  'extra-small': '4px',
  small: '8px',
  medium: '12px',
  large: '16px',
  'extra-large-decreased': '24px',
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

/* Level structure is M3; the ink stays on the reviewed slate-tinted recipes. */
const ELEVATION = {
  level0: 'none',
  level1: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
  level2: '0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.06)',
  level3: '0 10px 24px rgba(15, 23, 42, 0.12), 0 4px 8px rgba(15, 23, 42, 0.08)',
  level4: '0 16px 32px rgba(15, 23, 42, 0.16), 0 6px 12px rgba(15, 23, 42, 0.1)',
  level5: '0 24px 48px rgba(15, 23, 42, 0.2), 0 8px 16px rgba(15, 23, 42, 0.12)',
};

const MOTION = {
  'duration-short2': '100ms',
  'duration-short4': '200ms',
  'duration-medium2': '300ms',
  'easing-standard': 'cubic-bezier(0.2, 0, 0, 1)',
  'easing-standard-decelerate': 'cubic-bezier(0, 0, 0, 1)',
  'easing-standard-accelerate': 'cubic-bezier(0.3, 0, 1, 1)',
};


const SPACING_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20];

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
    out[`${prefix}-letter-spacing`] = m.letterSpacing ?? 'normal';
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
