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

## 4. Add a FHIR Viewer resource type

The FHIR Viewer (`/resources`) is registry-driven. Adding a type is **one registry row + one i18n label** — no screens, routes, or components change.

1. Add an entry to `ENTRIES` in [`apps/ohs-player-web/src/features/fhir-viewer/registry.ts`](apps/ohs-player-web/src/features/fhir-viewer/registry.ts): `['Endpoint', '_id', 'status']` — `[resourceType, searchParam, statusFacet?]`. Use `'name'` for `searchParam` only if the type declares a `name` search parameter; otherwise `'_id'`. Set `statusFacet` only where the type has a plain `active`/`status` search param.
2. Add its label to [`appMessages.ts`](apps/ohs-player-web/src/i18n/appMessages.ts): `fhirTypeEndpoint: 'Endpoint'` (key is `fhirType<ResourceType>`, value is the FHIR spec spelling, humanised).

**FHIR-only rule (enforced):** every `resourceType` must be a real FHIR R4 type present in the backend `CapabilityStatement`. `registry.test.ts` fails the build for any entry that isn't — so a non-FHIR label (e.g. the design's mislabeled "Medication Required") cannot ship; it maps to its real type (`MedicationRequest`) or is dropped.

### Governing rules & known constraints

- **Backend wins over design.** Only valid FHIR R4 types appear; display/search/pagination adapt to what the backend serves, not to the Figma mockup.
- **Delete is a hard FHIR `DELETE`**, gated by `fhir-viewer.edit` (admin) with a mandatory confirm — an explicit exception to the repo's deactivate-first convention, justified by the viewer being a raw admin/debug tool where deactivation doesn't generalize across arbitrary types.
- **Edit is raw JSON** (a power-user surface), outside the SDC/typed-form path; `resourceType`/`id` are immutable.
- **Seed prerequisite:** the demo HAPI store starts empty — run `pnpm seed` before expecting rows. Only `Organization`/`Practitioner`/`Location`/`CareTeam` are seeded today; other types show the empty state until seeded.
- **Gateway constraint (backend ticket):** the viewer's FHIR reads work via the dev direct-HAPI proxy. The OHS Info Gateway 401s all `/fhir` reads without a `patient_list` token claim the realm doesn't issue, so against the gateway the viewer renders the "not available from this backend" state for every type until a Keycloak realm mapper is added.
