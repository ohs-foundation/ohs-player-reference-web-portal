import type { ThemeConfig } from '../types/config';
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
 * M3-shaped theme configuration. `applyTheme` still accepts v1 `ThemeConfig`; `upgradeThemeConfig`
 * converts one to this shape.
 * @public
 */
export interface ThemeConfigV2 {
  /** Role pins that win over the generated palette values. */
  overrides?: Partial<Record<SysColorRole, string>>;
  darkOverrides?: Partial<Record<SysColorRole, string>>;
  typography?: {
    brandFamily?: string;
    plainFamily?: string;
    scale?: Partial<Record<TypescaleRole, TypescaleMetrics>>;
  };
  shape?: Partial<Record<ShapeToken, string>>;
  density?: 0 | -1 | -2;
}

const DEFAULT_TYPEFACE = '"IBM Plex Sans", system-ui, -apple-system, sans-serif';

/** Maps a v1 `ThemeConfig`'s colours onto their corresponding sys roles. @public */
export function upgradeThemeConfig(v1: ThemeConfig): ThemeConfigV2 {
  const c = v1.colors ?? {};
  const overrides: Partial<Record<SysColorRole, string>> = {};
  const pin = (role: SysColorRole, value?: string): void => {
    if (value) overrides[role] = value;
  };

  pin('primary', c.primary);
  pin('on-primary', c.primaryContrast);
  pin('primary-container', c.primaryContainer);
  pin('surface', c.surface);
  pin('surface-container', c.background);
  pin('on-surface', c.text);
  pin('on-surface-variant', c.textMuted);
  pin('outline-variant', c.border);
  pin('error', c.error);
  pin('success', c.success);

  return {
    overrides,
    typography: {
      brandFamily: v1.typography?.headingFontFamily ?? v1.typography?.fontFamily,
      plainFamily: v1.typography?.fontFamily,
    },
  };
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
 * cannot express two schemes. Legacy `--ohs-*` names remain with `applyTheme`.
 * @public
 */
export function themeCss(config: ThemeConfigV2 = {}): string {
  const typography = {
    brandFamily: config.typography?.brandFamily ?? DEFAULT_TYPEFACE,
    plainFamily: config.typography?.plainFamily ?? DEFAULT_TYPEFACE,
  };
  const scale = { ...sysTypescale, ...config.typography?.scale } as Record<
    TypescaleRole,
    TypescaleMetrics
  >;
  const shape = { ...sysShape, ...config.shape } as Record<ShapeToken, string>;

  const light = {
    ...staticSysTokens(typography, scale, shape, config.density ?? 0),
    ...sysColorTokens('light', config.overrides),
  };
  const dark = sysColorTokens('dark', config.darkOverrides);

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
