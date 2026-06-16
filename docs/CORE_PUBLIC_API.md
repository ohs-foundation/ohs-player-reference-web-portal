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

Primitive props (subset): `ButtonProps`, `ButtonSize`, `ButtonVariant`, `CardHeaderProps`, `CardProps`, `DataTableColumn`, `DataTableProps`, `EmptyStateProps`, `ErrorStateProps`, `FieldRootProps`, `IconButtonProps`, `InlineProps`, `PageHeaderProps`, `PageProps`, `SelectFieldOption`, `SelectFieldProps`, `StackProps`, `StatusBadgeProps`, `StatusTone`, `TextAreaFieldProps`, `TextFieldProps`.

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
| `useFhirCapabilities()` | TanStack Query: `GET …/metadata`. |
| `useCreateResource(resourceType)` | Mutation: `client.create`; invalidates search for `resourceType`. |
| `useUpdateResource(resourceType)` | Mutation: `client.update`; invalidates read + search. |
| `useCustomEndpoint(alias)` | `{ get, post, put }` mutations wrapping `customGet` / `customPost` / `customPut` for that alias (`put` takes `{ id?, body }`). |
| `useRefreshResources()` | Returns `(resourceType \| resourceType[]) => Promise<void>` that invalidates + refetches the cached `search` list(s) so view tables re-render after a mutation. |
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
| `create(body)` | `POST …/{type}` — body must include `resourceType` |
| `update(resourceType, id, body)` | `PUT …/{type}/{id}` |
| `delete(resourceType, id)` | `DELETE …/{type}/{id}` — handles 204 empty body |
| `transaction(bundle)` | `POST` bundle to base URL (typically transaction/batch) |
| `capabilities()` | `GET …/metadata` (CapabilityStatement) |
| `postOperation(relativePath, body?)` | `POST …/{relativePath}` — FHIR **$operations** (e.g. `Questionnaire/$extract`). Path must not start with `/`. |
| `customGet(alias, params?)` | GET non-FHIR path from `customEndpoints[alias]` relative to gateway root derived from FHIR base |
| `customPost(alias, body)` | POST JSON to `customEndpoints[alias]` (Accept `application/json`) |
| `customPut(alias, body, idSegment?)` | PUT JSON to `customEndpoints[alias]`, optionally appending `/{idSegment}` (e.g. a resource id) |

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

## UI primitives (token-driven + Material Web)

Exported React components and helpers from `./ui/primitives`:

`Button`, `Card`, `CardHeader`, `DataTable`, `EmptyState`, `ErrorState`, `Field`, `IconButton`, `Inline`, `Page`, `PageHeader`, `SelectField`, `Spinner`, `Stack`, `StatusBadge`, `StatusBarProvider`, `TextAreaField`, `TextField`, `useStatusBar`.

See Material bridge notes in [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Radix & Material wrappers

| Export | Description |
| --- | --- |
| `OhsDialog`, `OhsToast`, `OhsTooltip` | Radix-based overlays (see source under `ui/radix`). |
| `OhsDropdownMenu` | Material `md-menu` wrapper. |
| `OhsTabs` | Material tabs (`OhsM3Tabs` alias). |

---

## i18n catalogs

| Export | Description |
| --- | --- |
| `defaultMessageCatalog` | English default strings for core UI. |
| `swMessageCatalogStub` | Swahili stub catalog for extension demos. |

---

## Versioning note

Anything **not** re-exported from `src/index.ts` is considered **internal** to the package unless documented otherwise (subject to breaking changes without semver guarantees from consumers’ perspective).
