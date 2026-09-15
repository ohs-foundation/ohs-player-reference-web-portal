import { describe, expect, it } from 'vitest';
import { applyTheme, defaultTheme, mergeTheme } from './theme';
import { installThemeCss, themeCss, upgradeThemeConfig } from './themeCss';
import { refPalettes } from './palettes';
import { sysColorSchemes, type SysColorRole } from './sysTokens';

const brandLight = {
  colors: {
    primary: '#094F9A',
    primaryContrast: '#FAFAFA',
    primaryContainer: '#DCE5FE',
    surface: '#FFFFFF',
    background: '#F1F2F4',
    text: '#0D0D0D',
    textMuted: '#696969',
    border: '#EDEDED',
  },
  typography: { fontFamily: 'Plain', headingFontFamily: 'Brand' },
};

function varsOf(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const m = /^\s*(--[a-z0-9-]+):\s*(.+);$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

describe('themeCss', () => {
  it('emits every sys colour role in both light and dark', () => {
    const css = themeCss();
    const light = varsOf(css, ':root,');
    const dark = varsOf(css, "[data-theme='dark'],");
    const roles = Object.keys(sysColorSchemes.light) as SysColorRole[];

    expect(Object.keys(sysColorSchemes.dark).sort()).toEqual([...roles].sort());
    expect(roles.length).toBeGreaterThan(30);
    for (const role of roles) {
      expect(light[`--ohs-sys-color-${role}`], `light ${role}`).toBeTruthy();
      expect(dark[`--ohs-sys-color-${role}`], `dark ${role}`).toBeTruthy();
    }
  });

  it('carries the colours M3 has no role for at their established values', () => {
    const css = themeCss();
    const light = varsOf(css, ':root,');
    const dark = varsOf(css, "[data-theme='dark'],");

    expect(light['--ohs-sys-color-primary-hover']).toBe('#073c75');
    expect(dark['--ohs-sys-color-primary-hover']).toBe('#a9c7ff');
    expect(light['--ohs-sys-color-on-surface-secondary']).toBe('#363636');
    expect(dark['--ohs-sys-color-on-surface-secondary']).toBe('#d4d4d4');
    expect(light['--ohs-sys-color-outline-secondary']).toBe('#d4d4d4');
    expect(dark['--ohs-sys-color-outline-secondary']).toBe('#4f4f4f');
    expect(light['--ohs-sys-color-outline-tertiary']).toBe('#b8b8b8');
    expect(dark['--ohs-sys-color-outline-tertiary']).toBe('#696969');
    expect(light['--ohs-sys-color-focus-ring']).toBe('rgba(9, 79, 154, 0.28)');
    expect(dark['--ohs-sys-color-focus-ring']).toBe('rgba(31, 135, 252, 0.4)');
    expect(light['--ohs-sys-color-focus-ring-error']).toBe('rgba(229, 0, 0, 0.28)');
    expect(dark['--ohs-sys-color-focus-ring-error']).toBe('rgba(229, 0, 0, 0.28)');
  });

  it('resolves unpinned roles from the generated palettes', () => {
    const light = varsOf(themeCss(), ':root,');
    expect(light['--ohs-sys-color-outline']).toBe(refPalettes.neutralVariant[50]);
    expect(light['--ohs-sys-color-surface-container-highest']).toBe(refPalettes.neutral[90]);
  });

  it('lets overrides win over generated values, per mode', () => {
    const css = themeCss({
      overrides: { primary: '#094F9A' },
      darkOverrides: { primary: '#7BACFD' },
    });
    expect(varsOf(css, ':root,')['--ohs-sys-color-primary']).toBe('#094F9A');
    expect(varsOf(css, "[data-theme='dark'],")['--ohs-sys-color-primary']).toBe('#7BACFD');
    expect(refPalettes.primary[40]).not.toBe('#094F9A');
  });

  it('scopes the density scale to a data-density subtree', () => {
    const css = themeCss();
    expect(varsOf(css, "[data-density='-1']")['--ohs-sys-density-scale']).toBe('-1');
    expect(varsOf(css, "[data-density='-2']")['--ohs-sys-density-scale']).toBe('-2');
    expect(varsOf(css, ':root,')['--ohs-sys-density-scale']).toBe('0');
  });

  it('emits extra colours as sys colour tokens in each scheme', () => {
    const css = themeCss({
      extraColors: { 'level-root-bg': { light: '#094f9a', dark: '#0a2540' } },
    });
    expect(varsOf(css, ':root,')['--ohs-sys-color-level-root-bg']).toBe('#094f9a');
    expect(varsOf(css, "[data-theme='dark'],")['--ohs-sys-color-level-root-bg']).toBe('#0a2540');
  });

  it('emits typescale, shape, state, elevation and motion tokens', () => {
    const light = varsOf(themeCss(), ':root,');
    expect(light['--ohs-sys-typescale-display-small-size']).toBe('40px');
    expect(light['--ohs-sys-typescale-display-small-font']).toBe('var(--ohs-ref-typeface-brand)');
    expect(light['--ohs-sys-typescale-body-medium-font']).toBe('var(--ohs-ref-typeface-plain)');
    expect(light['--ohs-sys-shape-corner-full']).toBe('9999px');
    expect(light['--ohs-sys-state-hover-opacity']).toBe('0.08');
    expect(light['--ohs-sys-elevation-level0']).toBe('none');
    expect(light['--ohs-sys-motion-easing-standard']).toBe('cubic-bezier(0.2, 0, 0, 1)');
  });

  it('never emits a legacy --ohs-* name that applyTheme owns', () => {
    const css = themeCss();
    const emitted = { ...varsOf(css, ':root,'), ...varsOf(css, "[data-theme='dark'],") };
    const legacy = Object.keys(emitted).filter(
      (name) => !name.startsWith('--ohs-sys-') && !name.startsWith('--ohs-ref-'),
    );
    expect(legacy).toEqual([]);
  });

  it('honours a typography and density config', () => {
    const light = varsOf(
      themeCss({
        typography: { brandFamily: 'B', plainFamily: 'P', monoFamily: 'M' },
        density: -2,
      }),
      ':root,',
    );
    expect(light['--ohs-ref-typeface-brand']).toBe('B');
    expect(light['--ohs-ref-typeface-plain']).toBe('P');
    expect(light['--ohs-ref-typeface-mono']).toBe('M');
    expect(light['--ohs-sys-density-scale']).toBe('-2');
  });

  it('emits the typeface weights, a default mono face and the 36px and 18px steps', () => {
    const light = varsOf(themeCss(), ':root,');
    expect(light['--ohs-ref-typeface-weight-regular']).toBe('400');
    expect(light['--ohs-ref-typeface-weight-medium']).toBe('500');
    expect(light['--ohs-ref-typeface-mono']).toContain('"Google Sans Code"');
    expect(light['--ohs-sys-typescale-heading-xl-size']).toBe('36px');
    expect(light['--ohs-sys-typescale-heading-xl-font']).toBe('var(--ohs-ref-typeface-brand)');
    expect(light['--ohs-sys-typescale-text-l-size']).toBe('18px');
    expect(light['--ohs-sys-typescale-text-l-font']).toBe('var(--ohs-ref-typeface-plain)');
  });
});

describe('upgradeThemeConfig', () => {
  it('maps v1 colours onto their sys roles', () => {
    const v2 = upgradeThemeConfig(brandLight);
    expect(v2.overrides).toMatchObject({
      primary: '#094F9A',
      'on-primary': '#FAFAFA',
      'primary-container': '#DCE5FE',
      surface: '#FFFFFF',
      'surface-container': '#F1F2F4',
      'on-surface': '#0D0D0D',
      'on-surface-variant': '#696969',
      'outline-variant': '#EDEDED',
    });
    expect(v2.typography).toEqual({ brandFamily: 'Brand', plainFamily: 'Plain' });
  });

  it('omits roles the v1 config never set', () => {
    const v2 = upgradeThemeConfig({ colors: { primary: '#000000' } });
    expect(v2.overrides).toEqual({ primary: '#000000' });
  });

  it('feeds themeCss so an upgraded v1 config pins its brand values', () => {
    const light = varsOf(themeCss(upgradeThemeConfig(brandLight)), ':root,');
    expect(light['--ohs-sys-color-primary']).toBe('#094F9A');
    expect(light['--ohs-sys-color-surface-container']).toBe('#F1F2F4');
  });
});

describe('installThemeCss', () => {
  it('creates one style element and updates it in place', () => {
    installThemeCss();
    installThemeCss({ overrides: { primary: '#123456' } });

    const styles = document.querySelectorAll('#ohs-theme-tokens');
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain('--ohs-sys-color-primary: #123456;');
  });
});

describe('applyTheme legacy contract', () => {
  it('still writes the legacy names as inline styles', () => {
    const el = document.createElement('div');
    applyTheme(mergeTheme(defaultTheme, brandLight), el);

    expect(el.style.getPropertyValue('--ohs-color-primary')).toBe('#094F9A');
    expect(el.style.getPropertyValue('--ohs-color-text-muted')).toBe('#696969');
    expect(el.style.getPropertyValue('--ohs-radius-default')).toBe('12px');
  });

  it('no longer emits the retired spacing, shadow and colour tokens', () => {
    const el = document.createElement('div');
    applyTheme(mergeTheme(defaultTheme, brandLight), el);
    const names = Array.from({ length: el.style.length }, (_, i) => el.style.item(i));

    expect(names.filter((n) => n.startsWith('--ohs-spacing-'))).toEqual([]);
    expect(names.filter((n) => n.startsWith('--ohs-shadow-'))).toEqual([]);
    for (const retired of ['--ohs-color-secondary', '--ohs-color-warning', '--ohs-color-info']) {
      expect(names).not.toContain(retired);
    }
  });

  it('emits no --ohs-sys-* name, so the two layers cannot collide', () => {
    const el = document.createElement('div');
    applyTheme(mergeTheme(defaultTheme, brandLight), el);

    const names = Array.from({ length: el.style.length }, (_, i) => el.style.item(i));
    expect(names.filter((n) => n.startsWith('--ohs-sys-'))).toEqual([]);
  });
});
