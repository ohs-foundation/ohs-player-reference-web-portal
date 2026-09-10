# Adopt `GET /api/practitioner-details` in the user drawers — implementation plan

Scope: read screens only (`UserDetailsDrawer`, `UserEditDrawer`). Writes stay as Bundle transactions plus `writeAuditEvent`.
Backend: `ohs-player-reference-backend` `main` (endpoint landed in #70, commit `3c8b617`).

Every sprint ends with a Definition of Done (DoD). Do not start the next sprint until every DoD box is ticked.

---

## 0. Analysis

### 0.1 What the web does today

| Screen | Calls today | Stays / goes |
| --- | --- | --- |
| `UserDetailsDrawer` | `useResource('Practitioner', id)` | replaced by endpoint |
| | `useSearch('PractitionerRole', { practitioner })` | replaced |
| | `useSearch('CareTeam', { participant: Practitioner/{id} })` | replaced (see F1) |
| | `useSearch('Organization', { _count: 500 })` → `nameMap` | deleted |
| | `useSearch('Location', { _count: 500 })` → `nameMap` | deleted |
| `UserEditDrawer` | `useResource('Practitioner', id)` | replaced |
| | `roleSearch` (`PractitionerRole?practitioner=`) | replaced |
| | `membershipSearch` (`CareTeam?participant=`) | replaced (see F1) |
| | `orgSearch`, `locSearch`, `careTeamSearch` | **untouched** — picker options |

The details drawer also feeds `buildDeactivateBundle(pract, roles, careTeams, endIso)` from `roleSearch` and `careTeamSearch`. The Bundle logic does not change, but its **inputs** come from the calls being replaced. That makes the deactivate flow a regression surface for this ticket even though it is a write.

### 0.2 Backend contract, verified from source

`PractitionerDetailsServlet` (`/api/practitioner-details`) + `PractitionerDetailService`:

- Query params: `iam-id`, `practitioner-id`, `organisation-id`, `location-id`. No id → self lookup from JWT `sub`. Explicit id → requires `practitioner-details.view`.
- One FHIR call: `PractitionerRole?practitioner={id}&_include=PractitionerRole:practitioner&_include=PractitionerRole:organization&_include=PractitionerRole:location&_revinclude=CareTeam:participant` (+ `organization=` / `location=` filters), paged to completion.
- Response: `{ practitioner, practitionerRoles: [{ practitionerRole, organization | null, locations: [], careTeams: [] }] }`. Each value is a FHIR R4 resource as JSON.
- Errors: `401` no/invalid token or no `sub`; `403` missing role; `404` "No practitioner found"; `502` upstream FHIR failure. Error body is `{ error }` JSON from `ServletResponseUtil.writeJsonError`, **not** an `OperationOutcome`. `FhirClient.toError` still wraps it in `FhirError`; `formatOperationOutcomeMessage` must be checked for what it renders for a non-OperationOutcome body (Sprint 3).

### 0.3 Findings that change the plan

**F1 — Care team matching does not match how the web writes membership (blocking).**
`PractitionerDetailService.memberReferencesPractitionerRole` attaches a CareTeam to a role only when `participant.member.reference` ends with `PractitionerRole/{roleId}`. The web writes `participant.member = Practitioner/{id}` (`resourceFromAnswers.ts` care team mapper and `addParticipant`, and `scripts/seed.ts`). The ticket text ("references that role or that practitioner") does not match `main`. Consequences if shipped as-is:
- The details drawer's Care Teams section shows "None on record" for every web-managed user.
- The edit drawer's care team picker pre-selects nothing, so saving would **remove** the user from every team (the diff logic treats absent originals as adds only, but a user un-ticking nothing still loses `originalCareTeamIds`, and any accidental interaction removes the real membership silently).
- `buildDeactivateBundle` receives zero care teams and leaves orphan memberships, reverting #49.

**F2 — A practitioner with no PractitionerRole gets a 404.**
The only FHIR call is a `PractitionerRole` search; the Practitioner arrives via `_include`. Empty search → `mapEntries` returns `null` → `404`. `UserCreateDrawer` allows creating a user with no assignment, so every fresh unassigned user cannot be opened in either drawer. The backend's own unit test `mapEntries_PractitionerNoRoles_ReturnsDetailWithEmptyRoles` shows the intent to support this case, so this reads as a backend bug rather than a design choice.

**F3 — Option A is not as small as it looks.**
`@tanstack/react-query` is a dependency of the library only; the `QueryClientProvider` lives in `CorePlatformProvider`. A `useQuery` in the app layer means adding the package to `apps/ohs-player-web/package.json` and relying on pnpm resolving the same module instance for the context to be shared. That is fragile and duplicates the library's job ("components never fetch by hand"). **Recommendation: Option B**, a `useCustomResource(alias, params?, options?)` hook in `ohs-player-web-core`. It is ~10 lines on top of the existing `useQuery` import, so the bundle budget impact is negligible.

**F4 — `UserDetailsDrawer` has no error state today.** `read.error` is ignored. The ticket requires one; reuse `features/sdc/toErrorMessage.ts` (already does the `instanceof FhirError` → `formatOperationOutcomeMessage` narrowing) with the app `ErrorState` primitive. Do not re-implement the narrowing.

**F5 — Local realm has no `practitioner-details.view` role.** `infra/keycloak/ohs-realm.json` defines `admin` / `care-team-manager` only. Manual verification of the `?practitioner-id=` form needs that realm role on the test user. Editing the realm import is a confirm-first operation per `.claude/CLAUDE.md`; ask before touching it, or assign the role by hand in the Keycloak admin console for the session.

**F6 — Cardinality.** The details drawer renders `role.location[0]` only. `PractitionerRole.location` is `0..*` ([R4 spec](https://hl7.org/fhir/R4/practitionerrole.html)), and the endpoint returns `locations: []`. Render the list (the `ohs-detail-list` pattern already used for care teams). `PractitionerRole.organization` is `0..1`, so the single org stays scalar.

### 0.4 Where the new code sits

```
UserDetailsDrawer / UserEditDrawer            (feature UI, app)
  └─ usePractitionerDetails(id) / useMyPractitionerDetails()   (app: features/users/usePractitionerDetails.ts)
       └─ useCustomResource('practitionerDetails', params)      (library: hooks/useFhirData.ts, new)
            └─ FhirClient.customGet(alias, params)              (library, unchanged)
                 └─ GET {gatewayRoot}/api/practitioner-details  (alias from config/platform.ts)
```

The app never sees a raw path, never constructs a FHIR query for practitioner context, and narrows the `unknown` response once, in the app hook, using `@medplum/fhirtypes` for the FHIR parts. The envelope (`practitioner` / `practitionerRoles`) is a gateway payload shape, not a FHIR resource, so a small hand-rolled interface for it is correct, the same way `NewUserFields` is.

---

## Decisions to lock in Sprint 0

| # | Decision | Recommendation |
| --- | --- | --- |
| D1 | Read hook: Option A (app `useQuery`) vs B (library `useCustomResource`) | **B** (F3). |
| D2 | Care team source given F1 | Ask backend to also match `Practitioner/{id}` members (extend `memberReferencesPractitionerRole`, and pull those teams in — `_revinclude:iterate` or a second `CareTeam?participant=Practitioner/{id}` search). Web then reads care teams from the endpoint (flattened across roles, deduped by id). **Fallback if backend declines:** keep exactly one FHIR search, `CareTeam?participant=Practitioner/{id}`, in the details drawer for the Care Teams section and the deactivate inputs, documented as a temporary exception. Still cuts 5 → 2 requests. |
| D3 | No-role practitioner 404 (F2) | Ask backend to return `200` with `practitionerRoles: []` when the Practitioner exists (read `Practitioner/{id}` when the role search is empty). **Fallback:** web falls back to `useResource('Practitioner', id)` only when the endpoint returns `FhirError` with `status === 404`. |
| D4 | Cache invalidation after a save | None extra. Drawers are mutually exclusive and unmount on close; React Query's default `staleTime: 0` refetches on remount. Document the key `['custom', alias, params]` so a future "my profile" page can invalidate it. |
| D5 | Multi-role display in the details drawer | Keep today's behaviour (first role drives Role / Org; locations and care teams are shown for that role). Flag a multi-role layout as a follow-up ticket; do not widen scope here. |

---

## Sprint 0 — Decisions and backend alignment (no code)

**Goal:** remove the two blockers before anything is built on the wrong contract.

Steps
1. Post D1–D5 on the ticket with the recommendations above; get a pick on the ticket.
2. Open two backend issues, citing `PractitionerDetailService.memberReferencesPractitionerRole` and `buildDetailUrl`:
   - F1: match `Practitioner/{id}` participant members (this also answers the ticket's "open question for backend").
   - F2: role-less practitioner must return `200` with empty roles, not `404`.
3. Record which fallbacks (D2 / D3) the web must ship if the backend fixes are not on `main` by the start of Sprint 3.
4. Confirm how a local test user gets `practitioner-details.view` (F5): realm import change (needs explicit consent) or manual role assignment.

DoD
- [ ] D1–D5 answered on the ticket.
- [ ] Backend issues for F1 and F2 exist and are linked from the ticket.
- [ ] Fallback matrix agreed: for each of F1/F2, "backend fixes" or "web ships fallback".
- [ ] A local user with `practitioner-details.view` can call `GET /api/practitioner-details?practitioner-id=<seed id>` with `curl` and get `200`.

---

## Sprint 1 — Library: `useCustomResource` + config alias

**Goal:** a declarative, cached GET for any custom endpoint, published through the library's public API.

Files
- `packages/ohs-player-web-core/src/hooks/useFhirData.ts` — add hook.
- `packages/ohs-player-web-core/src/hooks/useFhirData.test.tsx` — new.
- `packages/ohs-player-web-core/src/index.ts` — export.
- `docs/CORE_PUBLIC_API.md` — hooks table row.
- `apps/ohs-player-web/src/config/platform.ts` — `practitionerDetails: '/api/practitioner-details'`.

Hook sketch (JSDoc is the library register; explicit return type on the export):

```ts
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

/**
 * Declarative GET of a host-defined custom endpoint (`customEndpoints[alias]`), cached by TanStack
 * Query under `['custom', alias, params]`. Use for read-only gateway routes consumed during render;
 * `useCustomEndpoint(alias).get` remains the imperative form. The result is `unknown`; narrow at the call site.
 */
export function useCustomResource(
  alias: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: { enabled?: boolean },
): UseQueryResult<unknown> {
  const client = useFhirClient();
  return useQuery({
    queryKey: ['custom', alias, params],
    enabled: options?.enabled ?? true,
    queryFn: async () => client.customGet(alias, params),
  });
}
```

Tests (`useFhirData.test.tsx`, `renderHook` from `@testing-library/react` inside a `QueryClientProvider`; `vi.mock('../providers/FhirClientProvider')` to inject a `{ customGet: vi.fn() }` client)
- calls `customGet(alias, params)` once and resolves `data`.
- passes `undefined` params through untouched (self form; DoD item for the ticket).
- `enabled: false` never calls `customGet`.
- a rejected `customGet` surfaces on `error`.

Docs row: `useCustomResource(alias, params?, { enabled? })` — TanStack Query GET of `customEndpoints[alias]`, key `['custom', alias, params]`.

DoD
- [ ] Hook exported from `src/index.ts`; `docs/CORE_PUBLIC_API.md` updated.
- [ ] `pnpm test --filter=ohs-player-web-core` green including the four new cases.
- [ ] `pnpm typecheck`, `pnpm lint` green (root).
- [ ] `pnpm build --filter=ohs-player-web-core` run, then `pnpm bundle:check` passes (the app typechecks against `dist`, so this rebuild is mandatory before Sprint 2).
- [ ] `customEndpoints.practitionerDetails` present in `platform.ts`; `grep -rn "practitioner-details" apps/` returns only that line.
- [ ] No change to existing hooks or `FhirClient`.

---

## Sprint 2 — App data layer: `usePractitionerDetails` + typed response

**Goal:** one place that names the alias, narrows the response, and derives the shapes both drawers need. No screen changes yet.

Files
- `apps/ohs-player-web/src/features/users/usePractitionerDetails.ts` — new.
- `apps/ohs-player-web/src/features/users/usePractitionerDetails.test.tsx` — new.

Sketch (app register: no comments unless the WHY is non-obvious):

```ts
import type { CareTeam, Location, Organization, Practitioner, PractitionerRole } from '@medplum/fhirtypes';
import { useCustomResource } from 'ohs-player-web-core';

export interface PractitionerRoleDetails {
  practitionerRole: PractitionerRole;
  organization: Organization | null;
  locations: Location[];
  careTeams: CareTeam[];
}

export interface PractitionerDetails {
  practitioner: Practitioner;
  practitionerRoles: PractitionerRoleDetails[];
}

const PRACTITIONER_DETAILS_ALIAS = 'practitionerDetails';

export function usePractitionerDetails(practitionerId: string | undefined) {
  const query = useCustomResource(
    PRACTITIONER_DETAILS_ALIAS,
    { 'practitioner-id': practitionerId },
    { enabled: Boolean(practitionerId) },
  );
  return { details: query.data as PractitionerDetails | undefined, isLoading: query.isLoading, error: query.error };
}

export function useMyPractitionerDetails() {
  const query = useCustomResource(PRACTITIONER_DETAILS_ALIAS);
  return { details: query.data as PractitionerDetails | undefined, isLoading: query.isLoading, error: query.error };
}

export function careTeamsOf(details: PractitionerDetails | undefined): CareTeam[] {
  const byId = new Map<string, CareTeam>();
  for (const role of details?.practitionerRoles ?? []) {
    for (const ct of role.careTeams) if (ct.id) byId.set(ct.id, ct);
  }
  return [...byId.values()];
}

export function rolesOf(details: PractitionerDetails | undefined): PractitionerRole[] {
  return (details?.practitionerRoles ?? []).map((r) => r.practitionerRole);
}
```

Notes
- Keep the two hooks and the two pure helpers in this one file; one feature folder per entity, no micro-files.
- If D3 lands as "web fallback", add `isNotFound(error)` here (`error instanceof FhirError && error.status === 404`) so both drawers share it.
- Do not add a runtime validator beyond the cast; the gateway contract is the source of truth and the tests pin the shape.

Tests (mock `ohs-player-web-core` with `importActual` + `useCustomResource: vi.fn()`)
- `usePractitionerDetails('p1')` calls `useCustomResource('practitionerDetails', { 'practitioner-id': 'p1' }, { enabled: true })`.
- `usePractitionerDetails(undefined)` passes `enabled: false`.
- `useMyPractitionerDetails()` calls `useCustomResource('practitionerDetails')` with **no params** (ticket DoD).
- `careTeamsOf` dedupes a team attached to two roles; `rolesOf` on `undefined` returns `[]`.

DoD
- [ ] All four tests green; `pnpm typecheck` + `pnpm lint` green.
- [ ] No `any`, no `as any`; the only cast is the single `as PractitionerDetails | undefined` narrowing.
- [ ] Alias referenced once, by the const; grep confirms no raw path.
- [ ] Nothing in `packages/` imports from `apps/`.

---

## Sprint 3 — `UserDetailsDrawer`: five requests → one

**Goal:** the drawer renders from `usePractitionerDetails(id)` alone, with loading / empty / error states, and the deactivate Bundle is built from the same response.

Files
- `apps/ohs-player-web/src/features/users/UserDetailsDrawer.tsx`
- `apps/ohs-player-web/src/features/users/UserDetailsDrawer.test.tsx` — new.

Steps
1. Replace `read`, `roleSearch`, `careTeamSearch`, `orgSearch`, `locSearch` with `const { details, isLoading, error } = usePractitionerDetails(id)`.
2. Delete `refName`, `nameMap`, the `Bundle` import, and the `useResource` / `useSearch` imports (nothing else uses them; verified by grep).
3. Rebuild the `details` memo from `PractitionerDetails`: `practitioner` for demographics (typed `Practitioner`, so the `Record<string, unknown>` pokes become `pract.name?.[0]`, `pract.telecom`, `pract.identifier`, `pract.birthDate`, `pract.active`); `practitionerRoles[0]` for role code, `organization?.name`, `locations`; `careTeamsOf(details)` for the Care Teams section.
4. Locations section renders `locations` as a list using the existing `ohs-detail-rel` / `ohs-detail-list` markup (F6). Empty array → `t('detailNone')`.
5. Deactivate: `buildDeactivateBundle(practitioner, rolesOf(details), careTeamsOf(details), endIso)`. These are medplum types crossing into `Record<string, unknown>` params; cast at the boundary as the mapper-boundary rule in `.claude/CLAUDE.md` describes. Guard `if (!details) return` where `if (!pract) return` was. The Bundle shape, `client.transaction`, and `writeAuditEvent` call are unchanged.
6. Error state: when `error` is set, render `<ErrorState description={toErrorMessage(error)} />` in the body instead of the sections (F4). Check what `formatOperationOutcomeMessage` produces for the gateway's `{ error }` body; if it yields an empty string, fall back to `error.message` inside `toErrorMessage` (that is the sdc helper's file, but it is shared and the fix is one line; note it in the summary).
7. Footer: the Deactivate button's `disabled` uses `isLoading` (previously three `isLoading`s).
8. If D3 is "web fallback": `const fallback = useResource('Practitioner', isNotFound(error) ? id : undefined)` and render demographics from it with empty role/org/location/care team sections.
9. If D2 is "web fallback": keep a single `useSearch('CareTeam', { participant: \`Practitioner/${id}\` })` for the Care Teams section and deactivate inputs, with a one-line WHY comment pointing at the backend issue.

Tests (`vi.mock('ohs-player-web-core', importActual)` overriding `useTranslation`, `useFhirClient`, `useCustomResource` via `vi.hoisted` mutable state, `writeAuditEvent`; also stub `useSearch` / `useResource` with `vi.fn()` so a regression back to FHIR searches fails loudly)
- success: name, role display, org name, both locations, and both care teams render from inline resources; `useSearch` and `useResource` were never called.
- loading: `isLoading: true` → spinner, sections absent.
- empty: `practitionerRoles: []` → Role field shows `—`, Org / Location / Care Teams show `detailNone`, no crash.
- error: `error: new FhirError('...', 502, outcome)` → `ErrorState` with the formatted message; deactivate button disabled or hidden.
- deactivate: click Deactivate → confirm → `transaction` called with a Bundle containing the Practitioner `active:false`, the role end-dated, and the care team with the member removed; `writeAuditEvent` called once with `resourceId: 'p1'`.
- axe: `await axe(container, { rules: { 'color-contrast': { enabled: false } } })`, no `critical` violations (pattern from `OrganizationsPage.test.tsx`).

DoD
- [ ] `UserDetailsDrawer.tsx` imports neither `useSearch` nor `useResource` (unless D3 fallback, then `useResource` only, gated on 404).
- [ ] `refName` / `nameMap` gone; no unused imports.
- [ ] All six tests green; `pnpm typecheck` + `pnpm lint` green.
- [ ] All copy via `t()`; no new hardcoded strings. New i18n keys, if any, added to `appMessages.ts`.
- [ ] Manual check against backend `main` (Sprint 0 user): open a seeded user → one `GET /api/practitioner-details?practitioner-id=` in the Network tab, no `Organization?_count=500` / `Location?_count=500`.
- [ ] Manual deactivate of a seeded user with a role and a care team: role end-dated, membership removed, `AuditEvent` written (verify in HAPI).

---

## Sprint 4 — `UserEditDrawer`: current values from the endpoint, pickers untouched

**Goal:** `roleSearch` and `membershipSearch` (and the Practitioner read) come from `usePractitionerDetails(id)`. `orgSearch`, `locSearch`, `careTeamSearch`, the PUT, the Bundle, and the audit write do not change.

Files
- `apps/ohs-player-web/src/features/users/UserEditDrawer.tsx`
- `apps/ohs-player-web/src/features/users/UsersPage.test.tsx` — extend the `UserEditDrawer` describe.

Steps
1. Replace `read`, `roleSearch`, `membershipSearch` with `usePractitionerDetails(id)`.
2. `existingRoles = rolesOf(details)` (already `PractitionerRole[]`, so the `as unknown as PractitionerRole[]` cast goes away). `existingRoleIds` unchanged. `originalCareTeamIds = careTeamsOf(details).map((ct) => ct.id).filter(Boolean)`.
3. `pract` becomes `details?.practitioner` typed as `Practitioner`; the hydration effect reads `name`, `telecom`, `identifier`, `gender`, `birthDate`, `active` through the medplum type instead of `Record` pokes. `relationsLoading` collapses to `isLoading`.
4. Loading / error branch: `isLoading || !hydrated` → spinner; `error` → `ErrorState` with `toErrorMessage(error)` (same as today's `read.error` branch).
5. `submit()` is untouched except the `if (!pract) return` guard now reads `details?.practitioner`. `careTeamById` still comes from `careTeamSearch` (picker data), so `careTeamAdds` / `careTeamRemoves` keep working.
6. `resourcesOf` stays (the pickers use it). Delete only what becomes unused; the build will tell you.
7. If D3 is "web fallback", apply the same 404 → `useResource` fallback as Sprint 3 so an unassigned user can still be edited.

Tests (extend `UsersPage.test.tsx`: add `useCustomResource` to the core mock; drive it with `vi.hoisted` state)
- pre-populates role, org, locations, and care teams from the endpoint response (existing "pre-populates" test extended to assert the selected picker values).
- save with no role / care team change → PUT payload identical to today's expectation, `transaction` not called, `writeAuditEvent` once (existing test, unchanged assertions — this is the save-path regression guard).
- save that adds a care team → `transaction` Bundle carries a `PUT CareTeam/{id}` with the practitioner appended (uses `careTeamById` from the picker search, proving the picker path survived).
- loading and error states.

DoD
- [ ] `UserEditDrawer.tsx` imports no `useResource`; `useSearch` appears exactly three times (org, location, care team pickers).
- [ ] The three existing `UserEditDrawer` / `UserCreateDrawer` tests pass unmodified in their assertions on `mockPut` / `mockTransaction` / `mockWriteAuditEvent`.
- [ ] New tests green; `pnpm typecheck` + `pnpm lint` green.
- [ ] Manual check against backend `main`: open Edit on a seeded user, role / org / location / care teams pre-selected; save without changes → one `PUT /api/users/{id}`, no FHIR transaction; Network tab shows a single `practitioner-details` call plus the three picker searches.

---

## Sprint 5 — Verification, cleanup, PR

**Goal:** the whole ticket DoD, end to end, on a branch.

Steps
1. Branch from `main` (`feat/practitioner-details-endpoint`); Conventional Commit messages, no attribution trailers.
2. Full gate: `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm bundle:check`.
3. Manual matrix against backend `main` with the Sprint 0 user:

| Case | Details drawer | Edit drawer |
| --- | --- | --- |
| user with role + org + 2 locations + care team | all sections populated, 1 request | all pre-selected |
| user with role, no org | Org shows `detailNone` | org picker empty |
| user with no role (F2) | per D3 outcome | per D3 outcome |
| care team member via `Practitioner/{id}` (F1) | per D2 outcome | per D2 outcome |
| gateway down (`502`) | `ErrorState` with message | `ErrorState` with message |
| token without `practitioner-details.view` (`403`) | `ErrorState`, no crash | `ErrorState`, no crash |

4. Dark mode pass on both drawers (no new tokens expected; confirm the `ErrorState` and list rows read correctly).
5. PR description: link the ticket and the two backend issues; list D1–D5 outcomes; note the F6 location-list change for design to catch up; do **not** cite `.claude/CLAUDE.md` or local docs.

DoD (mirrors the ticket)
- [ ] `pnpm typecheck` and `pnpm lint` pass with no new warnings.
- [ ] Both drawers verified manually against backend `main` (matrix above).
- [ ] `UserDetailsDrawer` issues one request for practitioner context (Network tab evidence in the PR).
- [ ] Tests cover success / loading / empty / error for both drawers, plus `axe`.
- [ ] Self-lookup test calls the endpoint with no params.
- [ ] No `any` / `as any`; single narrowing cast in the app hook.
- [ ] No raw endpoint paths; copy through i18n.
- [ ] Save path in `UserEditDrawer` unchanged (existing PUT / transaction / audit assertions untouched).
- [ ] Option B artefacts: `src/index.ts`, `docs/CORE_PUBLIC_API.md`, `pnpm bundle:check`.

---

## Files intentionally not touched

- `UsersPage.tsx`, `CareTeamsPage.tsx` list searches (N+1; out of scope per ticket).
- `DashboardPage.tsx` `_summary=count` calls.
- `resourceFromAnswers.ts` Bundle builders (`buildDeactivateBundle`, `buildUserEditBundle`) — inputs change, logic does not.
- `UserCreateDrawer.tsx`.
- `FhirClient.ts`, `useCustomEndpoint`.
- `infra/keycloak/ohs-realm.json` unless explicitly approved in Sprint 0.

## Follow-ups worth ticketing

1. Backend: F1 (Practitioner-referenced care team members) and F2 (role-less practitioner 404). Raised in Sprint 0.
2. `UserDetailsDrawer` defines its own `Section` and `Field` while `userFormControls.tsx` exports a `Section`; consolidate into one shared component.
3. Multi-role practitioners: the details drawer shows the first role only (D5).
4. `UserCreateDrawer` loads IAM groups with `client.customGet('groups')` inside a `useEffect`; migrate to `useCustomResource('groups')` once it exists.
5. `.claude/CLAUDE.md` still references `tickets/` and `tickets/DESIGN.md`, which no longer exist in the repo.
6. `toErrorMessage` lives under `features/sdc/` but is used by user drawers; it is shared error plumbing and could move up a level.
