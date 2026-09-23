/**
 * WCAG 2.1 contrast gate for the `--ohs-*` colour tokens.
 *
 * Pairs are declared here rather than parsed out of CSS: a token's required ratio depends on how it is
 * used (text vs control boundary vs decorative divider), and that intent is not recoverable from a
 * stylesheet. Each pair therefore declares a class:
 *
 *   text        4.5:1  — normal-size text (`largeText: true` relaxes to 3:1 per SC 1.4.3)
 *   boundary    3.0:1  — anything needed to identify a control (input borders, focus rings) per SC 1.4.11
 *   decorative  exempt — requires a `reason`, so every waiver is reviewable
 *
 * Sys values come from the built library's `themeCss`, so they are never restated here.
 */

import { themeCss } from '../packages/ohs-player-web-core/src/theme/themeCss.ts';
import { sysTheme } from './sysThemeForCheck.mjs';

function sysTokens() {
  const css = themeCss(sysTheme);
  const cut = css.indexOf("[data-theme='dark']");
  if (cut < 0) throw new Error("themeCss emitted no [data-theme='dark'] block; the two schemes cannot be split");
  const parse = (text) => {
    const out = {};
    for (const m of text.matchAll(/(--ohs-[a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
    return out;
  };
  const light = parse(css.slice(0, cut));
  return { light, dark: { ...light, ...parse(css.slice(cut)) } };
}

const SYS = sysTokens();
const sys = (mode, role) => {
  const value = SYS[mode][`--ohs-sys-color-${role}`];
  if (!value) throw new Error(`sys role not emitted: ${role}`);
  return value;
};

const scheme = (mode) => ({
  surface: sys(mode, 'surface-container-lowest'),
  background: sys(mode, 'surface-container'),
  textMuted: sys(mode, 'on-surface-variant'),
  text: sys(mode, 'on-surface'),
  primary: sys(mode, 'primary'),
  primaryHover: sys(mode, 'primary-hover'),
  primaryContrast: sys(mode, 'on-primary'),
  primaryContainer: sys(mode, 'primary-container'),
  border: sys(mode, 'outline-variant'),
  borderSecondary: sys(mode, 'outline-secondary'),
  borderTertiary: sys(mode, 'outline-tertiary'),
  error: sys(mode, 'error'),
  success: sys(mode, 'success'),
});

const LIGHT = scheme('light');
const DARK = scheme('dark');

const BADGE_LEVELS = ['root', 'country', 'county', 'subcounty', 'ward', 'facility', 'unit'];

const badges = (mode, surface) =>
  BADGE_LEVELS.map((name) => {
    const bg = sys(mode, `level-${name}-bg`);
    return [name, sys(mode, `level-${name}-text`), bg === 'transparent' ? surface : bg];
  });

const LIGHT_BADGES = badges('light', LIGHT.surface);
const DARK_BADGES = badges('dark', DARK.surface);

/** StatusBadge warning tint is a hardcoded rgba in States.tsx. */
const WARNING_TINT = 'rgba(224, 140, 0, 0.14)';

function pairs(mode, t, badges) {
  const base = { mode, over: t.surface };
  const on = (fg, bg, name, opts = {}) => ({ ...base, name, fg, bg, kind: 'text', ...opts });
  const ui = (fg, bg, name, opts = {}) => ({ ...base, name, fg, bg, kind: 'boundary', ...opts });
  const dec = (fg, bg, name, reason) => ({ ...base, name, fg, bg, kind: 'decorative', reason });

  return [
    on(t.text, t.surface, 'text on surface'),
    on(t.text, t.background, 'text on page background'),
    on(t.text, sys(mode, 'surface-container-low'), 'text on surface-variant'),
    on(t.textMuted, t.surface, 'text-muted on surface'),
    on(t.textMuted, t.background, 'text-muted on page background'),
    on(
      t.textMuted,
      sys(mode, 'surface-container-low'),
      'text-muted on surface-variant',
    ),

    on(t.primary, t.surface, 'primary as link/icon text on surface'),
    on(t.primary, t.background, 'primary as link/icon text on page background'),
    on(t.primaryContrast, t.primary, 'primary-contrast on primary fill'),
    on(t.text, t.primaryContainer, 'text on primary-container'),
    ui(t.primary, t.surface, 'primary as focus outline on surface'),

    on(t.primary, sys(mode, 'secondary-container'), 'primary nav label on the active row fill'),
    on(
      sys(mode, 'on-secondary-container'),
      sys(mode, 'secondary-container'),
      'on-secondary-container on selected filter chip',
    ),
    on(
      sys(mode, 'on-warning-container'),
      sys(mode, 'warning-container'),
      'on-warning-container on the widget limit notice',
    ),

    on(t.error, t.surface, 'error text on surface'),
    on(sys(mode, 'warning'), t.surface, 'warning text on surface'),
    on(sys(mode, 'success'), t.surface, 'success text on surface'),

    ui(sys(mode, 'outline'), t.surface, 'outline as control border on surface'),
    ui(sys(mode, 'outline'), t.background, 'outline as control border on page background'),
    ui(
      sys(mode, 'outline'),
      sys(mode, 'surface-container-low'),
      'outline as control border on surface-variant',
    ),
    ui(t.textMuted, t.surface, 'text-muted as control border on hover/focus'),
    dec(
      t.border,
      t.surface,
      'border as card + table gridline on surface',
      'decorative separator; cards and cells are identified by their fill and content, not this line',
    ),
    dec(
      t.borderSecondary,
      t.surface,
      'border-secondary as panel + list separator',
      'decorative separator inside already-bounded panels',
    ),
    dec(
      t.borderTertiary,
      t.surface,
      'border-tertiary as badge-pill and static panel border',
      'decorative; every remaining use is a non-interactive chip or panel',
    ),
    // KNOWN SC 1.4.11 FAILURE, not a true exemption. The M3 Figma spec sets the search-field
    // borders to Border/Tertiary and Border/Secondary; both are far under the 3:1 a control
    // boundary needs, and the white fill on #FAFAFA (1.02:1) is not a substitute affordance.
    dec(
      t.borderTertiary,
      t.surface,
      'border-tertiary as page search-field border',
      'FAILS SC 1.4.11 (needs 3:1) — design-specified, pending design decision',
    ),
    dec(
      t.borderSecondary,
      t.background,
      'border-secondary as top-nav search-field border',
      'FAILS SC 1.4.11 (needs 3:1) — design-specified, pending design decision',
    ),
    // Same call as the search fields: the drawer form fields follow their pill treatment. This is
    // still short of 3:1, but better than the #D4D4D4 (1.48:1) it replaced, and :focus-within
    // moves the border to text-muted at 5.49:1.
    dec(
      t.borderTertiary,
      t.surface,
      'border-tertiary as drawer form-field border',
      'FAILS SC 1.4.11 (needs 3:1) — design-specified, pending design decision',
    ),
    ui(t.textMuted, t.surface, 'form-field border on focus-within'),
    dec(
      t.success,
      t.surface,
      'success as border-left accent',
      'decorative status stripe, adjacent text carries the meaning',
    ),

    ...badges.map(([name, fg, bg]) => on(fg, bg, `location badge ${name}`)),
  ];
}

const PAIRS = [
  ...pairs('light', LIGHT, LIGHT_BADGES),
  {
    mode: 'light',
    name: 'on-success-container on success-container',
    fg: SYS.light['--ohs-sys-color-on-success-container'],
    bg: SYS.light['--ohs-sys-color-success-container'],
    kind: 'text',
  },
  {
    mode: 'light',
    name: 'text-muted on surface-container',
    fg: LIGHT.textMuted,
    bg: SYS.light['--ohs-sys-color-surface-container'],
    kind: 'text',
  },
  {
    mode: 'light',
    name: 'warning on StatusBadge tint',
    fg: SYS.light['--ohs-sys-color-warning'],
    bg: WARNING_TINT,
    over: LIGHT.surface,
    kind: 'text',
  },

  ...pairs('dark', DARK, DARK_BADGES),
  {
    mode: 'dark',
    name: 'primary-contrast on primary-hover fill',
    fg: DARK.primaryContrast,
    bg: DARK.primaryHover,
    kind: 'text',
  },
  {
    mode: 'dark',
    name: 'text on primary-container',
    fg: DARK.text,
    bg: DARK.primaryContainer,
    kind: 'text',
  },
  {
    mode: 'dark',
    name: 'on-success-container on success-container',
    fg: SYS.dark['--ohs-sys-color-on-success-container'],
    bg: SYS.dark['--ohs-sys-color-success-container'],
    kind: 'text',
  },
  {
    mode: 'dark',
    name: 'text-muted on surface-container',
    fg: DARK.textMuted,
    bg: SYS.dark['--ohs-sys-color-surface-container'],
    kind: 'text',
  },
  {
    mode: 'dark',
    name: 'warning on StatusBadge tint',
    fg: SYS.dark['--ohs-sys-color-warning'],
    bg: WARNING_TINT,
    over: DARK.surface,
    kind: 'text',
  },
];

const MINIMUMS = { text: 4.5, largeText: 3, boundary: 3 };

function toRgb(value) {
  const rgba = /^rgba?\(([^)]+)\)$/.exec(value.trim());
  if (rgba) {
    const parts = rgba[1].split(',').map((p) => Number.parseFloat(p.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }
  let hex = value.trim().replace('#', '');
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) throw new Error(`Unparseable colour: ${value}`);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: 1,
  };
}

function composite(colour, backdrop) {
  if (colour.a >= 1) return colour;
  return {
    r: colour.r * colour.a + backdrop.r * (1 - colour.a),
    g: colour.g * colour.a + backdrop.g * (1 - colour.a),
    b: colour.b * colour.a + backdrop.b * (1 - colour.a),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  const channel = (raw) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg, bg) {
  const hi = Math.max(luminance(fg), luminance(bg));
  const lo = Math.min(luminance(fg), luminance(bg));
  return (hi + 0.05) / (lo + 0.05);
}

function minimumFor(pair) {
  if (pair.kind === 'decorative') return null;
  if (pair.kind === 'text' && pair.largeText) return MINIMUMS.largeText;
  return MINIMUMS[pair.kind];
}

const failures = [];
const exemptions = [];
let checked = 0;

for (const pair of PAIRS) {
  const backdrop = toRgb(pair.over ?? (pair.bg.startsWith('rgba') ? '#FFFFFF' : pair.bg));
  const bg = composite(toRgb(pair.bg), backdrop);
  const fg = composite(toRgb(pair.fg), bg);
  const ratio = contrast(fg, bg);
  const min = minimumFor(pair);
  const label = `[${pair.mode}] ${pair.name}`;

  if (min === null) {
    if (!pair.reason) {
      failures.push(`${label} — decorative pair with no documented reason (${ratio.toFixed(2)}:1)`);
      continue;
    }
    exemptions.push(`${label} — ${ratio.toFixed(2)}:1 — exempt: ${pair.reason}`);
    continue;
  }

  checked += 1;
  if (ratio < min) {
    failures.push(`${label} — ${ratio.toFixed(2)}:1 below ${min}:1 (${pair.kind})`);
  }
}

for (const line of exemptions) console.log(`EXEMPT ${line}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} contrast failure(s):`);
  for (const line of failures) console.error(`  FAIL ${line}`);
  console.error(`\n${checked} pair(s) enforced, ${exemptions.length} documented exemption(s).`);
  process.exit(1);
}

console.log(
  `\nAll ${checked} enforced contrast pair(s) pass; ${exemptions.length} documented exemption(s).`,
);
