# `ohs-player-web-core` public API reference

Authoritative export surface: [`packages/ohs-player-web-core/src/index.ts`](../packages/ohs-player-web-core/src/index.ts). This page summarizes **every symbol** published from that entry so host apps and contributors know what is stable without opening individual modules.

Types-only exports are listed under **Exported types**; runtime values are grouped by concern. React components are described briefly—full props live in TypeScript (`*.tsx` / `dist/*.d.ts`).

---

## Constants

| Export | Description |
| --- | --- |
| `OHS_PLAYER_WEB_CORE_VERSION` | Package version string (from build metadata). |

---

## Exported types (`./types/config` and `./sdc`)

Configuration and auth shapes: `AuthConfig`, `AuthStatus`, `CorePlatformConfig`, `CustomEndpoints`, `FhirVersion`, `FlagsConfig`, `FlagRecord`, `I18nConfig`, `MessageCatalog`, `PermissionMap`, `RbacAdapter`, `RbacConfig`, `ThemeColors`, `ThemeConfig`, `ThemeShadow`, `TokenStore`, `UnauthorizedBehaviour`, `UseAuthResult`, `UsePermissionResult`, `UserProfile`.

Structured Data Capture (FHIR Questionnaire): `Questionnaire`, `QuestionnaireAnswerValue`, `QuestionnaireFormProps`, `QuestionnaireFormRenderContext`, `QuestionnaireItem`, `QuestionnaireResponse`, `QuestionnaireResponseItem`, `BuildQuestionnaireResponseOptions`.

UI types: `OhsDialogProps`, `StatusTone`. (Presentational primitive prop types — `ButtonProps`, `CardProps`, `DataTableProps`, etc. — are **app**-level, in `apps/ohs-player-web/src/components/ui/`, not library exports.)

---

## Providers

| Export | Role |
| --- | --- |
| `CorePlatformProvider` | Top-level provider: composes QueryClient, OIDC `AuthProvider`, `CoreConfigProvider`, `FhirClientProvider`, `FlagsProvider`, `I18nProvider`, theme injection. Accepts `CorePlatformConfig`. |
| `AuthProvider` | OIDC session (`oidc-client-ts`), exposes auth API via context. |
| `CoreConfigProvider` | Host config (`fhirBaseUrl`, RBAC, theme, flags, i18n, `customEndpoints`, `onError`). |
| `FhirClientProvider` | Instantiates `FhirClient` from config + token accessor. |
| `FlagsProvider` | Feature-flag booleans from `FlagsConfig`. |
| `I18nProvider` | Locale + message catalog merge for `useTranslation`. |

---

## Hooks

| Export | Returns / behaviour |
| --- | --- |
| `useAuth()` | Login/logout/`handleRedirectCallback`/token access; see `UseAuthResult`. |
| `useAuthContext()` | Lower-level auth context (advanced use). |
| `useCoreConfig()` | Current `CorePlatformConfig`-derived settings from host. |
| `usePermission()` | RBAC check using JWT roles + `permissionMap`. |
| `useRoles()` | Current role strings from JWT. |
| `useFhirClient()` | Singleton `FhirClient` for the app tree. |
| `useFlag(flagName)` | Resolved boolean for a feature flag. |
| `useTranslation()` | `t(key)`, interpolation, RTL/dir future-ready. |
| `useResource(resourceType, id)` | TanStack Query read: `client.read`. |
| `useSearch(resourceType, params?)` | TanStack Query search bundle: `client.search`. |
| `usePagedSearch(resourceType, { page, pageSize, params })` | Offset-paged search (`_count`/`_offset`/`_total=accurate`, as strings). Returns `{ rows, total, page, pageSize, hasNext, hasPrev, paginationMode, isLoading, isFetching, error }`. `paginationMode` is `'numbered'` when the server reports an accurate `total`, else `'links'`. Shares the `['fhir','search',type,…]` cache namespace, so delete/update/refresh invalidate it. |
| `useFhirCapabilities()` | TanStack Query: `GET …/metadata`. |
| `useCreateResource(resourceType)` | Mutation: `client.create`; invalidates search for `resourceType`. |
| `useUpdateResource(resourceType)` | Mutation: `client.update`; invalidates read + search. |
| `useDeleteResource(resourceType)` | Mutation: `client.delete` (hard delete); invalidates read + search for `resourceType`. Rejects with `FhirError` — surface 409/`OperationOutcome` conflicts. |
| `useCustomEndpoint(alias)` | `{ get, post, put }` mutations wrapping `customGet` / `customPost` / `customPut` for that alias (`put` takes `{ id?, body }`). |
| `useRefreshResources()` | Returns `(resourceType \| resourceType[]) => Promise<void>` that invalidates + refetches the cached `search` list(s) so view tables re-render after a mutation. |
| `useOptimisticInsert()` | Returns `(resourceType, resource, options?) => rollback` that inserts a created resource into every mounted `search` list cache so the row renders instantly, then reconciles via a **delayed** background refetch (re-applying the row if the server isn't consistent yet, so it never disappears). `options.also` adds resource types to reconcile (derived columns); `options.reconcileDelayMs` tunes the delay (default 1500). Don't also call `useRefreshResources` for that create. Call the returned rollback on the mutation's error path. |
| `useQuestionnaireFormState(questionnaire, initialAnswers?)` | SDC form state: `{ answers, setAnswer, setAnswers, buildQuestionnaireResponse, validateRequired }`. |
| `useStatusBar()` | Status bar context consumer (primitives). |

---

## Auth helpers

| Export | Description |
| --- | --- |
| `createMemoryTokenStore()` | In-memory `TokenStore` (tests). |
| `createSessionStorageTokenStore()` | `sessionStorage`-backed `TokenStore`. |
| `decodeJwtPayload(token)` | Decode JWT payload (roles etc.); **not** signature verification. |

---

## RBAC & flags (components)

| Export | Description |
| --- | --- |
| `PermissionGuard` | Renders children only if permission granted (optionally wrap denied UX). |
| `RoleGuard` | Renders children when role present. |
| `FeatureGuard` | Renders children when flag enabled. |

---

## Theme

| Export | Description |
| --- | --- |
| `applyTheme(theme?)` | Applies CSS variables to document (`ThemeConfig`). |
| `defaultTheme` | Baseline theme object. |
| `mergeTheme(base, patch)` | Deep-merge themes for overrides. |

---

## FHIR client: `FhirClient`

Instantiated by `FhirClientProvider`. All HTTP calls use `Accept: application/fhir+json`, attach Bearer token when present, and retry once on **401** after refreshing the token.

Instance property:

| Member | Description |
| --- | --- |
| `get baseUrl()` | Normalized FHIR REST base (no trailing slash). |

Methods:

| Method | Description |
| --- | --- |
| `read(resourceType, id)` | `GET …/{type}/{id}` |
| `search(resourceType, params?)` | `GET …/{type}?…` search parameters |
| `searchAll(resourceType, params?, options?)` | Walk every search page via Bundle `link[rel=next]` (rebased onto the client base); returns the flat resource list. Options: `pageSize` (default 500), `maxPages` (default 100). Use when a single `_count` page is not enough (e.g. location roots). |
| `rebaseFhirUrl(nextUrl, fhirBaseUrl)` | Pure helper: map a server-issued paging URL onto the client FHIR base (docker-internal hosts → browser proxy). |
| `create(body)` | `POST …/{type}` — body must include `resourceType` |
| `update(resourceType, id, body)` | `PUT …/{type}/{id}` |
| `delete(resourceType, id)` | `DELETE …/{type}/{id}` — handles 204 empty body |
| `transaction(bundle)` | `POST` bundle to base URL (typically transaction/batch) |
| `capabilities()` | `GET …/metadata` (CapabilityStatement) |
| `postOperation(relativePath, body?)` | `POST …/{relativePath}` — FHIR **$operations** (e.g. `Questionnaire/$extract`). Path must not start with `/`. |
| `customGet(alias, params?, idSegment?)` | GET non-FHIR path from `customEndpoints[alias]` relative to gateway root, optionally appending `/{idSegment}` (e.g. `location-hierarchy/{rootId}`) |
| `customPost(alias, body)` | POST JSON to `customEndpoints[alias]` (Accept `application/json`) |
| `customPut(alias, body, idSegment?)` | PUT JSON to `customEndpoints[alias]`, optionally appending `/{idSegment}` (e.g. a resource id) |
| `customPostStream(alias, body)` | POST `BodyInit` (e.g. multipart `FormData`) to `customEndpoints[alias]` and return the raw `Response` for streaming (SSE); no `Content-Type` set (browser sets the multipart boundary) |
| `errorFromResponse(res)` | Convert a non-OK custom-route `Response` into a `FhirError` (parses the gateway JSON error body) |

---

## Bundle transactions

Helpers for building and committing FHIR transaction Bundles. Single-resource saves (one entry) and multi-resource commits (with `urn:uuid:` cross-references) both go through `commitBundle`.

| Export | Description |
| --- | --- |
| `newUrnUuid()` | A `urn:uuid:` placeholder (`crypto.randomUUID`) for a not-yet-created resource, referenceable within the same Bundle. |
| `bundleEntry(request, resource?, fullUrl?)` | Builds one `TransactionBundleEntry`; pass `fullUrl` (from `newUrnUuid`) to cross-reference before the server assigns an id. |
| `commitBundle(client, entries)` | Wraps `entries` in a `type: 'transaction'` Bundle and submits via `client.transaction` (all-or-nothing); returns the `TransactionResponseBundle`. |
| `committedReference(response, index?)` | `{Type}/{id}` for the entry at `index`, parsed from its `response.location`. |
| `committedId(response, index?)` | The bare server-assigned id for the entry at `index`. |

Types: `BundleEntryMethod`, `TransactionBundleEntry`, `TransactionResponseBundle`.

---

## Errors

| Export | Description |
| --- | --- |
| `FhirError` | Thrown on non-OK FHIR responses; carries status + parsed body. |
| `isOperationOutcome(body)` | Type guard for OperationOutcome-shaped bodies. |
| `formatOperationOutcomeMessage(body)` | Human-readable message from an OperationOutcome if possible. |

---

## Audit

| Export | Description |
| --- | --- |
| `writeAuditEvent(client, params)` | `POST` a minimal FHIR `AuditEvent` via `client.create`. `AuditParams`: `action`, `resourceType`, optional `resourceId`, `description`, `agentDisplay`. |

---

## Structured Data Capture (SDC)

Aligned with FHIR R4 `Questionnaire` / `QuestionnaireResponse` for capture flows (HL7 SDC concepts; full IG compliance is incremental).

| Export | Description |
| --- | --- |
| `buildQuestionnaireResponse(opts)` | Builds a `QuestionnaireResponse` from flat `answers` keyed by `linkId` and the structure of `opts.questionnaire`. Sets `questionnaire` canonical (`url\|version`) via `formatQuestionnaireCanonical`. |
| `formatQuestionnaireCanonical(q)` | Returns `QuestionnaireResponse.questionnaire` reference string. |
| `validateRequiredAnswers(questionnaire, answers)` | Returns missing required leaf `linkId`s. |
| `QuestionnaireFields` | Presentational: renders items using `answers` + `setAnswer`; optional `referenceOptionsByLinkId`, `renderItem` override. |
| `QuestionnaireForm` | Convenience wrapper: internal state + `QuestionnaireFields`; optional `onAnswersChange`. |
| `useQuestionnaireFormState` | Headless state for submit handlers that need `buildQuestionnaireResponse()` without `QuestionnaireForm`. |

Supported item types for rendering include `string`, `text`, `integer`, `decimal`, `boolean`, `choice`, `open-choice`, `reference` (with optional select options), and nested groups. Reference answers use strings such as full references (`Location/123`) or `__root__` when omitted.

---

## UI exports

The library ships **behavior + Radix wrappers only** — it does **not** export presentational primitives (`Button`, `Card`, `TextField`, `DataTable`, etc.); those live in the app (`apps/ohs-player-web/src/components/ui/`). See **UI primitives & theming** in [ARCHITECTURE.md](./ARCHITECTURE.md).

| Export | Description |
| --- | --- |
| `OhsDialog`, `OhsToast`, `OhsTooltip` | Radix-based overlays (`ui/radix`). |
| `OhsDropdownMenu` | Radix dropdown-menu compound API. |
| `OhsTabs` | Radix tabs compound API. |
| `StatusBarProvider`, `useStatusBar` | Status bar context + consumer (`ui/primitives/StatusBar`). |
| `FhirJsonView` | Read-only pretty-printed FHIR JSON + Copy button. Token-styled, dark-mode-safe; labels (`copyLabel`/`copiedLabel`) and `onCopy`/`onCopyError` are passed in (the app owns i18n + status feedback). |
| `FhirJsonEditor` | Editable "FHIR Resource (JSON)" field with inline validation; rejects unparseable JSON and any change to `resourceType`/`id`. Reports `(parsed, text)` and validity via callbacks. Seeds once on mount — pass a `key` to reset. |
| `formatOperationOutcomeMessage` | Human-readable message from a FHIR `OperationOutcome`. |

Types: `OhsDialogProps`, `StatusTone`, `FhirJsonViewProps`, `FhirJsonEditorProps`, `PagedSearchParams`, `PagedSearchResult`.

---

## i18n catalogs

| Export | Description |
| --- | --- |
| `defaultMessageCatalog` | English default strings for core UI. |
| `swMessageCatalogStub` | Swahili stub catalog for extension demos. |

---

## Versioning note

Anything **not** re-exported from `src/index.ts` is considered **internal** to the package unless documented otherwise (subject to breaking changes without semver guarantees from consumers’ perspective).
