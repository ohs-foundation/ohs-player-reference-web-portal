import type { ThemeConfig } from '../types/config';

/**
 * Default theme — a Material 3-flavoured healthcare palette aligned with the
 * Open Health Stack design guidelines (https://developers.google.com/open-health-stack/design).
 * Hosts may override any subset; missing fields fall back to these defaults.
 */
export const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#1B6EF3',
    primaryHover: '#1456BF',
    primaryContrast: '#FFFFFF',
    primaryContainer: '#D6E3FF',
    secondary: '#0F766E',
    surface: '#FFFFFF',
    background: '#F4F7FB',
    text: '#1F2933',
    textMuted: '#52606D',
    border: '#CDD7E1',
    focusRing: 'rgba(27, 110, 243, 0.28)',
    error: '#B3261E',
    warning: '#E08C00',
    success: '#137333',
    info: '#1B6EF3',
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif',
    headingFontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif',
    baseFontSize: 16,
  },
  spacing: { unit: 8 },
  borderRadius: { default: 12 },
  shadow: {
    sm: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
    md: '0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.06)',
    lg: '0 10px 24px rgba(15, 23, 42, 0.12), 0 4px 8px rgba(15, 23, 42, 0.08)',
  },
};

export function mergeTheme(base: ThemeConfig, override?: ThemeConfig): ThemeConfig {
  if (!override) return base;
  return {
    colors: { ...base.colors, ...override.colors },
    typography: { ...base.typography, ...override.typography },
    spacing: { ...base.spacing, ...override.spacing },
    borderRadius: { ...base.borderRadius, ...override.borderRadius },
    shadow: { ...base.shadow, ...override.shadow },
  };
}

const ROOT_VAR_PREFIX = '--ohs';

function setVar(el: HTMLElement, name: string, value: string | number | undefined): void {
  if (value === undefined || value === null || value === '') return;
  el.style.setProperty(`${ROOT_VAR_PREFIX}-${name}`, String(value));
}

/**
 * Writes design tokens to the given element as CSS custom properties.
 * Token names follow the public `--ohs-*` contract documented in `docs/ARCHITECTURE.md`.
 */
export function applyTheme(theme: ThemeConfig, element: HTMLElement | null): void {
  if (!element) return;
  const c = theme.colors;
  const t = theme.typography;
  const s = theme.spacing;
  const r = theme.borderRadius;
  const sh = theme.shadow;

  setVar(element, 'color-primary', c?.primary);
  setVar(element, 'color-primary-hover', c?.primaryHover);
  setVar(element, 'color-primary-contrast', c?.primaryContrast);
  setVar(element, 'color-primary-container', c?.primaryContainer);
  setVar(element, 'color-secondary', c?.secondary);
  setVar(element, 'color-surface', c?.surface);
  setVar(element, 'color-background', c?.background);
  setVar(element, 'color-text', c?.text);
  setVar(element, 'color-text-muted', c?.textMuted);
  setVar(element, 'color-border', c?.border);
  setVar(element, 'color-focus-ring', c?.focusRing);
  setVar(element, 'color-error', c?.error);
  setVar(element, 'color-warning', c?.warning);
  setVar(element, 'color-success', c?.success);
  setVar(element, 'color-info', c?.info);

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

  if (s?.unit) {
    setVar(element, 'spacing-unit', `${s.unit}px`);
    setVar(element, 'spacing-1', `${s.unit * 0.5}px`);
    setVar(element, 'spacing-2', `${s.unit}px`);
    setVar(element, 'spacing-3', `${s.unit * 1.5}px`);
    setVar(element, 'spacing-4', `${s.unit * 2}px`);
    setVar(element, 'spacing-5', `${s.unit * 3}px`);
    setVar(element, 'spacing-6', `${s.unit * 4}px`);
    setVar(element, 'spacing-7', `${s.unit * 6}px`);
    setVar(element, 'spacing-8', `${s.unit * 8}px`);
  }

  if (r?.default) {
    const d = r.default;
    setVar(element, 'radius-default', `${d}px`);
    setVar(element, 'radius-sm', `${Math.max(2, Math.round(d * 0.5))}px`);
    setVar(element, 'radius-lg', `${Math.round(d * 1.5)}px`);
    setVar(element, 'radius-pill', '999px');
  }

  setVar(element, 'shadow-sm', sh?.sm);
  setVar(element, 'shadow-md', sh?.md);
  setVar(element, 'shadow-lg', sh?.lg);
}
