# Extending the portal

Published **`ohs-player-web-core` API** (hooks, `FhirClient`, SDC helpers): see [CORE_PUBLIC_API.md](./CORE_PUBLIC_API.md).

## 1. Add a feature behind a build-time flag

1. Add `VITE_FLAG_MY_FEATURE=true` to `.env` (see `.env.example`).
2. In [`apps/ohs-player-web/src/config/env.ts`](apps/ohs-player-web/src/config/env.ts), expose the flag (e.g. `myFeature: import.meta.env.VITE_FLAG_MY_FEATURE !== 'false'`).
3. In [`apps/ohs-player-web/src/config/platform.ts`](apps/ohs-player-web/src/config/platform.ts), add the key to `flags.flags` (e.g. `myFeature: env.flags.myFeature`).
4. Wrap routes or nav with `<FeatureGuard flag="myFeature">…</FeatureGuard>` and, if needed, `<PermissionGuard permission="…">`.

Evaluation order is **flag → authenticated user → permission**.

## 2. Override theme tokens

Pass `theme` into `CorePlatformConfig` (from `platform.ts`). The reference app also supports `VITE_THEME_ALT=true` to load [`apps/ohs-player-web/src/theme/altTheme.ts`](apps/ohs-player-web/src/theme/altTheme.ts) (alternate branding). Theme values map to CSS variables such as `--ohs-color-primary`.

## 3. Register and call a custom gateway endpoint

1. Add an alias in `customEndpoints`, e.g. `{ myAction: '/custom/my-action' }`.
2. In a component: `const { post } = useCustomEndpoint('myAction');` then `post.mutateAsync(body)`.

Resolution strips `/fhir` from `fhirBaseUrl` and appends the mapped path for non-FHIR gateway calls.
