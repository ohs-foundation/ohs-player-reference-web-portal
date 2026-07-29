import { applyTheme, defaultTheme, installThemeCss, mergeTheme } from 'ohs-player-web-core';
import { describe, expect, it } from 'vitest';
import { darkTheme } from './darkTheme';
import { lightTheme } from './lightTheme';
import { sysTheme } from './sysTheme';

/**
 * Snapshot of every legacy `--ohs-*` value applyTheme produced before the sys layer was introduced.
 * Recorded from commit 9742a0d. Additive since, except `background`, which the M3 Figma alignment
 * re-mapped from Background/Primary #F1F2F4 to Background/Secondary #FAFAFA.
 */
const LEGACY_LIGHT: Record<string, string> = {
  '--ohs-color-primary': '#094F9A',
  '--ohs-color-primary-hover': '#073C75',
  '--ohs-color-primary-contrast': '#FAFAFA',
  '--ohs-color-primary-container': '#DCE5FE',
  '--ohs-color-surface': '#FFFFFF',
  '--ohs-color-background': '#FAFAFA',
  '--ohs-color-text': '#0D0D0D',
  '--ohs-color-text-muted': '#696969',
  '--ohs-color-border': '#EDEDED',
  '--ohs-color-focus-ring': 'rgba(9, 79, 154, 0.28)',
  '--ohs-color-error': '#B3261E',
  '--ohs-color-success': '#006E29',
  '--ohs-font-size-base': '16px',
  '--ohs-text-display': '36px',
  '--ohs-text-headline': '24px',
  '--ohs-text-title': '18px',
  '--ohs-text-body': '16px',
  '--ohs-text-label': '14px',
  '--ohs-radius-default': '8px',
  '--ohs-radius-sm': '4px',
  '--ohs-radius-lg': '12px',
  '--ohs-radius-pill': '999px',
};

const LEGACY_DARK: Record<string, string> = {
  '--ohs-color-primary': '#7BACFD',
  '--ohs-color-primary-hover': '#A9C7FF',
  '--ohs-color-primary-contrast': '#003063',
  '--ohs-color-primary-container': '#04366D',
  '--ohs-color-surface': '#1A1A1A',
  '--ohs-color-background': '#0D0D0D',
  '--ohs-color-text': '#FAFAFA',
  '--ohs-color-text-muted': '#9E9E9E',
  '--ohs-color-border': '#363636',
  '--ohs-color-error': '#FF8F8F',
  '--ohs-color-success': '#00E04B',
};

function inlineVars(config: Parameters<typeof applyTheme>[0]): Record<string, string> {
  const el = document.createElement('div');
  applyTheme(config, el);
  const out: Record<string, string> = {};
  for (let i = 0; i < el.style.length; i += 1) {
    const name = el.style.item(i);
    out[name] = el.style.getPropertyValue(name).trim();
  }
  return out;
}

const RETIRED = [
  '--ohs-color-secondary',
  '--ohs-color-warning',
  '--ohs-color-info',
  '--ohs-shadow-sm',
  '--ohs-shadow-md',
  '--ohs-shadow-lg',
  '--ohs-spacing-1',
  '--ohs-spacing-5',
  '--ohs-spacing-unit',
];

describe('legacy alias parity', () => {
  it('does not re-emit a retired token', () => {
    const emitted = Object.keys(inlineVars(mergeTheme(defaultTheme, lightTheme)));
    expect(RETIRED.filter((name) => emitted.includes(name))).toEqual([]);
  });

  it('light theme still resolves every legacy token to its pre-sprint value', () => {
    const actual = inlineVars(mergeTheme(defaultTheme, lightTheme));
    for (const [name, expected] of Object.entries(LEGACY_LIGHT)) {
      expect(actual[name], name).toBe(expected);
    }
  });

  it('dark theme still resolves every legacy token to its pre-sprint value', () => {
    const actual = inlineVars(mergeTheme(defaultTheme, darkTheme));
    for (const [name, expected] of Object.entries(LEGACY_DARK)) {
      expect(actual[name], name).toBe(expected);
    }
  });

  it('installing the sys stylesheet adds no legacy name', () => {
    installThemeCss(sysTheme);
    const css = document.getElementById('ohs-theme-tokens')?.textContent ?? '';
    const emitted = [...css.matchAll(/(--ohs-[a-z0-9-]+)\s*:/g)].map((m) => m[1]);

    expect(emitted.length).toBeGreaterThan(100);
    expect(
      emitted.filter((n) => !n.startsWith('--ohs-sys-') && !n.startsWith('--ohs-ref-')),
    ).toEqual([]);
  });

  it('emits no token name that applyTheme also owns', () => {
    installThemeCss(sysTheme);
    const css = document.getElementById('ohs-theme-tokens')?.textContent ?? '';
    const fromCss = new Set([...css.matchAll(/(--ohs-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const fromApplyTheme = Object.keys(inlineVars(mergeTheme(defaultTheme, lightTheme)));

    expect(fromApplyTheme.filter((name) => fromCss.has(name))).toEqual([]);
  });
});
