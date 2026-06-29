# Tailwind Migration Plan — OHS Player Web

> Status: **approved direction + pilot**. App-only Tailwind; components styled to resemble **Material 3**;
> the `--ohs-*` token contract stays the portable, multi-platform interface.

## 0. Decided direction

- **Material 3 is the design language.** Google's Open Health Stack design guidance
  (developers.google.com/open-health-stack/design) explicitly recommends **Material 3**
  (m3.material.io) as the foundational design system. Google is a project sponsor, so components
  (drawers, buttons, fields, etc.) should **resemble Material 3** — its colour roles, shape scale,
  elevation, typography, and state layers. We follow the **visual language**, built with our own
  components + tokens — we do **not** re-adopt the Material Web component library (removed in `dad988f`).
- **Tailwind lives in the app layer only.** The reusable core (`ohs-player-web-core`) stays
  styling-agnostic and ships only the **design-token contract**, so downstream teams re-theme without
  forking. This is also the M3 model: M3 *is* a token-driven theming system, so "resembles Material" and
  "downstream teams re-theme via tokens" are the **same mechanism**.
- **Brand values follow Figma; data points follow the backend** (unchanged rule).

## 1. Why (the strategic frame)

Two forces point the same way. (a) **Sponsor guidance:** OHS officially recommends Material 3. (b)
**Extensibility:** OHS is becoming a multi-platform, vendor-neutral umbrella, so downstream teams (MoH
deployments, partners, future consumers) must re-theme **without forking components**. M3's token-based
theming, expressed through Tailwind utilities that read our `--ohs-*` tokens, satisfies both at once.

Today there is **no Tailwind**. Styling is ~2,187 lines of hand-written CSS across three files and **82
`.ohs-*` classes** in `components/ui/theme.css`, with component variants expressed via `data-variant`
attributes. The good news: **design tokens are already centralized** as `--ohs-*` CSS variables — the hard,
portable part is done.

## 2. The boundary rule (decided)

| Layer | Styling | Why |
| ----- | ------- | --- |
| **Library** (`ohs-player-web-core`) | **Tailwind-agnostic.** Ships headless behaviour + the `--ohs-*` **token contract**. No utility classes baked in. | A downstream consumer must NOT be forced into our Tailwind config to re-theme. The token contract is the portable interface. |
| **App** (`ohs-player-web`) | **Tailwind**, with the Tailwind theme **mapping to `--ohs-*` tokens** (never hardcoded hex/px). | Tailwind is an app-layer implementation detail; the contract above it stays portable. |

**Invariant:** Tailwind's `theme` references `var(--ohs-*)` tokens. We never hardcode colours/spacing/radius
in `tailwind.config` or in utility classes (`bg-[#094f9a]` is banned). This is what lets a consumer flip
tokens and re-theme everything — the same promise the current CSS makes.

## 2a. Our tokens are already ~70% Material-3 shaped

Brian's "retain current styling, make components resemble Material" is low-risk because our `--ohs-*` tokens
already mirror the M3 structure. The migration aligns the gaps, it doesn't start over:

| Material 3 concept | We already have | Gap to close during the sweep |
| ------------------ | --------------- | ----------------------------- |
| **Colour roles** (primary / on-primary / surface / surface-variant / outline / error) | `primary`, `primary-container`, `primary-contrast` (=on-primary), `surface`, `surface-variant`, `border` (=outline), `error` | Optional: add M3-style `on-*` aliases for clarity |
| **Shape scale** (none / xs / sm / md / lg / full) | `radius-sm`, `radius-default`, `radius-pill` (=full) | Optionally add `md`/`lg` steps for the full M3 shape scale |
| **Elevation** (levels 1–5) | `shadow-sm` / `shadow-md` / `shadow-lg` | 3 of 5 levels — sufficient for MVP |
| **Typography** (display / headline / title / body / label) | `heading-xl/m/xs`, `text-xl/l/m/s` | Scale present; naming differs from M3 — keep or alias |
| **State layers** (hover / focus / pressed) | hover + `focus-ring` | Formalise pressed/dragged state-layer opacities for a closer M3 feel |

So "make components resemble Material 3" mostly means: apply **M3 elevation, shape, and state layers** to
the components during the Tailwind sweep, reading these (already M3-shaped) tokens — not redefining the
system.

## 3. Token bridge (the heart of the migration)

The existing tokens (`theme.css`, `lightTheme`, `applyTheme`) remain the single source of truth. Tailwind is
configured to **consume** them:

```js
// tailwind.config — colours/spacing/radius point at the existing --ohs-* variables
theme: {
  extend: {
    colors: {
      primary: 'var(--ohs-color-primary)',
      'primary-hover': 'var(--ohs-color-primary-hover)',
      surface: 'var(--ohs-color-surface)',
      'surface-variant': 'var(--ohs-color-surface-variant)',
      text: 'var(--ohs-color-text)',
      'text-muted': 'var(--ohs-color-text-muted)',
      border: 'var(--ohs-color-border)',
      error: 'var(--ohs-color-error)',
      // …one entry per token already in theme.css
    },
    borderRadius: { DEFAULT: 'var(--ohs-radius-default)', pill: 'var(--ohs-radius-pill)' },
    spacing: { /* map --ohs-spacing-1..7 */ },
  },
}
```

Result: `className="bg-primary text-surface rounded"` resolves to the **same tokens** the hand-CSS used.
Dark mode and `VITE_THEME_ALT` keep working unchanged — they flip token values, and Tailwind reads them live.

## 4. Variants: `data-variant` → `cva` (class-variance-authority)

The Shadcn idiom. Each primitive's variant table becomes a `cva()` definition of token-mapped utilities.
The component API (`variant`, `size` props) **does not change** — only the internals.

## 5. Phased plan

1. **Setup (no UI change).** Add `tailwindcss`, `@tailwindcss/postcss` (or the Vite plugin),
   `class-variance-authority`, `tailwind-merge`. Author `tailwind.config` with the token bridge. Add the
   Tailwind directives to `index.css`. Verify the build + bundle budget. **Gate: nothing renders
   differently yet.**
2. **Pilot one primitive — `Button`.** Convert `Button`/`IconButton` to `cva` + token-mapped utilities.
   Delete its `.ohs-button*` rules from `theme.css`. Prove visual parity (light + dark), a11y, and tests.
   *(This document ships with the pilot.)*
3. **Sweep the primitive kit.** One primitive per change, in dependency order:
   `Field`/inputs → `Card` → `States`/badges → `Chips` → `Switch`/`Checkbox` → `DataTable` →
   `Layout` → `Drawer`. Each: convert, delete its `.ohs-*` rules, verify parity, run gates.
4. **Feature screens.** Replace ad-hoc `style={{…}}` (23 files) and remaining feature `.ohs-*` usages with
   utilities. Keep complex/stateful layout in CSS where utilities would hurt readability.
5. **Cleanup.** Remove dead `.ohs-*` rules; shrink `theme.css` to **token definitions only**
   (the `[data-ohs-root]` variable block stays — that's the contract). Update `docs/ARCHITECTURE.md`
   "Design tokens" + the `CLAUDE.md` styling guidance.

## 6. What stays (do NOT migrate)

- The `--ohs-*` **token definitions** in `theme.css` / `lightTheme` — this is the portable contract.
- The **library's** Radix wrappers and behaviour — Tailwind-agnostic.
- `applyTheme`/`mergeTheme`/dark-mode/`VITE_THEME_ALT` — they operate on tokens, which Tailwind now reads.

## 7. Risks & mitigations

- **Coupling consumers to Tailwind** → app-only scope; library stays token-only. (Decided.)
- **Visual drift during the sweep** → migrate one primitive at a time, token-mapped, with light+dark parity
  checks; never hardcode values.
- **Bundle size** → Tailwind purges unused utilities; run `pnpm bundle:check` after setup and after the
  sweep. Library bundle is unaffected (no Tailwind in it).
- **`cn()`/class-merge correctness** → use `tailwind-merge` so consumer `className` overrides win.
- **Big-bang regressions** → phased, primitive-by-primitive, each behind the existing gates
  (`pnpm typecheck`, eslint `--max-warnings 0`, vitest, axe).

## 8. Definition of done

- `theme.css` contains only token definitions + any irreducible global rules.
- Every primitive renders via token-mapped Tailwind utilities; component props unchanged.
- Light + dark + `VITE_THEME_ALT` all correct.
- Library ships no Tailwind; downstream consumers can still re-theme via tokens alone.
- Docs (`ARCHITECTURE.md`, `CLAUDE.md`) updated; gates green; bundle within budget.

## 9. Pilot — `Button` (the proven pattern)

This is what Phase 2 looks like end-to-end, so the pattern can be approved before Tailwind is installed
(Phase 1 adds the dependency + build config, which is a separate, reviewable step).

**Today** — `Button.tsx` joins `.ohs-button` strings and sets `data-variant`; ~50 lines of CSS in
`theme.css` style it:

```tsx
const cls = ['ohs-button', size === 'sm' ? 'ohs-button--sm' : '', className ?? ''].filter(Boolean).join(' ');
return <button className={cls} data-variant={variant} … />;
```

```css
.ohs-button { display:inline-flex; …; height:48px; border-radius:var(--ohs-radius-default); … }
.ohs-button[data-variant='primary'] { background:var(--ohs-color-primary); color:var(--ohs-color-primary-contrast); }
.ohs-button[data-variant='primary']:hover:not([disabled]) { background:var(--ohs-color-primary-hover); }
/* …secondary/outlined/ghost/danger + --sm + focus + disabled… */
```

**After** — a `cva` table of **token-mapped utilities**; the CSS rules are deleted. The `variant`/`size`
props and the component's external API are unchanged:

```tsx
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn'; // tailwind-merge wrapper so consumer className wins

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded border border-transparent px-6 h-12 ' +
  'font-medium whitespace-nowrap transition-colors cursor-pointer select-none ' +
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus ' +
  'disabled:opacity-55 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:  'bg-primary text-primary-contrast hover:bg-primary-hover',
        secondary:'bg-transparent border-border-tertiary text-text-muted hover:bg-surface-variant',
        outlined: 'bg-transparent border-border-tertiary text-text-muted hover:bg-surface-variant',
        ghost:    'bg-transparent border-border text-text hover:bg-surface-variant',
        danger:   'bg-error text-primary-contrast hover:brightness-92',
        elevated: 'bg-surface text-text shadow-sm hover:bg-surface-variant',
      },
      size: { md: 'text-base leading-6', sm: 'h-9 px-4 text-sm leading-5' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

// in the component:
return <button className={cn(button({ variant, size }), className)} aria-busy={loading || undefined} … />;
```

Notes:

- Every utility maps to a `--ohs-*` token via the Tailwind theme bridge (`bg-primary` → `var(--ohs-color-primary)`).
  **No hex/px literals.** `ring-focus` → `--ohs-color-focus-ring`; `h-12` (48px) and `h-9` (36px) match the
  current heights.
- `cn()` = `twMerge(clsx(...))` so a consumer passing `className="bg-error"` correctly overrides the variant.
- `data-variant` is dropped (the variant is now in the class). If any feature CSS selects
  `.ohs-button[data-variant=…]`, grep and migrate those first.
- Delete the `.ohs-button*` block from `theme.css` in the same change; verify light+dark parity and the
  existing Button tests + axe pass.
