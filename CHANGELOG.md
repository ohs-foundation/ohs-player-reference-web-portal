# Changelog

## 0.2.0 — 2026-09-23

`ohs-player-web-core` and `ohs-player-web-shell` 0.2.0. Every API change is additive; nothing is removed or renamed from either `index.ts`.

**Audit log.** The reference app has an audit log at `/audit`: `AuditEvent`s newest first, paged on the server, filtered by action, resource type, agent and a date range kept in the URL, with a drawer that shows the full event and its raw JSON. It is switched by the `auditLog` flag (`VITE_FLAG_AUDIT_LOG`), gated by the `audit.view` permission (`admin` by default) and listed in the sidebar at order 80, all overridable in `portal-config.json`.

**ohs-player-web-core**
- `writeAuditEvent` now writes `agent[0].name` and types `entity[0]` with the resource type (`RESOURCE_TYPES_SYSTEM`, `http://hl7.org/fhir/resource-types`) instead of `audit-entity-type|2`, so the FHIR `agent-name` and `entity-type` search parameters match portal events. Anything that filtered portal events on `entity-type=2` no longer matches new events.
- `activityItemFromAuditEvent`, `ActivityItem`, `AuditAction`: one normaliser for portal and gateway (IHE BALP) audit events.
- `SearchParams`: `FhirClient.search`/`searchAll`, `useSearch` and `usePagedSearch` accept an array value, sent as a repeated key (FHIR AND), e.g. a date range.
- `useTranslation().formatDateTime` and `I18nConfig.dateTimeFormat`.
- Fix: `FhirJsonView`'s code block takes keyboard focus, so JSON wider or taller than its panel can be scrolled without a mouse.

**ohs-player-web-shell**
- `DataTable` `serverPagination` (`DataTableServerPagination`): the kit footer for server-paged lists, numbered with a total and previous/next without one.
- `DetailField`: the label and value row of a details drawer.
- `FilterChip` `input` (`FilterChipInput`): a date input with bounds for the text variant.
- `NAV_IDS` gains `audit` with a `DEFAULT_NAVIGATION` entry; `IconHistory`, `IconHistoryFill`.
- The notifications bell reads through `activityItemFromAuditEvent` (same twelve items).
- Fix: closing a `Drawer` returns focus to the element that opened it, on every screen that uses one.
- From #95: `Popover`, the Hi-Fi 3 sidebar and customisable dashboard KPI widgets.

**Upgrading with extensions.** The host now claims the route path `/audit`, the flag `auditLog`, the permission `audit.view` and the reference app's `navAudit`, `pageAudit*`, `audit*` and `tableShowingRange` message keys. An extension that declares any of them is rejected at startup: it throws in development and is dropped in production.

## 0.1.0 — 2026-05-08

- Initial publish of `ohs-player-web-core@0.1.0` and the `ohs-player-web` reference application (see repository README and `docs/`).
- **Material Web**: `ohs-player-web-core` primitives (`Button`, `IconButton`, `TextField`, `TextAreaField`, `SelectField`, `Spinner`, `OhsTabs`, `OhsDropdownMenu`) now delegate to `@material/web` 2.x where applicable. OHS `--ohs-*` tokens are bridged to `--md-sys-*` in `m3-bridge.css`. Radix remains for dialog, toast, and tooltip. Host apps should add `@material/web` as a direct dependency so bundlers resolve component entry imports from the built core package.
