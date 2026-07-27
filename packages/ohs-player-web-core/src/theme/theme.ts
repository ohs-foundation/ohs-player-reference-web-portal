import type { ThemeConfig } from '../types/config';

/**
 * Default values for the legacy `--ohs-*` tokens. The M3 role layer lives in `themeCss`; this covers
 * only the names still read directly by hand-written CSS.
 */
export const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#1B6EF3',
    primaryHover: '#1456BF',
    primaryContrast: '#FFFFFF',
    primaryContainer: '#D6E3FF',
    surface: '#FFFFFF',
    background: '#F4F7FB',
    text: '#1F2933',
    textMuted: '#52606D',
    border: '#CDD7E1',
    focusRing: 'rgba(27, 110, 243, 0.28)',
    error: '#B3261E',
    success: '#137333',
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif',
    headingFontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif',
    baseFontSize: 16,
  },
  borderRadius: { default: 12 },
};

export function mergeTheme(base: ThemeConfig, override?: ThemeConfig): ThemeConfig {
  if (!override) return base;
  return {
    colors: { ...base.colors, ...override.colors },
    typography: { ...base.typography, ...override.typography },
    borderRadius: { ...base.borderRadius, ...override.borderRadius },
  };
}

const ROOT_VAR_PREFIX = '--ohs';

function setVar(el: HTMLElement, name: string, value: string | number | undefined): void {
  if (value === undefined || value === null || value === '') return;
  el.style.setProperty(`${ROOT_VAR_PREFIX}-${name}`, String(value));
}

/**
 * Writes the legacy `--ohs-*` tokens to the given element as inline style properties.
 *
 * Disjoint from `themeCss`, which owns `--ohs-sys-*` and `--ohs-ref-*` as a stylesheet: inline styles
 * beat attribute selectors, so no token may be emitted by both.
 */
export function applyTheme(theme: ThemeConfig, element: HTMLElement | null): void {
  if (!element) return;
  const c = theme.colors;
  const t = theme.typography;
  const r = theme.borderRadius;

  setVar(element, 'color-primary', c?.primary);
  setVar(element, 'color-primary-hover', c?.primaryHover);
  setVar(element, 'color-primary-contrast', c?.primaryContrast);
  setVar(element, 'color-primary-container', c?.primaryContainer);
  setVar(element, 'color-surface', c?.surface);
  setVar(element, 'color-background', c?.background);
  setVar(element, 'color-text', c?.text);
  setVar(element, 'color-text-muted', c?.textMuted);
  setVar(element, 'color-border', c?.border);
  setVar(element, 'color-focus-ring', c?.focusRing);
  setVar(element, 'color-error', c?.error);
  setVar(element, 'color-success', c?.success);

  setVar(element, 'font-body', t?.fontFamily);
  setVar(element, 'font-heading', t?.headingFontFamily ?? t?.fontFamily);
  if (t?.baseFontSize) {
    const base = t.baseFontSize;
    setVar(element, 'font-size-base', `${base}px`);
    setVar(element, 'text-display', `${Math.round(base * 2.25)}px`);
    setVar(element, 'text-headline', `${Math.round(base * 1.5)}px`);
    setVar(element, 'text-title', `${Math.round(base * 1.125)}px`);
    setVar(element, 'text-body', `${base}px`);
    setVar(element, 'text-label', `${Math.round(base * 0.875)}px`);
  }

  if (r?.default) {
    const d = r.default;
    setVar(element, 'radius-default', `${d}px`);
    setVar(element, 'radius-sm', `${Math.max(2, Math.round(d * 0.5))}px`);
    setVar(element, 'radius-lg', `${Math.round(d * 1.5)}px`);
    setVar(element, 'radius-pill', '999px');
  }
}
