# Theming the OHS Player web portal

How to restyle a deployment without forking components, and what the token contract guarantees.

Everything visual resolves from CSS custom properties under the `--ohs-*` prefix. Components never
hardcode a colour, size, radius or shadow, so a deployment changes its look by changing token values.

---

## 1. One layer, one writer

| Names | Hold | Written by | As |
| --- | --- | --- | --- |
| `--ohs-sys-*` | colour roles, typescale, shape, state, elevation, motion, spacing, density | `themeCss()` / `installThemeCss()` | one `<style id="ohs-theme-tokens">` element |
| `--ohs-ref-*` | typefaces and typeface weights | the same stylesheet | |

**Nothing else writes a token.** No inline styles, no second stylesheet, no declarations in hand-written
CSS. A `ThemeConfigV2` is the only input, so a deployment has exactly one place to set a colour.

The stylesheet carries both schemes at once: `:root` and `[data-ohs-root]` hold the light scheme plus
every mode-independent token, and `[data-theme='dark']` holds the dark colours. `ThemeModeProvider` sets
`data-theme` on `<html>`, which is the only switch, so dark mode is pure CSS and nothing is re-applied
when the mode changes. Because the tokens sit on `:root`, portals rendered outside `[data-ohs-root]`
(drawers, dialogs, dropdowns, toasts) resolve them too.

`installThemeCss` runs in `main.tsx` **before** `createRoot().render()`, not in an effect. Utilities and
hand-written CSS read these tokens on the first paint; installing them in an effect leaves every
sys-backed value undefined until after that paint.

Two tests keep the layer whole: `retiredTokens.test.ts` fails if a retired name (§9) reappears in
source, and `tokenIntegrity.test.ts` fails on a reference nothing declares.

---

## 2. Theming a deployment

`ThemeConfigV2` generates a complete, M3-conformant scheme from one seed colour. Unpinned roles are
derived; pins win.

```ts
import { installThemeCss, type ThemeConfigV2 } from 'ohs-player-web-core';

const theme: ThemeConfigV2 = {
  overrides: { primary: '#094F9A' },        // light-scheme pins
  darkOverrides: { surface: '#0D0D0D' },    // dark-scheme pins
  extraColors: { 'level-root-bg': { light: '#094F9A', dark: '#094F9A' } }, // feature colours
  typography: {
    brandFamily: '"Google Sans", sans-serif',
    plainFamily: '"Google Sans", sans-serif',
    monoFamily: '"Google Sans Code", monospace',
  },
  shape: { small: '8px' },
  density: 0,
};

installThemeCss(theme);
```

### Changing the seed

Palettes are generated at build time, not runtime — `@material/material-color-utilities` never reaches
the bundle (it is 3.8 MB of colour science; the committed output is ~4 KB of hex strings).

```bash
pnpm scheme:generate '#0F766E'   # regenerate packages/ohs-player-web-core/src/theme/palettes.ts
pnpm build
```

The generator asserts its output against reviewed values for the default seed, so a library upgrade
that shifts the colour science fails loudly instead of silently rewriting the palette. Pass a different
seed and that check is skipped, as it should be.

### What the reference app pins, and why

Seventeen roles, all in `apps/ohs-player-web/src/theme/sysTheme.ts`. Everything else is generated.

| Scheme | Role | Pinned to | Why |
| --- | --- | --- | --- |
| light | `primary` | `#094F9A` | brand; generated tone 40 is `#245eaa` |
| light | `on-primary` | `#FAFAFA` | established content-on-brand; generated is `#ffffff` |
| light | `primary-container` | `#DCE5FE` | brand |
| light | `surface-container` | `#FAFAFA` | the established page grey |
| light | `on-surface` | `#0D0D0D` | brand near-black |
| light | `on-surface-variant` | `#696969` | established muted text; generated is `#44474e` |
| light | `outline-variant` | `#EDEDED` | established card and table border; generated is `#c4c6cf` |
| light | `error` | `#E50000` | established negative red; generated is `#ba1a1a` |
| dark | `primary-container` | `#04366D` | brand; generated is `#00468c` |
| dark | `surface` | `#0D0D0D` | brand |
| dark | `surface-container` | `#0D0D0D` | page |
| dark | `surface-container-lowest` | `#1A1A1A` | drawer, dialog and panel fill; generated is `#0d0e11` |
| dark | `surface-container-low` | `#1A1A1A` | brand card fill |
| dark | `on-surface` | `#FAFAFA` | brand |
| dark | `on-surface-variant` | `#9E9E9E` | established muted text; generated is `#c4c6cf` |
| dark | `outline-variant` | `#363636` | established border; generated is `#44474e` |
| dark | `error` | `#FF8F8F` | established negative red; generated is `#ffb4ab` |

Ten of these hold the values the retired legacy tokens rendered, so moving every reference onto the
sys layer changed nothing on screen. The retired `--ohs-color-surface` moved to
`surface-container-lowest` rather than `surface`, because in dark mode the two had diverged: the
Tailwind cards and controls paint `surface` (`#0D0D0D`) while drawers, dialogs and panels painted the
legacy `#1A1A1A`. Aligning the palette to the Figma tokens is where most of these pins, and that split,
should be revisited.

Dark `primary` needs no pin: generated primary tone 70 is exactly the `#7BACFD` the brand wants.

A deployment can also set pins at runtime, without a rebuild, in the `brand` section of
`public/portal-config.json` ([DEPLOYMENT.md](./DEPLOYMENT.md) section 4). The app merges them over
these, role by role, before it installs the stylesheet. The reference document repeats these seventeen
pins.

**Pin as little as possible.** Every pin is a value that no longer moves when the seed changes, and a
pair that must be contrast-checked by hand. Pin brand identity; let the generator handle the rest.

---

## 3. Colour roles

Standard M3 roles, plus extensions M3 does not publish: `success`, `warning`, `info` and their
containers, and six roles that carry colours from the product palette M3 has no slot for
(`primary-hover`, `on-surface-secondary`, `outline-secondary`, `outline-tertiary`, `focus-ring`,
`focus-ring-error`).

- **Fills:** `surface`, `surface-container-{lowest,low,high,highest}`, `surface-container`,
  `surface-dim`, `surface-bright`
- **Content:** `on-surface`, `on-surface-variant`, `on-surface-secondary`, and an `on-*` for every
  accent role
- **Boundaries:** `outline` for anything that identifies a control, `outline-variant`,
  `outline-secondary` and `outline-tertiary` for decorative dividers and panel edges
- **Accents:** `primary`, `secondary`, `tertiary`, `error`, plus `success`/`warning`/`info`, each with
  a container and on-container; `primary-hover` for the filled-button hover
- **Focus:** `focus-ring`, and `focus-ring-error` for invalid fields
- **Inverse / overlay:** `inverse-surface`, `inverse-on-surface`, `inverse-primary`, `scrim`, `shadow`

**Pair content with its container.** Text on `surface-container-highest` uses
`on-surface-variant`, not a fixed grey. Getting this wrong is how the migration produced its one real
regression: darkening panel fills dropped `#696969` muted text to 4.26:1.

Some roles are emitted but unused by this app. That is intentional — they are the contract a downstream
deployment themes against, and a library that only emits what one app happens to use is not a design
system.

### Feature colours

A colour that belongs to one feature rather than the design system goes in `extraColors`, with a value
per scheme. It is emitted as `--ohs-sys-color-<name>` alongside the roles, so it themes and flips with
the mode like any other token, without the library knowing the feature. The reference app declares its
location level badges this way, as `level-<level>-{bg,border,text}`, and `check-contrast.mjs` reads
their pairs from the same place.

### Contrast is enforced, not assumed

```bash
pnpm contrast:check
```

58 pairs, each classified: `text` (4.5:1), `boundary` (3:1, per WCAG SC 1.4.11 — anything needed to
identify a control), or `decorative` (exempt, and **every exemption carries a written reason**). Every
value is read from the theme source rather than restated, so none can drift.

Per-role conformance of the generated schemes is asserted separately in `sysContrast.test.ts` — 58
assertions across both schemes.

---

## 4. Type, shape, spacing, motion

| Group | Tokens |
| --- | --- |
| Type | `--ohs-sys-typescale-<role>-{font,size,line-height,weight,letter-spacing}` for `display-small`, `headline-medium`, `title-{large,medium}`, `body-{large,medium,small}`, `label-{large,medium,small}`, `heading-{5xl,4xl,3xl,2xl,xl,l}`, `text-{xl,l,xs,2xs}` |
| Typefaces | `--ohs-ref-typeface-brand`, `--ohs-ref-typeface-plain`, `--ohs-ref-typeface-mono` |
| Weights | `--ohs-ref-typeface-weight-regular` (400), `--ohs-ref-typeface-weight-medium` (500) |
| Shape | `--ohs-sys-shape-corner-{none,extra-small,small,medium,large,extra-large-decreased,extra-large,full}` |
| Spacing | `--ohs-sys-spacing-N` = N×4px (`1,2,3,4,5,6,8,10,12,14,16,20`) |
| Motion | `--ohs-sys-motion-duration-{short2,short4,medium2}`, `--ohs-sys-motion-easing-standard{,-decelerate,-accelerate}` |

Role *names* are M3's where M3 has one; `heading-*`/`text-*` cover the steps it does not: six from
the Figma ramp, plus `heading-xl` (36px) and `text-l` (18px), which keep the login title and the
topbar, card and dialog titles at their established sizes. `extra-large-decreased` (24px) fills M3's
20 → 28 gap. The weights follow M3's `md.ref.typeface.weight-*` reference tokens. Metrics are the Google Sans scale from the
Figma type ramp — M3's Roboto values are not adopted, which M3 explicitly allows.

Tracking is inherited: `body` sets `letter-spacing` from `body-medium` (-0.5px), which every step at
or below 24px shares. Steps at 32px and above override it at their own rule.

Tailwind utilities and the hand-written CSS share one 4px system: `--spacing` in the Tailwind bridge
derives from `--ohs-sys-spacing-1`.

---

## 5. Interaction states

Hover, focus and press are a **state layer**, not a background swap: `.ohs-state-layer` paints an
`::after` overlay in `currentColor` at the state opacity, so one rule serves every variant and colour
scheme.

```html
<button class="ohs-state-layer ...">Save</button>
```

Requires the element to establish a containing block (the class sets `position: relative`) and inherit
a border radius. For CSS-only components the same opacity token is used directly:

```css
background: rgb(from var(--ohs-sys-color-on-surface) r g b / var(--ohs-sys-state-hover-opacity));
```

Opacities: hover 0.08, focus 0.12, pressed 0.12, dragged 0.16. Disabled is a container/content split —
12% container tint, 38% content — not a blanket opacity fade. No ripple: subtle layers suit a
productivity tool and respect reduced motion.

`prefers-reduced-motion: reduce` collapses every animation and transition globally.

---

## 6. Elevation

`--ohs-sys-elevation-level0..5`, mapped as card L1, menu/dropdown/popover L2, dialog/drawer/toast L3.

The **level structure** is M3's; the **ink** is this product's reviewed slate-tinted shadows rather than
M3's umbra/penumbra recipes. That choice is still open — swapping the ink means editing `ELEVATION` in
`sysTokens.ts` and nothing else, because no component names a shadow directly.

---

## 7. Density

M3 density for data-dense screens, scoped so it cannot leak.

```tsx
<DataTable density={-1} … />
```

Sets `data-density` on the table wrapper, and the theme stylesheet's `[data-density]` rules set
`--ohs-sys-density-scale` for that subtree only — never for menus, dialogs or snackbars, which M3
cautions against densifying. Row height is
`calc(64px + scale * 4px)`: exactly −4px per step from the 64px baseline.

Field heights are deliberately **not** densified. At 44px they already sit on the interactive-target
floor, so shrinking them would break the constraint density is meant to respect.

---

## 8. SDC parity with the Android apps

Both platforms speak M3 roles, so matching a web questionnaire to an Android one is a token mapping
rather than a redesign. Android SDC themes via `Theme.Questionnaire` layered over
`Theme.Material3.DayNight`
([upstream guide](https://ohs-foundation.github.io/android-fhir/use/SDCL/Customize-how-a-Questionnaire-is-displayed/)).

| Android Material 3 attribute | Web token |
| --- | --- |
| `colorPrimary` | `--ohs-sys-color-primary` |
| `colorOnPrimary` | `--ohs-sys-color-on-primary` |
| `colorPrimaryContainer` | `--ohs-sys-color-primary-container` |
| `colorOnPrimaryContainer` | `--ohs-sys-color-on-primary-container` |
| `colorSurface` | `--ohs-sys-color-surface` |
| `colorOnSurface` | `--ohs-sys-color-on-surface` |
| `colorSurfaceVariant` | `--ohs-sys-color-surface-container-highest` |
| `colorOnSurfaceVariant` | `--ohs-sys-color-on-surface-variant` |
| `colorOutline` | `--ohs-sys-color-outline` |
| `colorError` / `colorOnError` | `--ohs-sys-color-error` / `-on-error` |
| `textAppearanceBodyLarge` | `--ohs-sys-typescale-body-large-*` |
| `textAppearanceLabelLarge` | `--ohs-sys-typescale-label-large-*` |
| `textAppearanceTitleMedium` | `--ohs-sys-typescale-title-medium-*` |

Note `colorSurfaceVariant` maps to `surface-container-highest`: M3 deprecated `surfaceVariant` in
favour of the container ladder, and the web side follows the current spec.

Seed both platforms from the same colour and these agree by construction. The SDC library's own
questionnaire-specific attributes are **not** listed here — check them against the upstream guide
rather than assuming a name.

---

## 9. Retired tokens

The legacy layer is gone. `applyTheme`, `mergeTheme`, `defaultTheme`, the v1 `ThemeConfig` and
`ThemeColors` types, `CorePlatformConfig.theme` and `upgradeThemeConfig` were removed from the library,
and every name below is gone from source. A test fails if any returns.

| Retired | Use instead |
| --- | --- |
| `--ohs-color-primary`, `-primary-container`, `-primary-hover` | `--ohs-sys-color-primary`, `-primary-container`, `-primary-hover` |
| `--ohs-color-primary-contrast` | `--ohs-sys-color-on-primary` |
| `--ohs-color-surface`, `--ohs-color-background` | `--ohs-sys-color-surface-container-lowest`, `--ohs-sys-color-surface-container` |
| `--ohs-color-text`, `-text-muted`, `-text-secondary` | `--ohs-sys-color-on-surface`, `-on-surface-variant`, `-on-surface-secondary` |
| `--ohs-color-on-surface-variant` | `--ohs-sys-color-on-surface-variant` |
| `--ohs-color-border`, `-border-secondary`, `-border-tertiary` | `--ohs-sys-color-outline-variant`, `-outline-secondary`, `-outline-tertiary` |
| `--ohs-color-outline-variant` | `--ohs-sys-color-outline-variant` |
| `--ohs-color-focus-ring`, `-focus-ring-destructive` | `--ohs-sys-color-focus-ring`, `-focus-ring-error` |
| `--ohs-color-error`, `-success` | `--ohs-sys-color-error`, `-success` |
| `--ohs-color-level-<level>-{bg,border,text}` | `--ohs-sys-color-level-<level>-{bg,border,text}`, declared through `extraColors` |
| `--ohs-font-body`, `-heading`, `-mono` | `--ohs-ref-typeface-plain`, `-brand`, `-mono` |
| `--ohs-font-weight-regular`, `-medium` | `--ohs-ref-typeface-weight-regular`, `-medium` |
| `--ohs-font-size-base`, `--ohs-text-body` | `--ohs-sys-typescale-body-large-size` |
| `--ohs-text-display`, `-headline`, `-title`, `-label` | `--ohs-sys-typescale-heading-xl-size`, `-headline-medium-size`, `-text-l-size`, `-label-medium-size` |
| `--ohs-radius-sm`, `-default`, `-lg`, `-pill` | `--ohs-sys-shape-corner-extra-small`, `-small`, `-medium`, `-full` |
| `--ohs-spacing-1..8`, `--ohs-spacing-unit` | `--ohs-sys-spacing-*` |
| `--ohs-shadow-{sm,md,lg}` | `--ohs-sys-elevation-level{1,2,3}` |
| `--ohs-color-{secondary,warning,info}` | `--ohs-sys-color-*` |
| `--ohs-color-surface-variant` | `--ohs-sys-color-surface-container-{low,highest}` |
| `--ohs-color-{positive,positive-surface,neutral-surface}` | `--ohs-sys-color-success*` / container roles |
| `--ohs-color-outline` | `--ohs-sys-color-outline` |
| `--ohs-color-text-quaternary` | `--ohs-sys-color-on-surface-variant` (failed AA at 2.68:1) |
| `--ohs-font-heading-*`, `--ohs-font-text-*` | `--ohs-sys-typescale-*` |
| `--ohs-neutral-*` | the `--ohs-ref-palette-*` tones in `palettes.ts` |

### Moving a v1 config

A deployment that passed a v1 `ThemeConfig` as `config.theme` moves its values onto a `ThemeConfigV2`
and calls `installThemeCss` once before render. Put light values in `overrides` and dark values in
`darkOverrides`.

| v1 `ThemeConfig` | `ThemeConfigV2` |
| --- | --- |
| `colors.primary`, `.primaryHover`, `.primaryContainer` | `primary`, `primary-hover`, `primary-container` |
| `colors.primaryContrast` | `on-primary` |
| `colors.surface`, `.background` | `surface-container-lowest`, `surface-container` |
| `colors.text`, `.textMuted` | `on-surface`, `on-surface-variant` |
| `colors.border` | `outline-variant` |
| `colors.focusRing` | `focus-ring` |
| `colors.error`, `.success` | `error`, `success` |
| `typography.fontFamily`, `.headingFontFamily` | `typography.plainFamily`, `typography.brandFamily` |
| `typography.baseFontSize`, `borderRadius.default` | `typography.scale`, `shape` |

---

## 10. Where things live

| Path | Holds |
| --- | --- |
| `packages/ohs-player-web-core/src/theme/sysTokens.ts` | role definitions, typescale, shape, state, elevation, motion, typeface weights |
| `packages/ohs-player-web-core/src/theme/palettes.ts` | generated tonal palettes — do not hand-edit |
| `packages/ohs-player-web-core/src/theme/themeCss.ts` | `ThemeConfigV2`, `themeCss`, `installThemeCss` |
| `apps/ohs-player-web/src/theme/sysTheme.ts` | this deployment's brand pins and feature colours |
| `packages/ohs-player-web-shell/src/tailwind.css` | utility → token bridge; must stay `@theme inline` |
| `packages/ohs-player-web-shell/src/components/ui/theme.css` | primitive-kit CSS and the state layer; declares no tokens |
| `scripts/generate-scheme.ts` · `scripts/check-contrast.mjs` | palette generation · contrast gate |

### Adding a token

1. A role or scale step in `sysTokens.ts`, or a feature colour in the deployment's `extraColors`.
   Never declare a token in hand-written CSS.
2. Bridge it in `tailwind.css` if components need a utility.
3. If it carries text or bounds a control, add its pair to `check-contrast.mjs`.
4. Never reference a token nothing declares — `var()` silently falls back, which pins a light-mode
   value into dark mode. `tokenIntegrity.test.ts` fails on this; it is how six such bugs were found.
