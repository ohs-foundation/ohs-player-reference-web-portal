# Theming the OHS Player web portal

How to restyle a deployment without forking components, and what the token contract guarantees.

Everything visual resolves from CSS custom properties under the `--ohs-*` prefix. Components never
hardcode a colour, size, radius or shadow, so a deployment changes its look by changing token values.

---

## 1. Two layers, deliberately disjoint

| Layer | Names | Written by | As |
| --- | --- | --- | --- |
| **System** | `--ohs-sys-*`, `--ohs-ref-*` | `themeCss()` / `installThemeCss()` | a `<style>` element |
| **Legacy** | `--ohs-color-*`, `--ohs-radius-*`, `--ohs-text-*`, `--ohs-font-*` | `applyTheme()` | inline styles on the element |

**No token is written by both, and that is load-bearing.** Inline styles beat attribute selectors, so a
token set inline can never be overridden by a `[data-theme='dark']` rule. If you add a token, put it in
one layer only. Two tests enforce this — `theme.test.ts` asserts `applyTheme` emits no `--ohs-sys-*`
name, and `aliasParity.test.ts` asserts the two sets never intersect.

The system layer carries both schemes at once and flips on `data-theme`, so dark mode is pure CSS. The
legacy layer holds one scheme at a time, which is why the app re-calls `applyTheme` when the mode
changes.

`installThemeCss` runs in `main.tsx` **before** `createRoot().render()`, not in an effect. Utilities and
hand-written CSS read these tokens on the first paint; installing them in an effect leaves every
sys-backed value undefined until after that paint.

---

## 2. Theming a deployment

`ThemeConfigV2` generates a complete, M3-conformant scheme from one seed colour. Unpinned roles are
derived; pins win.

```ts
import { installThemeCss, type ThemeConfigV2 } from 'ohs-player-web-core';

const theme: ThemeConfigV2 = {
  overrides: { primary: '#094F9A' },        // light-scheme pins
  darkOverrides: { surface: '#0D0D0D' },    // dark-scheme pins
  typography: { brandFamily: '"Google Sans", sans-serif', plainFamily: '"Google Sans", sans-serif' },
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

Only seven roles. Everything else is generated.

| Scheme | Role | Pinned to | Why |
| --- | --- | --- | --- |
| light | `primary` | `#094F9A` | brand; generated tone 40 is `#245eaa` |
| light | `primary-container` | `#DCE5FE` | brand |
| light | `surface-container` | `#F1F2F4` | the established page grey |
| light | `on-surface` | `#0D0D0D` | brand near-black |
| dark | `surface` | `#0D0D0D` | brand |
| dark | `on-surface` | `#FAFAFA` | brand |
| dark | `surface-container-low` | `#1A1A1A` | brand card fill |

Dark `primary` needs no pin: generated primary tone 70 is exactly the `#7BACFD` the brand wants.

**Pin as little as possible.** Every pin is a value that no longer moves when the seed changes, and a
pair that must be contrast-checked by hand. Pin brand identity; let the generator handle the rest.

---

## 3. Colour roles

Standard M3 roles, plus four extensions M3 does not publish (`success`, `warning`, `info` and their
containers — M3 has no such roles).

- **Fills:** `surface`, `surface-container-{lowest,low,high,highest}`, `surface-container`,
  `surface-dim`, `surface-bright`
- **Content:** `on-surface`, `on-surface-variant`, and an `on-*` for every accent role
- **Boundaries:** `outline` for anything that identifies a control, `outline-variant` for decorative
  dividers
- **Accents:** `primary`, `secondary`, `tertiary`, `error`, plus `success`/`warning`/`info`, each with
  a container and on-container
- **Inverse / overlay:** `inverse-surface`, `inverse-on-surface`, `inverse-primary`, `scrim`, `shadow`

**Pair content with its container.** Text on `surface-container-highest` uses
`on-surface-variant`, not a fixed grey. Getting this wrong is how the migration produced its one real
regression: darkening panel fills dropped `#696969` muted text to 4.26:1.

Some roles are emitted but unused by this app. That is intentional — they are the contract a downstream
deployment themes against, and a library that only emits what one app happens to use is not a design
system.

### Contrast is enforced, not assumed

```bash
pnpm contrast:check
```

58 pairs, each classified: `text` (4.5:1), `boundary` (3:1, per WCAG SC 1.4.11 — anything needed to
identify a control), or `decorative` (exempt, and **every exemption carries a written reason**). Sys
values are read from the theme source rather than restated, so they cannot drift. The remaining
restated legacy values are re-read from their source files and the check fails on any mismatch.

Per-role conformance of the generated schemes is asserted separately in `sysContrast.test.ts` — 58
assertions across both schemes.

---

## 4. Type, shape, spacing, motion

| Group | Tokens |
| --- | --- |
| Type | `--ohs-sys-typescale-<role>-{font,size,line-height,weight,letter-spacing}` for `display-small`, `headline-medium`, `title-{large,medium}`, `body-{large,medium,small}`, `label-{large,medium,small}`, `heading-{5xl,4xl,3xl,2xl,l}`, `text-{xl,xs,2xs}` |
| Typefaces | `--ohs-ref-typeface-brand`, `--ohs-ref-typeface-plain` |
| Shape | `--ohs-sys-shape-corner-{none,extra-small,small,medium,large,extra-large-decreased,extra-large,full}` |
| Spacing | `--ohs-sys-spacing-N` = N×4px (`1,2,3,4,5,6,8,10,12,14,16,20`) |
| Motion | `--ohs-sys-motion-duration-{short2,short4,medium2}`, `--ohs-sys-motion-easing-standard{,-decelerate,-accelerate}` |

Role *names* are M3's where M3 has one; `heading-*`/`text-*` cover the six Figma steps it does not,
and `extra-large-decreased` (24px) fills M3's 20 → 28 gap. Metrics are the Google Sans scale from the
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

Sets `data-density` on the table wrapper, which sets `--ohs-sys-density-scale` for that subtree only —
never for menus, dialogs or snackbars, which M3 cautions against densifying. Row height is
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

## 9. Legacy tokens (deprecated)

24 `--ohs-color-*` / `--ohs-radius-*` / `--ohs-text-*` / `--ohs-font-*` tokens remain, written by
`applyTheme` from a v1 `ThemeConfig`. **Deprecated: do not use them in new code.** They persist only
because repointing them at their sys equivalents changes how the app looks — `on-surface-variant` and
`outline-variant` are darker than the greys currently in use — and that is a design decision, not a
rename.

Migrate a v1 config with `upgradeThemeConfig(v1)`, which maps its colours onto sys roles.

Retired names are gone entirely and a test fails if any returns:

- `--ohs-spacing-1..8`, `--ohs-spacing-unit` → `--ohs-sys-spacing-*`
- `--ohs-shadow-{sm,md,lg}` → `--ohs-sys-elevation-level{1,2,3}`
- `--ohs-color-{secondary,warning,info}` → `--ohs-sys-color-*`
- `--ohs-color-surface-variant` → `--ohs-sys-color-surface-container-{low,highest}`
- `--ohs-color-{positive,positive-surface,neutral-surface}` → `--ohs-sys-color-success*` / container roles
- `--ohs-color-outline` → `--ohs-sys-color-outline`
- `--ohs-color-text-quaternary` → `--ohs-color-text-muted` (failed AA at 2.68:1)
- `--ohs-font-heading-*`, `--ohs-font-text-*` → `--ohs-sys-typescale-*`
- `--ohs-neutral-*` → the `--ohs-ref-palette-*` tones in `palettes.ts`

`ThemeShadow`, `ThemeConfig.shadow`/`.spacing` and `ThemeColors.secondary`/`.warning`/`.info` were
removed from the library: they configured tokens that no longer exist.

---

## 10. Where things live

| Path | Holds |
| --- | --- |
| `packages/ohs-player-web-core/src/theme/sysTokens.ts` | role definitions, typescale, shape, state, elevation, motion |
| `packages/ohs-player-web-core/src/theme/palettes.ts` | generated tonal palettes — do not hand-edit |
| `packages/ohs-player-web-core/src/theme/themeCss.ts` | `ThemeConfigV2`, `themeCss`, `installThemeCss`, `upgradeThemeConfig` |
| `packages/ohs-player-web-core/src/theme/theme.ts` | `applyTheme`, `defaultTheme`, `mergeTheme` (legacy layer) |
| `apps/ohs-player-web/src/theme/sysTheme.ts` | this deployment's brand pins |
| `apps/ohs-player-web/src/tailwind.css` | utility → token bridge; must stay `@theme inline` |
| `apps/ohs-player-web/src/components/ui/theme.css` | primitive-kit CSS, state layer, feature-scoped tokens |
| `scripts/generate-scheme.ts` · `scripts/check-contrast.mjs` | palette generation · contrast gate |

### Adding a token

1. Sys layer in `sysTokens.ts`, or a feature-scoped token in `theme.css`. Never both layers.
2. Bridge it in `tailwind.css` if components need a utility.
3. If it carries text or bounds a control, add its pair to `check-contrast.mjs`.
4. Never reference a token nothing declares — `var()` silently falls back, which pins a light-mode
   value into dark mode. `tokenIntegrity.test.ts` fails on this; it is how six such bugs were found.
