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
 * Sys values come from the built library's `themeCss`, so they are never restated here. The remaining
 * legacy values are restated below and `SOURCES` re-reads their files to fail on drift.
 */

import { readFileSync } from 'node:fs';
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

const LIGHT = {
  surface: '#FFFFFF',
  background: '#F1F2F4',
  textMuted: '#696969',
  text: '#0D0D0D',
  primary: '#094F9A',
  primaryContrast: '#FAFAFA',
  primaryContainer: '#DCE5FE',
  border: '#EDEDED',
  borderSecondary: '#D4D4D4',
  borderTertiary: '#B8B8B8',
  error: '#B3261E',
  success: '#006E29',
};

const DARK = {
  surface: '#1A1A1A',
  background: '#0D0D0D',
  textMuted: '#9E9E9E',
  text: '#FAFAFA',
  primary: '#7BACFD',
  primaryHover: '#A9C7FF',
  primaryContrast: '#003063',
  primaryContainer: '#04366D',
  border: '#363636',
  borderSecondary: '#4F4F4F',
  borderTertiary: '#696969',
  error: '#FF8F8F',
  success: '#00E04B',
};

/** Location administrative-level badges: [name, text, background] per mode. */
const LIGHT_BADGES = [
  ['root', '#FAFAFA', '#094F9A'],
  ['country', '#001066', '#CCD4FF'],
  ['county', '#094F9A', '#DCE5FE'],
  ['subcounty', '#755D00', '#FFEB99'],
  ['ward', '#696969', '#EDEDED'],
  ['facility', '#006E29', '#B8FFCF'],
  ['unit', '#696969', LIGHT.surface],
];

const DARK_BADGES = [
  ['root', '#FAFAFA', '#094F9A'],
  ['country', '#B8C2FF', 'rgba(153, 169, 255, 0.16)'],
  ['county', '#A9C5FF', 'rgba(149, 181, 253, 0.16)'],
  ['subcounty', '#FFDB4D', 'rgba(255, 219, 77, 0.16)'],
  ['ward', '#B8B8B8', 'rgba(255, 255, 255, 0.08)'],
  ['facility', '#29FF70', 'rgba(41, 255, 112, 0.16)'],
  ['unit', '#B8B8B8', 'rgba(255, 255, 255, 0.08)'],
];

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

/**
 * The tables above restate values that live in source. Without this guard the gate would silently
 * drift the first time someone edits a token, so every declared value must still be findable at its
 * origin: `<file, regex-name, expected>`. A rename fails the gate loudly rather than passing blind.
 */
const SOURCES = [
  [
    'apps/ohs-player-web/src/theme/lightTheme.ts',
    'ts',
    {
      primary: LIGHT.primary,
    textMuted: LIGHT.textMuted,
      primaryContrast: LIGHT.primaryContrast,
      primaryContainer: LIGHT.primaryContainer,
      surface: LIGHT.surface,
      background: LIGHT.background,
      text: LIGHT.text,

      border: LIGHT.border,
      success: LIGHT.success,
     
    },
  ],
  [
    'apps/ohs-player-web/src/theme/darkTheme.ts',
    'ts',
    {
      primary: DARK.primary,
    textMuted: DARK.textMuted,
      primaryHover: DARK.primaryHover,
      primaryContrast: DARK.primaryContrast,
      primaryContainer: DARK.primaryContainer,
      surface: DARK.surface,
      background: DARK.background,
      text: DARK.text,

      border: DARK.border,
      error: DARK.error,
     
      success: DARK.success,
    },
  ],
  [
    'apps/ohs-player-web/src/components/ui/theme.css#light',
    'css',
    {
      'color-border-secondary': LIGHT.borderSecondary,
      'color-border-tertiary': LIGHT.borderTertiary,

      'color-level-subcounty-text': LIGHT_BADGES[3][1],
      'color-level-facility-text': LIGHT_BADGES[5][1],
    },
  ],
  [
    'apps/ohs-player-web/src/components/ui/theme.css#dark',
    'css',
    {
      'color-border-secondary': DARK.borderSecondary,
      'color-border-tertiary': DARK.borderTertiary,
    },
  ],
];

const DARK_BLOCK_MARKER = "[data-theme='dark'],";

const drift = [];
for (const [target, kind, expectations] of SOURCES) {
  const [path, section] = target.split('#');
  let body;
  try {
    body = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  } catch {
    drift.push(`${path} — cannot be read; token values cannot be verified`);
    continue;
  }
  if (section) {
    const cut = body.indexOf(DARK_BLOCK_MARKER);
    if (cut < 0) {
      drift.push(`${path} — no ${DARK_BLOCK_MARKER} block; cannot split light from dark`);
      continue;
    }
    body = section === 'light' ? body.slice(0, cut) : body.slice(cut);
  }

  for (const [name, expected] of Object.entries(expectations)) {
    const pattern =
      kind === 'ts'
        ? new RegExp(`\\b${name}\\s*:\\s*'([^']+)'`)
        : new RegExp(`--ohs-${name}\\s*:\\s*([^;]+);`);
    const found = pattern.exec(body)?.[1]?.trim();
    if (!found) {
      drift.push(`${target} — ${name} not found (renamed or removed?)`);
    } else if (found.toLowerCase() !== expected.toLowerCase()) {
      drift.push(`${target} — ${name} is ${found}, this script asserts ${expected}`);
    }
  }
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

if (drift.length > 0 || failures.length > 0) {
  if (drift.length > 0) {
    console.error(`\n${drift.length} token(s) drifted from source:`);
    for (const line of drift) console.error(`  DRIFT ${line}`);
  }
  if (failures.length > 0) {
    console.error(`\n${failures.length} contrast failure(s):`);
    for (const line of failures) console.error(`  FAIL ${line}`);
  }
  console.error(`\n${checked} pair(s) enforced, ${exemptions.length} documented exemption(s).`);
  process.exit(1);
}

console.log(
  `\nAll ${checked} enforced contrast pair(s) pass; ${exemptions.length} documented exemption(s); ` +
    `${SOURCES.length} source file section(s) verified against these values.`,
);
