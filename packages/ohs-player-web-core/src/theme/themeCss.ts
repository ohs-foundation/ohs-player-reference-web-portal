import {
  staticSysTokens,
  sysColorTokens,
  sysShape,
  sysTypescale,
  type ShapeToken,
  type SysColorRole,
  type TypescaleMetrics,
  type TypescaleRole,
} from './sysTokens';

/**
 * M3-shaped theme configuration.
 * @public
 */
export interface ThemeConfigV2 {
  /** Role pins that win over the generated palette values. */
  overrides?: Partial<Record<SysColorRole, string>>;
  darkOverrides?: Partial<Record<SysColorRole, string>>;
  extraColors?: Record<string, { light: string; dark: string }>;
  typography?: {
    brandFamily?: string;
    plainFamily?: string;
    monoFamily?: string;
    scale?: Partial<Record<TypescaleRole, TypescaleMetrics>>;
  };
  shape?: Partial<Record<ShapeToken, string>>;
  density?: 0 | -1 | -2;
}

const DEFAULT_TYPEFACE = '"Google Sans", system-ui, -apple-system, sans-serif';
const DEFAULT_MONO_TYPEFACE = '"Google Sans Code", ui-monospace, "SF Mono", "Menlo", monospace';
const SCOPED_DENSITIES = [-1, -2] as const;

function extraColorTokens(
  colors: ThemeConfigV2['extraColors'] = {},
  mode: 'light' | 'dark',
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, values] of Object.entries(colors)) out[`--ohs-sys-color-${name}`] = values[mode];
  return out;
}

function declarations(tokens: Record<string, string>, indent = '  '): string {
  return Object.entries(tokens)
    .map(([name, value]) => `${indent}${name}: ${value};`)
    .join('\n');
}

/**
 * Serialises a theme to a stylesheet: `:root` carries light plus every mode-independent token,
 * `[data-theme='dark']` carries the dark colour overrides.
 *
 * CSS rather than inline style properties, because inline styles beat attribute selectors and so
 * cannot express two schemes.
 * @public
 */
export function themeCss(config: ThemeConfigV2 = {}): string {
  const typography = {
    brandFamily: config.typography?.brandFamily ?? DEFAULT_TYPEFACE,
    plainFamily: config.typography?.plainFamily ?? DEFAULT_TYPEFACE,
    monoFamily: config.typography?.monoFamily ?? DEFAULT_MONO_TYPEFACE,
  };
  const scale = { ...sysTypescale, ...config.typography?.scale } as Record<
    TypescaleRole,
    TypescaleMetrics
  >;
  const shape = { ...sysShape, ...config.shape } as Record<ShapeToken, string>;

  const light = {
    ...staticSysTokens(typography, scale, shape, config.density ?? 0),
    ...sysColorTokens('light', config.overrides),
    ...extraColorTokens(config.extraColors, 'light'),
  };
  const dark = {
    ...sysColorTokens('dark', config.darkOverrides),
    ...extraColorTokens(config.extraColors, 'dark'),
  };

  return [
    ':root,',
    '[data-ohs-root] {',
    declarations(light),
    '}',
    '',
    "[data-theme='dark'],",
    "[data-theme='dark'] [data-ohs-root] {",
    declarations(dark),
    '}',
    '',
    ...SCOPED_DENSITIES.flatMap((step) => [
      `[data-density='${step}'] {`,
      `  --ohs-sys-density-scale: ${step};`,
      '}',
      '',
    ]),
  ].join('\n');
}

const STYLE_ELEMENT_ID = 'ohs-theme-tokens';

/**
 * Installs or replaces the sys-token stylesheet in `document.head`. Idempotent. Dark mode then flips
 * via `data-theme` in CSS, with no re-application needed.
 * @public
 */
export function installThemeCss(config: ThemeConfigV2 = {}, doc?: Document): void {
  const target = doc ?? (typeof document === 'undefined' ? undefined : document);
  if (!target) return;

  let style = target.getElementById(STYLE_ELEMENT_ID);
  if (!style) {
    style = target.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    target.head.appendChild(style);
  }
  style.textContent = themeCss(config);
}
