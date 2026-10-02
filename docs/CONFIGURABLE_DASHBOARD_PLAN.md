# Configurable dashboard implementation plan

Issue #109. Base `main` at `4866f49`. Branch `feat/configurable-dashboard`.

The whole ticket lands as one pull request built in four phases. Each phase leaves `main` shippable and ends with the quality gates green and the example app building and passing `host.test.tsx`.

---

## 0. Findings

Verified against the checkout on 2 October 2026.

| # | Finding | Where |
| --- | --- | --- |
| F1 | The page builds every card inline and fetches all twelve data sets whether or not a card renders. Four `useResourceStats` and four `useRecent` calls sit at the top of the page. | `packages/ohs-player-web-shell/src/pages/DashboardPage.tsx` lines 73 to 81 |
| F2 | Rows pair by `order`. One row per distinct `order` across `main` and `side`, with `data-side-only` when a row has no main item. | `features/dashboard/DashboardRegions.tsx` lines 15 to 34 |
| F3 | Only the four KPIs follow their screen's `requires`. The Recently Added tables and the donuts always render inside the `dashboard.view` guard. | `DashboardPage.tsx` lines 158 to 232, `VisibleKpis.tsx` |
| F4 | The example app turns on only `userMgmt`, `dashboard` and `schedules`. Today it shows one built in KPI, the schedules tile, and all four tables and all four donuts. | `apps/ohs-player-web-example/src/config/platform.ts` line 29 |
| F5 | The reference app turns every flag on by default and installs no extension. | `apps/ohs-player-web/src/config/env.ts` lines 11 to 19, `src/extensions.ts` |
| F6 | The KPI options in the old picker are named by the sidebar keys (`optionKey: 'navUsers'`). The guide documents that `navUsers` also names the picker option. | `kpiCatalogue.ts` line 20, `docs/CUSTOMIZING.md` lines 134 and 143 |
| F7 | `KpiGate` calls `useRequirement` once per catalogue entry through recursion, so no hook is conditional. This pattern carries over to the whole catalogue. | `features/dashboard/VisibleKpis.tsx` |
| F8 | `createPortalHost` holds the document and the namespaced widget contributions at the same moment, so it is the one place that can check document ids against the real catalogue. | `src/host/createPortalHost.ts` lines 146 to 156 |
| F9 | `SearchParams` accepts a repeated key, so a date range is `{ _lastUpdated: ['ge…', 'lt…'] }`. | `packages/ohs-player-web-core/src/client/FhirClient.ts` line 11 |
| F10 | FHIR keeps no creation date on Practitioner, Location, Organization or CareTeam. `_lastUpdated` is the only server side date, so a monthly chart counts records last updated in each month. See https://hl7.org/fhir/R4/search.html#lastUpdated and the prefix form at https://hl7.org/fhir/R4/search.html#date | FHIR R4 |
| F11 | The server keeps no history of active state for these resources, so "active versus inactive over time" cannot come from count searches. A point in time share replaces it. | FHIR R4 |
| F12 | The example catalogue test reads keys passed literally to `t()` and keys in `*_KEY` const maps. A key held as data (`labelKey: 'kpiTotalUsers'`) is not detected, so those keys need a manual check in both catalogues. | `apps/ohs-player-web-example/src/i18n/messages.test.ts` |
| F13 | `kpiCustomize`, `kpiPickerTitle`, `kpiPickerLimit` and `kpiSaved` are read only by the picker, the split button and the page. | both app catalogues, `KpiPicker.tsx`, `CustomizeWidgetsButton.tsx`, `DashboardPage.tsx` line 155 |

Where the issue and the code disagree, the plan follows the code.

1. The issue's example id `chart.newUsersByMonth` measures something FHIR cannot answer (F10). The charts are titled and named for updates.
2. "Active versus inactive over time" is replaced by a point in time share (F11).
3. The issue says an absent `layout` keeps extension widgets rendering by `order`. Under D2 rows pair by position. The derived default is identical for both apps today and differs only for a deployment with an unpaired `main` or `side` extension widget.
4. The issue says unknown ids fail validation. The schema cannot see extension ids, so the check runs at startup in `createPortalHost` with the same dev throw and prod report as a manifest problem (D3).

---

## Decisions

| # | Question | Answer |
| --- | --- | --- |
| D1 | Widget ids and the old KPI key | Built in ids are `kpi.<entity>`, `recent.<entity>`, `chart.<entity>ByStatus` for `users`, `locations`, `organizations` and `careTeams`, plus the D7 charts. Extension widgets keep `<manifestId>.<id>`. The old `ohs-dashboard-kpis:<sub>` array is read once, mapped to `kpi.<id>`, merged with the default `main` and `side`, written under `ohs-dashboard-layout:<sub>` and removed. |
| D2 | Row model | Rows pair `main[i]` with `side[i]` by position for every dashboard. One renderer. The #105 pin is rewritten for position pairing and the guides say so. |
| D3 | Unknown ids in the document | `createPortalHost` reports each unknown id or empty pattern with its path (dev throws, prod goes to `onError`) and drops it, so the rest of the layout renders. The reference schema also lists the built in ids for editor autocomplete. |
| D4 | KPI cap | `MAX_KPIS = 4` counts every visible card in the `kpi` region, built in or extension. |
| D5 | `available` | An entry is an exact id or a prefix ending in `.*`. Absent means every entry the session can see. It governs what a user can add. A card the document `layout` lists still renders when `available` excludes it. |
| D6 | Edit surface | An in page edit mode. Configure dashboard in the page header switches to Add widget, Reset to default, Cancel and Save. Each card gets move up, move down and remove buttons. Add widget opens the shell `Drawer` grouped by category. No drag and drop. |
| D7 | Charts | `chart.updatedByMonth.<entity>` is a six month bar chart per entity from six count searches each. `chart.activeShare` is one stacked bar per entity of active against inactive from the status counts. `BarChart` and `StackedBar` are separate primitives. |
| D8 | Documents | The reference document stays without a `dashboard` field. The example app carries a curated one. |
| D9 | Gating lists and charts | `recent.*` and `chart.*` entries follow their entity's nav `requires`, like the KPIs. The example app's default drops from four tables and four donuts to the users table and the users donut, which matches its curated document. |

---

## Edge cases

| Case | Answer | Pinned by |
| --- | --- | --- |
| No `dashboard` field, nothing stored | The derived default renders today's reference dashboard. The example app differs only by D9. | `DashboardPage.test.tsx`, manual check |
| Document `layout` names a card the session cannot see | Skipped at render, kept in the deployment layout, back when the gate allows it | `DashboardPage.test.tsx` |
| Stored layout names an id that no longer exists | Dropped on read, no error, the next Save writes the trimmed layout | `dashboardLayout.test.ts` |
| Stored layout from before this ticket | Migrated once, old key removed | `useDashboardLayout.test.tsx` |
| `available` excludes a card the `layout` lists | The card renders, and once removed it cannot be added back | `DashboardPage.test.tsx`, guide |
| `available` pattern matches nothing | Reported at startup and ignored | `dashboardChecks.test.ts` |
| Same id twice in a region or in two regions | First occurrence wins, the rest are reported and dropped | `dashboardChecks.test.ts` |
| Id in a region its entry does not allow | Reported and dropped | `dashboardChecks.test.ts` |
| KPI cap at the edge | Add disabled with the reason, moves still work, a gated off KPI does not count | `dashboardLayout.test.ts`, `DashboardEditor.test.tsx` |
| `main` and `side` of different lengths | Trailing rows render with the other column empty, `data-side-only` when main is empty | `DashboardRegions` cases in `DashboardPage.test.tsx` |
| Every region empty | Empty state with an Add widget action. With `userCustomization: false`, the empty state has no action and says the deployment configured an empty dashboard. | `DashboardPage.test.tsx` |
| Storage blocked | Save applies for the session and the status bar still reports it. The guide says the layout is per browser. | `useDashboardLayout.test.tsx` |
| Two tabs edit the same layout | Last Save wins, no merge. Stated as a limitation. | guide |
| Month windows across a year boundary or ahead of UTC | Windows computed in local time | `monthWindows.test.ts` |
| One month's count search fails | The chart shows `ErrorState` and the rest of the dashboard renders | chart card tests |
| Every value zero | `EmptyState` with `chartEmpty`, no empty SVG | chart card tests |
| Extension widget with no `titleKey` | The picker shows the namespaced id, and the guide says to add `titleKey` | `widgetCatalogue.test.ts`, guide |
| Manifest `category` equal to a built in category key | Allowed, the entries group together | `AddWidgetDrawer.test.tsx` |

---

## Assumptions

* The default layout is derived from the entries the session can see, so the cap of four never pushes a visible extension tile out in favour of a gated built in card. In the example app the default `kpi` is `kpi.users` then `schedules.active`.
* The picker titles a built in KPI by the label on its card (`kpiTotalUsers`), not by the sidebar key. `optionKey` goes away with the picker, and the guide's rename table changes to match.
* The page level `LinearProgress` is removed. Every card already shows its own loading state, and the page no longer fetches on behalf of its cards.
* Two places call hooks a fixed number of times instead of conditionally. `WidgetGate` recurses once per catalogue entry, and the catalogue is fixed after startup. `useMonthlyCounts` loops over a constant number of months.

---

## Phase 1, widget catalogue and per user layout

Every card is a catalogue entry, the user can remove, add back and reorder all of them, and the KPI popover is gone. No document field yet.

| Step | Files | Commit |
| --- | --- | --- |
| 1.1 | `features/dashboard/widgetCatalogue.ts(x)`, `builtinWidgets.tsx`, `widgetCatalogue.test.ts`, shell `index.ts` (`BUILTIN_WIDGET_IDS`) | `feat(shell): one dashboard widget catalogue for built in and extension cards` |
| 1.2 | `dashboardLayout.ts`, `useDashboardLayout.ts`, tests. Remove `kpiSelection.ts`, `useDashboardKpis.ts` and their tests. | `feat(shell): per user dashboard layout with migration from the KPI selection` |
| 1.3 | `VisibleWidgets.tsx` and test. Remove `VisibleKpis.tsx`. | `feat(shell): gate every dashboard widget by its flag and permission` |
| 1.4 | `DashboardPage.tsx`, `DashboardRegions.tsx`, `DashboardPage.test.tsx` | `feat(shell): render the dashboard from the layout` |
| 1.5 | `DashboardEditor.tsx`, `EditableTile.tsx`, `AddWidgetDrawer.tsx`, `useDashboardDraft.ts`, `theme.css`, both app catalogues, tests. Remove `KpiPicker.tsx`, `CustomizeWidgetsButton.tsx`, their tests and CSS. | `feat(shell): configure dashboard mode with add, remove, reorder, reset, save and cancel` |

## Phase 2, the document field and the clean slate

| Step | Files | Commit |
| --- | --- | --- |
| 2.1 | `packages/ohs-player-web-core/src/types/portalConfig.ts`, core `index.ts`, `docs/CORE_PUBLIC_API.md` | `feat(core): dashboard field on the configuration document` |
| 2.2 | `config/resolvePortalConfig.ts`, `host/dashboardChecks.ts`, `host/createPortalHost.ts`, tests | `feat(shell): resolve the dashboard layout from the document and check its ids at startup` |
| 2.3 | both `portalConfigSchema.ts` and tests, `public/portal-config.schema.json` | `feat(config): validate the dashboard field in both schemas` |

## Phase 3, chart widgets

| Step | Files | Commit |
| --- | --- | --- |
| 3.1 | `components/ui/BarChart.tsx`, `StackedBar.tsx`, tests, kit and shell `index.ts` | `feat(shell): dependency free bar chart primitives` |
| 3.2 | `useDashboardData.ts`, `monthWindows.ts`, tests | `feat(shell): monthly count searches for dashboard charts` |
| 3.3 | `ChartCard.tsx`, catalogue entries, both catalogues, tests | `feat(shell): chart widgets built from count searches` |

## Phase 4, extension widgets, the example app and the docs

| Step | Files | Commit |
| --- | --- | --- |
| 4.1 | `types/extension.ts`, `validateExtensionManifest.ts` and test, schedules manifest and messages | `feat(core): category and title key on extension widgets` |
| 4.2 | example `public/portal-config.json`, `host.test.tsx` | `feat(example): curated dashboard from the configuration document` |
| 4.3 | `docs/CUSTOMIZING.md`, `docs/EXTENDING.md`, `docs/DEPLOYMENT.md`, `docs/CORE_PUBLIC_API.md`, this file | `docs: configurable dashboard in the customizing, extending and deployment guides` |

---

## Files intentionally not touched

* `features/activity/useRecentActivity.ts` and the audit feature.
* `useResourceStats` and `useRecent` beyond their callers moving into the cards.
* The reference `public/portal-config.json` (D8).
* `DASHBOARD_REGIONS` and `SLOT_NAMES`.

## Verification

Filled in at each phase gate.

## Follow ups

* Server side layout persistence once a backend preference contract exists.
* Per card settings such as a date range.
* Column spans and resizing.
* Drag and drop on top of the keyboard controls.
* Shell defaults for shell message keys, so a second app does not copy every dashboard key.

## Risks

* Position pairing changes rows for a deployment with an unpaired `main` or `side` extension widget. The guides say so.
* Gating lists and charts (D9) hides cards a deployment with a screen switched off saw before.
* Each monthly chart issues six count searches. Four of them on one dashboard is 24 small requests, cached by TanStack Query.
