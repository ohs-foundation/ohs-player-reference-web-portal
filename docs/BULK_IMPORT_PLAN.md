# Bulk import for users and organisations, with Excel upload — implementation plan

Scope: #87 (CSV import for users and organisations on one shared drawer) and #88 (`.xlsx` upload on that drawer), shipped as one branch and one pull request that closes both.
Backend: `ohs-player-reference-backend` `main` at `0b76022`; the contract lives in `src/main/java/dev/ohs/player/bulk/`.
Base branch: `main` at `a966c18`, worktree `../ohs-bulk-import`, branch `feat/bulk-import-users-orgs-excel`. Not stacked on `feat/audit-log-page` (see R5).

Every sprint ends with a Definition of Done (DoD). Do not start the next sprint until every DoD box is ticked.

---

## 0. Analysis

### 0.1 What the web does today

| Piece | Where | Behaviour on `main` |
| --- | --- | --- |
| Hook | `features/locations/useBulkImport.ts` | Hardcodes `customPostStream('locationsBulkImport', form)`. Splits frames on `\n\n`, parses `data:` JSON into an optional bag, updates progress on `processed`, keeps the result on `done`, throws `Import stream ended without a completion event` (hardcoded English) otherwise. Drops `{ error, row }` frames. Two inline comments. |
| Drawer | `features/locations/LocationImportDrawer.tsx` | `accept=".csv,text/csv"`, form id `location-import-form`, footer submit wired with `form=`. `Section` from `users/userFormControls`. Column chips, template download, dropzone button, progress and result sections. |
| Template | `features/locations/importTemplate.ts` | `EXPECTED_COLUMNS`, `buildImportTemplateCsv()`, `downloadImportTemplate()` (`locations-import-template.csv`). |
| Page | `features/locations/LocationsHierarchyPage.tsx` | Header button and the empty-store prompt both sit behind `PermissionGuard permission="bulk-import.manage"`. `onImportComplete` runs `refreshResources('Location')` and `refreshHierarchy()`. No audit write. |
| Config | `config/platform.ts`, `public/portal-config.json` | `permissionMap['bulk-import.manage'] = ['admin', 'bulk-import.manage']`; `customEndpoints.locationsBulkImport = '/api/bulk-import/locations'`. The schema accepts any alias whose path starts with `/`; `resolvePortalConfig.ts:64` merges document over platform key by key. |
| Users, Organisations | `UsersPage.tsx`, `OrganizationsPage.tsx` | Header `actions`: Export (when rows exist) and a create button behind `users.create` / `orgs.create`. Users refresh with `refresh(['Practitioner', 'PractitionerRole'])`. No import. |

### 0.2 Backend contract, verified from source

- **Routes** (`configs/OhsPlayerBackendExtensionSpringConfiguration.java` L122, L157, L168, L195): `/api/bulk-import/organizations`, `/locations`, `/users`, `/user-assignments`. Each has a `MultipartConfigElement("/tmp", 52428800, 52428800, 0)`, so the cap is 50 MiB per file and per request.
- **Gate**: every servlet calls `AuthorizationHandler.require(request, response, "bulk-import", RoleLevel.MANAGE)`, which accepts only the realm role `bulk-import.manage`. It answers `401 "Unauthenticated request"` or `403 "Insufficient permissions. Required: bulk-import.manage"`; `JwtAuthFilter` answers most 401s earlier.
- **Input**: multipart part `file`. `400 "Missing required file part: 'file'"` when absent; `400 "Failed to read uploaded file"` when unreadable or over 50 MiB. Error body is `{ error, timestamp, status }` from `ServletResponseUtil.writeJsonError`, **not** an `OperationOutcome`. `FhirClient.toError` already reads `body.error`.
- **Frames** (`SseResponseHelper`): one `data: <json>\n\n` per frame, no `event:` or `id:` lines, status 200, `text/event-stream`. Exactly three shapes: `{"processed":n,"total":n}`, `{"error":"...","row":n}`, `{"done":true,"processed":n,"failed":n,"total":n}`. `emitError` escapes only `\`, `"` and `\n`; a `\r` or tab in a message reaches the client raw and breaks `JSON.parse`.
- **Users** (`BulkUserImportServlet`): no batching. One progress frame per successful row. The first failing row gets one `error` frame, then `return`. **`emitDone` is never called**, so success is a clean close after the last progress frame. Any exception other than `BulkImportRowException` (Keycloak 409, bad `dob`, bad `gender`) becomes `"An unexpected error occurred processing this row"`.
- **Organisations, Locations**: batches of `BULK_IMPORT_BATCH_SIZE` (default 50). A progress frame after each batch with at least one success. One `error` frame per failed row, then continue, ending with `done`. In `done`, `processed` counts **successes only**; `failed` counts row and FHIR failures.
- **`done` is not guaranteed.** `resolveParentReference` (organisations) and `resolveManagingOrgReference` / `findLocationIdByIdentifier` (locations) call FHIR lookups outside any catch. A timeout there escapes `doPost` after the SSE headers are sent, and the stream closes with no `done`. An empty file (no header line) returns 200 with no frames at all.
- **CSV reader** (`CsvProcessor`): header and rows use `split(",", -1)` and `trim()`. There is no quote support. Header lookup is an exact, case-sensitive `HashMap` after trim. Column order does not matter and unknown columns are ignored. **No header validation up front**: a missing `name` column fails every organisation and location row with `"name is required"`; a missing `username` fails users row 1 with the generic message and stops. **UTF-8 BOM is not stripped**; `trim()` leaves U+FEFF, so the first header key silently misses. Invalid UTF-8 (a CP1252 "CSV" from Excel) throws in `countDataRows` before the stream starts, giving a container 500 with a non-JSON body. `readLine()` handles LF, CR and CRLF.
- **Row numbers and total**: data rows counted from 1 after the header. **Users count blank lines** (`rowNumber++` before `isBlank`); **organisations and locations do not** (`isBlank` first). `total` in all three is `Files.lines().count() - 1`, blank lines included, so `processed` can end below `total`.
- **Users columns** (`processRow` L112–L133): `id`, `username`, `group`, `password`, `is_password_temp`, `source_id`, `first_name`, `last_name`, `email`, `dob`, `gender`, `national_id`, `phone`.
  - `group`: one group **name**, exact match. Unknown → `"Group not found: <name>"`.
  - `is_password_temp`: `true` (case-insensitive) or `1`.
  - `password`: defaults to `{username}123`. `resetPassword` also runs on update, so **re-importing an existing user without a password resets it to `{username}123`**.
  - `dob`: HAPI `DateType`, so `YYYY`, `YYYY-MM` or `YYYY-MM-DD`.
  - `gender`: FHIR code, case-sensitive: `male`, `female`, `other`, `unknown`.
  - Required columns: the README marks `username` and `email` as required; the servlet enforces neither.
- **Organisation columns** (`parseRow` L265–L294): `id`, `name` (required), `source_id`, `is_team` (`true`/`1`), `parent_id`, `parent_name`, `source_parent_id`, `phone`, `email`, `physical_address`, `postal_address`. Parent precedence is `parent_id` > `source_parent_id` > `parent_name`. Parents must precede children in the file or already exist.
- **Location columns** (L327–L337): `id`, `name` (required), `source_id`, `physical_type`, `level`, `longitude`, `latitude`, `parent_id`, `source_parent_id`, `org_id`, `source_org_id`. These match `importTemplate.ts` exactly.
- **README L329** (users): "This endpoint is intended for initial bulk imports and is not meant for updates in production. It does not perform upsert logic beyond the simple `id` and `source_id` resolution described above. To avoid losing data, use the User Management API for ongoing user maintenance."
- **Audit**: the bulk servlets write to the upstream FHIR server with their own HAPI client, bypassing the gateway's BALP interceptor. **No `AuditEvent` exists for any bulk import today**; the portal event added here is the only record.
- **No server-side cancel.** Processing is synchronous on the request thread, and `PrintWriter` swallows write failures. A client that disconnects mid-stream stops receiving frames, but the import runs to the end.

### 0.3 Findings that change the plan

**F1 — The locations flow writes no audit event (ticket text is wrong).** #87 says "as the locations flow does"; `LocationsHierarchyPage` never calls `useWriteAudit`. This PR adds one for all three resources (D1).

**F2 — The users stream never sends `done` (blocking for users).** With today's hook, every successful users import renders `Import stream ended without a completion event`. Completion is declared per template (D2).

**F3 — `done` is required for organisations and locations, not optional.** Their stream can close without `done` when a parent lookup throws. Treating a clean close as success for every alias would report a crashed import as complete. Only the users template completes on close.

**F4 — Row errors are dropped for every resource.** Capturing them is part of the hook generalisation (Sprint 1), not separate work.

**F5 — There is no client-side header check for CSV, and #88 assumes one.** "The same message a CSV with wrong columns gets" has nothing to match today. Both file types get one check (D4).

**F6 — Abort does nothing.** `customPostStream(alias, body)` takes no `AbortSignal`, and `abortRef.current` is never assigned, so `reset()` cancels nothing. Even a real abort would not stop the server (§0.2). Close is blocked while importing (D8).

**F7 — `onComplete` fires on failure.** `LocationImportDrawer` line 130 is `void start(file).then(() => onComplete())`, and `start` swallows its own errors, so the page refreshes after a rejected upload too. The fix is in Sprint 2, with a regression test.

**F8 — An audit without an id loses its description.** `writeAuditEvent` writes `entity: []` when `resourceId` is absent, and `description` lives only on the entity. The bell renders a bare "Created" with no type and no text, on `main` and on `feat/audit-log-page`. D1 makes an additive change.

**F9 — The BOM, quoting and encoding traps are silent server side.** A BOM makes the first column vanish. A quoted CSV (Excel quotes any cell with a comma) splits into shifted columns. A CP1252 file gives a non-JSON 500. The client catches all three before upload (D4, D6, §Edge cases).

**F10 — The locations drawer test pins the `locations*` keys and the no-argument template builder.** It cannot stay green with only import paths edited once the keys are resource neutral (D9).

**F11 — `PermissionGuard` is a library export, not a shell one.** The brief lists it under the shell; it comes from `ohs-player-web-core` (`src/index.ts:56`), which is how the pages already import it.

**F12 — Re-importing users resets passwords.** `password` blank on an update resets it to `{username}123`. The users warning copy states it (Sprint 3), and a backend issue is filed.

### 0.4 Where the new code sits

```
UsersPage / OrganizationsPage / LocationsHierarchyPage   (header action inside PermissionGuard bulk-import.manage)
  └─ features/bulk-import/BulkImportDrawer               (one drawer, driven by an ImportTemplate)
       ├─ importFile.ts   → prepareUpload(file, template)  (type, size, UTF-8, BOM, header, quoted cells → a CSV File)
       │    └─ workbookToCsv.ts  → import('read-excel-file/browser')  (lazy chunk, first sheet, cells → CSV text)
       ├─ useBulkImport(template)  → useFhirClient().customPostStream(template.alias, FormData{file})
       │                               → POST {gatewayRoot}/api/bulk-import/{users|organizations|locations}
       │                               → SSE frames → ImportFrame union → ImportOutcome
       ├─ useWriteAudit()           (one summary AuditEvent when the server reported work)
       └─ onComplete()  → page refresh (useRefreshResources, plus refreshHierarchy for locations)
```

Everything new is in `apps/ohs-player-web`. The only `packages/` edit is the additive `writeAuditEvent` change from D1.

**Ladder tier.**
- **Tier 1:** the three aliases (`usersBulkImport`, `organizationsBulkImport`, `locationsBulkImport`), declared in `platform.ts` and `portal-config.json`, so a deployment can point any of them at another path. Also tier 1: the permission (`permissionMap['bulk-import.manage']`; mapping it to `[]` hides all three import actions) and every string (`messages`).
- **Tier 4:** the drawer, hook, templates and parser, in the reference app. Reasons:
  - The column set is fixed by the backend contract, so it is not a configuration choice.
  - Tier 2 carries no behaviour.
  - Tier 3 cannot add an action to a built-in page header: the only slot is `users.rowActions`, and adding header slots is a shell contract change this ticket does not need.
- **What deployments gain:** users and organisations import, both switchable and re-pointable without code.
- **What they lose:** fourteen `locations*` drawer message keys are renamed to `bulkImport*` (D9). A deployment that overrides them in `messages` must rename them. This goes in the PR as a migration note.

---

## Decisions to lock in Sprint 0

All ten were answered in session on 28 September 2026.

| # | Decision | Locked outcome |
| --- | --- | --- |
| D1 | Audit event shape | **(b)** Additive change to `writeAuditEvent`: with no `resourceId` but a `description`, write one entity with `type` and `description` and no `what`. Action `create`. Bell on `main` and on `feat/audit-log-page`: "Created" plus the description line. Textually conflicts with that branch's `entity.type` hunk; resolve by keeping its `RESOURCE_TYPES_SYSTEM` coding. That coding also makes imports filterable by `entity-type`. |
| D2 | Users stream completion | **(c)** Each template declares `completion: 'done' \| 'close'`: users `close`, the other two `done`. A backend issue is filed to add `emitDone` to `BulkUserImportServlet`. |
| D3 | Workbook parser | **`read-excel-file` 9.3.10**, MIT. `read-excel-file/browser` `readSheet(file)`. About 19 KB gzipped / 68 KB minified (bundlejs, `readSheet` only). Deps are `fflate`, `saxen`, `unzipper-esm` and `worker-f`; `npm audit` reports 0 vulnerabilities. Last release 10 Aug 2026. Rejects `.xls` with `XLS_FILE_NOT_SUPPORTED`. Rejected: SheetJS (npm `xlsx` 0.18.5 carries unpatched CVE-2023-30533 and CVE-2024-22363; the fixed 0.20.3 ships only as a tarball from `cdn.sheetjs.com`, mini build 86 KB gzipped) and `exceljs` 4.4.0 (about 272 KB gzipped, Node-oriented deps, no release since Dec 2024). |
| D4 | Header check | **(a)** CSV and `.xlsx` alike: reject before upload when a required column is missing, with one message listing the missing names. Order is free and extra columns are allowed. Matching is case-sensitive like the backend. The BOM is stripped first. |
| D5 | Folder | **(a)** `apps/ohs-player-web/src/features/bulk-import/`. |
| D6 | Unsendable cells | Reject a workbook cell containing `,`, `\n` or `\r`, naming row and column. Also reject a CSV whose data or header field starts with `"`, which marks a quoted cell. No stripping, no quoting. |
| D7 | Row error display | Each error listed as "Row N: message" with the backend's row number as sent. The first 10 are shown, then "and N more". A line above states "Stopped at row N; later rows were not imported" (users) or "Continued past failed rows" (organisations, locations). |
| D8 | Closing mid-import | Blocked while `phase === 'uploading'`: the close button and Cancel are disabled, and `close()` is a no-op, which covers Escape and overlay clicks. On unmount (route change), a run-id guard drops the late result and the body reader is cancelled. The server still finishes that import unaudited; this is a known gap. |
| D9 | Locations test and keys | Neutral `bulkImport*` keys with the same English copy. Form id is `${template.id}-import-form`; the locations template id stays `location`, so `location-import-form` is kept. The test moves beside the drawer, calls `buildImportTemplateCsv(locationTemplate)` and asserts the neutral keys. The header string, `name*` chip and `form=` assertions are kept verbatim. The retired `locations*` drawer keys are deleted; `locationsImport` (page button) stays. |
| D10 | Users required columns | `username` and `email` (README contract, matching the portal's own create form). The servlet's lack of enforcement is filed as a backend issue. |

**Derived rules (from D1 and D8, stated so review can object):**
- **Audit rule.** One audit event is written when the server reported work, meaning the stream reached `done`, closed cleanly on the users template, or ended early after at least one progress frame. No event is written when nothing reached the server: a non-`ok` response, a stream with no frames, a file rejected client side, or an unmounted run. An interrupted stream with `processed > 0` is audited as interrupted, because those rows exist.
- **Refresh rule.** `onComplete` (page refresh) follows the same rule, which fixes F7.

---

## Decisions as implemented

| # | Planned | As built |
| --- | --- | --- |
| Hook failure kinds | `http`, `empty`, `interrupted` | `request` instead of `http`, because a network error also lands there. No separate `rowErrors` state: row errors travel on `result` and on the `interrupted` failure. |
| Upload gate | `importFile.ts`, one problem type | `importMessages.ts` holds `FileProblem` and every drawer message helper, shared by `importFile.ts`, `workbookToCsv.ts` and the drawer. `workbookUnreadable` became a generic `unreadable`, so a failed CSV read is not reported as a bad workbook. |
| Quoted cells (D6) | Rejected in CSV and workbook | Rejected in CSV only. A workbook cell starting with `"` reaches the backend as a literal quote, which the contract carries correctly; commas and line breaks in workbook cells are still rejected. |
| Reading bytes | `Blob.arrayBuffer` / `text` | `FileReader`, one read per file. jsdom's `File` has no `arrayBuffer()`, and the parser takes the `ArrayBuffer` directly. |
| Template shape | `completion` and `onRowError` | `completion` only. The stopped or continued statement comes from the result (`stoppedAtRow`), so `onRowError` was never read and was dropped. |
| Sprint 4 spike | Three questions | `readSheet` from `read-excel-file/browser` runs under jsdom when given an `ArrayBuffer`. Date cells come back as UTC midnight (`1990-04-12T00:00:00.000Z`). Trailing empty rows are already dropped. A non-workbook throws `InvalidInputError` `FILE_NOT_SUPPORTED`. |
| Audit write failure | Not specified | The import still counts as done; `useImportAudit` shows `bulkImportAuditFailed` through the status bar. |
| Accessibility | `aria-live` region | `<output>` elements (implicit `role="status"`) carry the progress text and the result heading. The hidden file input gained an `aria-label`: axe flagged it, and the locations drawer had the same gap on `main`. |
| Chunks (gzip) | Measure | Main `index` 194,940 → 195,799 B (+859 B of message copy). Parser chunk 19,263 B, reached only through `import()` from the drawer chunk (6,279 B). |

## Verification against the live local stack

Run on 28 September 2026 against HAPI `:8080`, Keycloak `:8090` (realm `ohs`) and the real gateway plugin (`ohs-gateway`, JAR built from backend `0b76022`), from the worktree dev server, in headless Chrome, signed in as `admin-user`. HAPI started empty. `admin-user` in the running realm lacked `bulk-import.manage` and `location-hierarchy.view` (the realm file grants them, the running database did not), so both were added by hand for the session.

| # | Probe | Outcome |
| --- | --- | --- |
| 1 | Each resource as CSV, then the same rows as `.xlsx` | Organisations 3/0/3 both ways; users 2/0/2 both ways (users stream closed without `done`, reported complete); locations 2/0/2 both ways. One `AuditEvent` per run. |
| 2 | Users CSV, unknown group on row 3 of 5 | "Import stopped", imported 2, failed 1, total 5, "Stopped at row 3", "Row 3: Group not found: no-such-group". |
| 3 | Organisations CSV, `parent_id` that does not exist on row 3 | **Backend defect.** Raw stream: `data: {"processed":1,"total":4}` then a bare `{"error":"Invalid or expired token",…,"status":401}` body, no `done`. The exception escaped the servlet after the SSE headers were sent and the container's error dispatch wrote a 401 into the open stream. The drawer showed "The import stopped before it finished. 1 row(s) were imported", refreshed, and audited "ended before completion: 1 imported". Filed as B5. |
| 4 | Locations CSV with BOM and CRLF (`name` first); organisations CSV with BOM and CRLF; CP1252 CSV | BOM files imported 2/0/2 and 3/0/3 (without the strip, every locations row would fail `name is required`). The CP1252 file was stopped before upload with the "not UTF-8" message. Trailing empty workbook rows: `orgs-valid.xlsx` carried one, imported 3/0/3. |
| 5 | Workbook with `Afya House, Nairobi` in `physical_address` | "Row 2, column physical_address contains a comma or a line break…". No request to `/api/bulk-import/*` was sent. |
| 6 | `manager-user` (no `bulk-import.manage`) | No Import action on Users, Organisations or Locations. A hand-built request with that token: `403 {"error":"Insufficient permissions. Required: bulk-import.manage",…}`. |
| 7 | Close mid-stream (40-row users import) | Escape and the close button did nothing (close disabled) at "Processing 6 of 40 (15%)". The run finished 40/0/40. Reopened drawer: idle, Start disabled, no file. |
| 8 | Activity bell | Each import renders as "Created", "admin-user · 3 min. ago", then the description, e.g. "Bulk import of users-unknown-group.csv: 2 imported, 1 failed, 5 rows, stopped at row 3". |
| 9 | Chunks (gzip) | Main `index` 194,940 → 195,799 B. Parser chunk 19,263 B, loaded only by `import()` from the drawer chunk, not listed in `index.html`. |
| 10 | Light and dark, 390 px, keyboard, axe | axe with colour contrast on: 0 violations for all three drawers, idle and with a result, light and dark, once the open animation settles (captures mid-animation report contrast on the translucent panel). Keyboard only: focus the dropzone, Enter opens the file chooser, Tab reaches Start Import, Enter runs it to "Import complete". At 390 px the drawer is full width; the page behind already overflows on `main` because the top bar's account menu ends at 432 px (unrelated, W7). |
| 11 | Example app | Builds; 10/10 tests. |

## Edge cases

| Case | Handling | Where |
| --- | --- | --- |
| Non-`ok` before any frame (`400`, `401`, `403`, `5xx`), `{ error }` body | `client.errorFromResponse(res)` → `toErrorMessage` → drawer error block. No audit, no refresh. | hook |
| 500 with a non-JSON body (invalid UTF-8 reached the server) | `toError` falls back to the plain text or `HTTP 500`. The UTF-8 check below prevents it. | hook |
| Stream closes with no frames | `bulkImportStreamEmpty` error. No audit. | hook |
| Users: progress frames, then clean close | Success. `processed` and `total` come from the last progress frame; `failed` is 0. | hook |
| Users: one `error` frame, then close | `outcome: 'stopped'`, `stoppedAtRow = row`, `failed = 1`. `total` comes from the last progress frame, or is unknown (shown "—") when row 1 failed. | hook |
| Organisations or locations: `error` frames between progress, `done` with `failed > 0` | `outcome: 'continued'`, counts from `done`, errors listed. | hook |
| Organisations or locations: close without `done` after progress | `bulkImportStreamInterrupted` with the last processed count. Audited and refreshed, because rows exist. | hook, drawer |
| Frame split across two `reader.read()` chunks | The existing buffer handling is kept and covered by a test. | hook |
| `\r` or a tab inside an error message | Control characters `\u0000`–`\u001f` are replaced with a space before `JSON.parse`, so the users stop frame is never lost. | hook |
| Unknown frame shape or invalid JSON | Ignored. The frame parser returns `null`. | hook |
| UTF-8 BOM | Stripped from the text that is checked and uploaded. | `importFile.ts` |
| CRLF line endings | Normalised to `\n` for the checks; the backend's `readLine` handles either. | `importFile.ts` |
| CSV not valid UTF-8 | `TextDecoder('utf-8', { fatal: true })` fails → `bulkImportNotUtf8` ("Save as CSV UTF-8"). | `importFile.ts` |
| `.csv` that is really a workbook (starts with `PK\x03\x04`) | `bulkImportWorkbookAsCsv`. | `importFile.ts` |
| `.xls`, or any other extension | `bulkImportFileType` (".csv or .xlsx"). `accept` narrows the picker but drop bypasses it, so the extension is checked in code. | `importFile.ts` |
| File size | CSV: 50 MiB, the gateway's multipart cap, so the user reads a clear message instead of `400 "Failed to read uploaded file"`. `.xlsx`: 10 MiB, bounding in-browser unzip memory (a 10 MiB workbook is well past 100k rows). Named constants in `importFile.ts`. | `importFile.ts` |
| Header only, or no data rows | `bulkImportNoRows`. Without it the backend would run an empty import. | `importFile.ts` |
| Workbook first sheet empty | `bulkImportNoRows`. | `workbookToCsv.ts` |
| Workbook with several sheets | First sheet only. The dropzone hint says so. | drawer copy |
| Trailing empty workbook rows | Dropped. A blank row in the middle becomes an empty line, which the backend skips; this keeps users row numbers aligned with the sheet. | `workbookToCsv.ts` |
| Numeric cells | Serialised without exponent or grouping: `toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 15 })`. Leading zeros lost to a number cell (phone) cannot be recovered; the template hint says to format such columns as text. | `workbookToCsv.ts` |
| Date cells | `YYYY-MM-DD` from the `Date`'s UTC fields (Sprint 4 spike confirms `read-excel-file` builds UTC dates). Covers users `dob`. | `workbookToCsv.ts` |
| Boolean cells | `true` / `false`; `is_team` and `is_password_temp` accept `true`. | `workbookToCsv.ts` |
| Workbook cell with `,`, `\n` or `\r` | Rejected with `bulkImportUnsupportedCell` naming the sheet row and column (D6). | `workbookToCsv.ts` |
| CSV field starting with `"` | Rejected with `bulkImportQuotedCsv` naming the row (D6). | `importFile.ts` |
| Corrupt or unreadable workbook | `bulkImportWorkbookUnreadable` naming the file. No upload. | `workbookToCsv.ts` |
| User without `bulk-import.manage` | The action is hidden by `PermissionGuard`. A crafted request gets `403 "Insufficient permissions. Required: bulk-import.manage"`, which reaches the error block verbatim. | page, hook |
| Double submit | Submit is disabled while uploading (kept). | drawer |
| Close mid-stream | Blocked (D8). After the stream ends, close resets to idle. | drawer |
| Navigate away mid-stream | The effect cleanup bumps the run id and cancels the reader. No audit, no state writes after unmount. | hook |
| StrictMode double mount | The hook has no mount effect besides the cleanup; the drawer is always mounted, as today. | hook |
| Users row numbers vs organisations and locations | Shown as sent. The copy says "data row, counting from the first row under the header". | drawer |

---

## Assumptions

1. The backend on `0b76022` is the contract. The README's space-padded SSE examples and "Required" flags are documentation, not behaviour (§0.2).
2. `processed` in `done` is successes only. The result section labels it "Imported", not "Processed", so partial runs read truthfully.
3. The audit `description` is stored data in English, as existing audit writes do (`OrganizationFormDrawer.tsx:175`), not UI copy.
4. Users are audited as `Practitioner`, the FHIR type the import writes. The Keycloak user has no FHIR type.
5. The organisations import touches only `Organization`, so the refresh is `['Organization']`. The users import writes `Practitioner` and Keycloak group membership; the page's existing `refresh(['Practitioner', 'PractitionerRole'])` is reused.
6. `read-excel-file/browser` runs under jsdom for the fixture test. If it needs a Worker jsdom lacks, the fixture test switches to `read-excel-file/universal` in test setup only, and `rowsToCsv` carries the unit coverage (Sprint 4 spike).
7. No feature flag. `bulk-import.manage` is the switch; a deployment maps it to `[]` to hide import. If review wants a flag, that is four edits (`FLAG_NAMES`, `env.ts`, `platform.ts`, `.env.example`) and a new question.
8. No Figma frame covers the users or organisations import. The drawer keeps the locations layout, and the design mismatch is flagged in the PR.

---

## Sprint 0 — Decisions and backend alignment (no code)

**Goal:** lock D1 to D10 and open the backend issues so the web can ship without waiting on them.

Tasks
- D1 to D10 are locked (table above).
- Draft backend issues from `.github/ISSUE_TEMPLATE/task--issue--template.md` (filed in Sprint 5 once the PR number exists; see Follow-ups B1 to B8).
- Record the baseline reference app chunk sizes: `pnpm build --filter=ohs-player-web`, then list `apps/ohs-player-web/dist/assets/*.js` with gzip sizes.

Files touched: none.

Failure modes to watch
- Starting Sprint 1 with a decision unrecorded.

DoD
- [x] D1 to D10 answered in session.
- [x] Baseline chunk sizes saved to the scratchpad for the PR.

---

## Sprint 1 — Hook generalisation, row errors, per-template completion, aliases

**Goal:** one stream reader for three aliases that reports progress, row errors and a typed outcome, with the users stream completing on close.

Files
- `ohs-player-web` `src/features/bulk-import/useBulkImport.ts`: moved from `features/locations/` via `git mv`. Inline comments removed.
- `ohs-player-web` `src/features/bulk-import/importStream.ts`: new, pure. `parseFrame(line): ImportFrame | null` and `outcomeFromFrames(frames, completion)`.
- `ohs-player-web` `src/features/bulk-import/importStream.test.ts`: new.
- `ohs-player-web` `src/features/bulk-import/useBulkImport.test.tsx`: new; the first test of the hook itself.
- `ohs-player-web` `src/config/platform.ts`: `usersBulkImport: '/api/bulk-import/users'`, `organizationsBulkImport: '/api/bulk-import/organizations'`.
- `ohs-player-web` `public/portal-config.json`: the same two aliases.
- `docs/DEPLOYMENT.md` §4: the `customEndpoints` row names the built-in aliases, including the three bulk import ones.

Types

```ts
export type ImportFrame =
  | { kind: 'progress'; processed: number; total: number }
  | { kind: 'error'; message: string; row: number }
  | { kind: 'done'; processed: number; failed: number; total: number };

export interface RowError { row: number; message: string }

export interface ImportResult {
  processed: number;
  failed: number;
  total: number | null;
  rowErrors: RowError[];
  outcome: 'completed' | 'stopped' | 'continued';
  stoppedAtRow?: number;
}

export type ImportFailure =
  | { kind: 'http'; message: string }
  | { kind: 'empty' }
  | { kind: 'interrupted'; processed: number; rowErrors: RowError[] };

export type ImportOutcome = { ok: true; result: ImportResult } | { ok: false; failure: ImportFailure };
```

Hook shape: `useBulkImport({ alias, completion }): { phase, progress, rowErrors, result, failure, start(file: File): Promise<ImportOutcome | null>, reset }`. `start` resolves `null` when the run was superseded by unmount. The template object satisfies the argument, so pages pass `template` directly.

Rules in `outcomeFromFrames`
- `done` seen: result from `done`, `outcome = failed > 0 ? 'continued' : 'completed'`.
- No `done`, `completion === 'close'`, at least one frame: `processed` and `total` from the last progress frame (`total: null` if none). An error frame gives `outcome = 'stopped'`, `stoppedAtRow`, `failed = 1`; otherwise `completed`.
- No `done`, `completion === 'done'`, at least one progress frame: `interrupted`.
- No frames: `empty`.

Tests
- `importStream.test.ts`:
  - each frame shape
  - a `data:` line with a raw `\r` in the message still parses
  - invalid JSON returns `null`
  - an unknown shape returns `null`
  - the four `outcomeFromFrames` branches, including a users run stopped at row 6 (processed 5, failed 1, total 10, `stoppedAtRow` 6)
- `useBulkImport.test.tsx`: `vi.mock('ohs-player-web-core', importActual)` with `useFhirClient` returning `customPostStream` that resolves `new Response(ReadableStream)` of encoded frames. Cases:
  - organisations success with `done`
  - organisations with two `error` frames and `done` `failed: 2`
  - users success with no `done`
  - users stopped by one `error` frame
  - a non-`ok` `403` `{ error }` body surfaces the gateway text via `errorFromResponse`
  - a frame split across two chunks
  - no frames → `empty`
  - organisations close without `done` → `interrupted`
  - unmount mid-stream: the reader is cancelled and `start` resolves `null`

Failure modes to watch
- Applying close-completion to organisations or locations (F3).
- Losing the buffer handling while restructuring.
- `setState` after unmount.

DoD
- [ ] Aliases in `platform.ts` and `portal-config.json`; `pnpm config:check` passes.
- [ ] `docs/DEPLOYMENT.md` §4 updated.
- [ ] No inline comments in the hook; frames are a discriminated union, not an optional bag.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` green.

---

## Sprint 2 — Template definitions and the shared drawer, locations moved onto it

**Goal:** one drawer driven by a template, locations running on it with unchanged behaviour plus the row error list, and F7 fixed.

Files
- `ohs-player-web` `src/features/bulk-import/importTemplates.ts`: replaces `features/locations/importTemplate.ts`. Exports:
  - `ImportTemplate`
  - `locationTemplate` (the columns and example rows unchanged)
  - `buildImportTemplateCsv(template)`
  - `downloadImportTemplate(template)`
- `ohs-player-web` `src/features/bulk-import/BulkImportDrawer.tsx`: replaces `LocationImportDrawer.tsx`. Keeps `ColumnsSection`, `ProgressSection` and `ResultSection`, and adds `RowErrorsSection`.
- `ohs-player-web` `src/features/bulk-import/BulkImportDrawer.test.tsx`: the moved and adapted `LocationImportDrawer.test.tsx` (D9) plus new cases.
- `ohs-player-web` `src/features/locations/LocationsHierarchyPage.tsx`: imports `BulkImportDrawer` with `template={locationTemplate}`.
- `ohs-player-web` `src/features/locations/LocationsHierarchyPage.test.tsx`: the mock path moves to `../bulk-import/BulkImportDrawer`.
- `ohs-player-web` `src/i18n/appMessages.ts`: adds the `bulkImport*` keys and deletes the fourteen retired `locations*` drawer keys (`locationsDropzone`, `locationsDropzoneHint`, `locationsUploadFile`, `locationsExpectedColumns`, `locationsTemplateHint`, `locationsDownloadTemplate`, `locationsStartImport`, `locationsImportProgress`, `locationsImportComplete`, `locationsImportPartial`, `locationsImportTotal`, `locationsImportProcessed`, `locationsImportFailed`, `locationsImportFailedNotice`). `locationsImport` and `locationsImportTitle` stay.
- **Confirm first:** delete `features/locations/LocationImportDrawer.tsx`, `LocationImportDrawer.test.tsx` and `importTemplate.ts` (done as `git mv` where the content carries over).

Template shape

```ts
export interface ImportTemplate {
  id: 'user' | 'organization' | 'location';
  alias: string;
  auditResourceType: 'Practitioner' | 'Organization' | 'Location';
  titleKey: string;
  warningKey?: string;
  fileName: string;
  columns: readonly { key: string; required?: boolean }[];
  exampleRows: readonly (readonly string[])[];
  completion: 'done' | 'close';
  onRowError: 'stop' | 'continue';
}
```

Drawer props: `{ template, open, onClose, onComplete }`. Title, form id, template file name and warning all come from `template`.

Drawer behaviour changes (each tested)
- `onComplete` only under the refresh rule (F7).
- `RowErrorsSection` per D7.
- Close blocked while uploading (D8): the close button and Cancel are disabled, and `close()` returns early.
- An `aria-live="polite"` region carries the progress text and the result heading; `LinearProgress` gets `label` set to the progress text.
- The hardcoded `Import stream ended without a completion event` becomes `bulkImportStreamInterrupted` / `bulkImportStreamEmpty`.

Tests (`BulkImportDrawer.test.tsx`, `useTranslation` and `./useBulkImport` mocked as today)
- **D9 carry-over:**
  - exact locations header `name,id,physical_type,level,latitude,longitude,source_id,parent_id,source_parent_id,org_id,source_org_id`
  - 11 cells per example row
  - `name*` chip
  - template button
  - `form="location-import-form"`
- success result with counts
- `continued` with three row errors listed
- more than 10 errors → "and N more"
- `interrupted` and `http` failure render the error block
- close is a no-op while `phase === 'uploading'`
- `onComplete` is not called on an `http` failure (**the F7 regression test**)
- `axe` clean in idle and result states

Failure modes to watch
- Rewording English copy while renaming keys.
- Breaking `LocationsHierarchyPage.test.tsx`'s `finish-import` mock.
- Leaving a `locations*` key referenced.

DoD
- [ ] Deletions confirmed in session before running.
- [ ] `grep -rn "LocationImportDrawer\|importTemplate'\|locationsDropzone" apps/ docs/` returns nothing.
- [ ] Locations import manually unchanged apart from the error list (Sprint 5 probe).
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` green.

---

## Sprint 3 — Users and organisations wiring, warning, audit, refresh

**Goal:** Import actions on Users and Organisations, gated by `bulk-import.manage`, and one audit event per import that reached the server, for all three resources.

**Confirm-first gate:** the `packages/` edit below is asked for in session before it is made.

Files
- `ohs-player-web-core` `src/audit/writeAudit.ts`: additive (D1). `entity` becomes the existing block when `resourceId` is set; `[{ type, description }]` when only `description` is set; else `[]`. The `type` object is shared, not duplicated. JSDoc on `AuditParams.resourceId` states the summary form.
- `ohs-player-web-core` `src/audit/writeAudit.test.ts`: new cases for description only, id plus description, and neither.
- `docs/CORE_PUBLIC_API.md`: the audit row notes that a description without an id records a summary entity.
- `ohs-player-web` `src/features/bulk-import/importTemplates.ts`: `userTemplate` and `organizationTemplate`.
  - `userTemplate`: columns in servlet order `id`, `username`*, `first_name`, `last_name`, `email`*, `group`, `password`, `is_password_temp`, `dob`, `gender`, `national_id`, `phone`, `source_id`; `completion: 'close'`, `onRowError: 'stop'`, `warningKey: 'usersImportWarning'`, `fileName: 'users-import-template.csv'`.
  - `organizationTemplate`: `id`, `name`*, `source_id`, `is_team`, `parent_id`, `parent_name`, `source_parent_id`, `phone`, `email`, `physical_address`, `postal_address`; `completion: 'done'`, `onRowError: 'continue'`, `fileName: 'organizations-import-template.csv'`.
  - Example rows contain no commas and order parents before children.
- `ohs-player-web` `src/features/bulk-import/useImportAudit.ts`: new. Wraps `useWriteAudit` and builds the description, e.g. `Bulk import of organizations.csv: 48 imported, 2 failed, 50 rows` or `… stopped at row 6`.
- `ohs-player-web` `src/features/bulk-import/BulkImportDrawer.tsx`: calls the audit under the audit rule and renders the `warningKey` notice.
- `ohs-player-web` `src/features/users/UsersPage.tsx`: an Import button (`IconUpload`, `usersImport`) inside `PermissionGuard permission="bulk-import.manage"` before Add user; `BulkImportDrawer template={userTemplate}`; `onComplete` → `refresh(['Practitioner', 'PractitionerRole'])`.
- `ohs-player-web` `src/features/organizations/OrganizationsPage.tsx`: the same with `organizationsImport`, `organizationTemplate`, `refresh(['Organization'])`.
- `ohs-player-web` `src/features/users/UsersPage.test.tsx` and `src/features/organizations/OrganizationsPage.test.tsx`: `PermissionGuard` mocked to honour a `granted` set. One case shows the import action with `bulk-import.manage` and hides it without.
- `ohs-player-web` `src/i18n/appMessages.ts`: `usersImport`, `usersImportTitle`, `usersImportWarning`, `organizationsImport`, `organizationsImportTitle`.

`usersImportWarning` copy (README L329 plus F12): "For initial loads only. Use user management for changes to existing users: re-importing a user without a password resets it to the username followed by 123."

Tests
- `writeAudit.test.ts` (above).
- Drawer: users warning shown; audit called once on success with `resourceType: 'Practitioner'`; not called on `http` failure or `empty`; called on `interrupted` with `processed > 0`.
- `importTemplates.test.ts`: exact users and organisations header strings against the servlet column lists above.
- Page permission cases.

Failure modes to watch
- Duplicating the entity `type` block in `writeAudit.ts`.
- The app building against a stale core `dist`.
- The example app breaking on the new audit shape.

DoD
- [ ] Library change confirmed in session; `pnpm build --filter=ohs-player-web-core` run.
- [ ] `pnpm bundle:check` passes.
- [ ] `pnpm build --filter=ohs-player-web-example && pnpm test --filter=ohs-player-web-example` green.
- [ ] `docs/CORE_PUBLIC_API.md` updated.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` green.

---

## Sprint 4 — Workbook support, header and cell checks

**Goal:** `.xlsx` and `.csv` both pass one client-side gate and reach `useBulkImport` as a checked UTF-8 CSV file.

**Confirm-first gate:** adding `read-excel-file@9.3.10` to `apps/ohs-player-web` dependencies is asked for in session.

Spike first (half a step, result recorded here)
- Whether `readSheet` from `read-excel-file/browser` works under jsdom.
- That date cells come back as UTC `Date`s.
- The lazy chunk name and size in `vite build`.

Files
- `ohs-player-web` `package.json` and `pnpm-lock.yaml`: `read-excel-file` `9.3.10` (exact pin).
- `ohs-player-web` `src/features/bulk-import/importFile.ts`: new. `prepareUpload(file, template): Promise<{ ok: true; file: File } | { ok: false; problem: FileProblem }>` runs, in order:
  - type
  - size
  - bytes
  - workbook sniff
  - UTF-8 decode
  - BOM strip
  - newline normalise
  - quoted field check
  - header check
  - has data rows
  - and, for `.xlsx`, `workbookToCsv` first
  
  `FileProblem` is a discriminated union the drawer translates.
- `ohs-player-web` `src/features/bulk-import/workbookToCsv.ts`: new. `const { readSheet } = await import('read-excel-file/browser')` inside the function, and `rowsToCsv(rows): { ok: true; csv } | { ok: false; problem }` exported pure: cell serialisation, D6 rejection, trailing row trim.
- `ohs-player-web` `src/features/bulk-import/importFile.test.ts`, `workbookToCsv.test.ts`: new.
- `ohs-player-web` `src/features/bulk-import/__fixtures__/`: `valid-organizations.xlsx`, `wrong-header.xlsx`, `comma-cell.xlsx`, `users-dob.xlsx`, built once with LibreOffice and checked in; a README line says how.
- `ohs-player-web` `src/features/bulk-import/BulkImportDrawer.tsx`:
  - `accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"`
  - runs `prepareUpload` on submit before `start`
  - shows the problem in the error block
  - hint names first-sheet-only and text-formatted id columns
- `ohs-player-web` `src/i18n/appMessages.ts`: `bulkImportFileType`, `bulkImportFileTooLarge`, `bulkImportNotUtf8`, `bulkImportWorkbookAsCsv`, `bulkImportMissingColumns`, `bulkImportUnsupportedCell`, `bulkImportQuotedCsv`, `bulkImportNoRows`, `bulkImportWorkbookUnreadable`.

Tests
- `rowsToCsv`:
  - numbers without exponent
  - `Date` to `YYYY-MM-DD`
  - booleans
  - trailing blank rows dropped, middle blank kept as an empty line
  - comma, `\n` and `\r` cells rejected with row and column
- `prepareUpload`:
  - BOM stripped
  - CRLF accepted
  - missing `name` listed
  - extra column accepted
  - `Name` (wrong case) reported missing
  - quoted field rejected
  - header only rejected
  - `.xls` rejected
  - a zip named `.csv` rejected
  - invalid UTF-8 rejected
  - over-size rejected
- Fixtures: a valid workbook produces the same CSV as its CSV twin; wrong header; comma cell; a non-spreadsheet file (`.txt`); users `dob` date cell.
- Drawer: a wrong-header CSV and a wrong-header workbook show the identical message.

Failure modes to watch
- A static import of `read-excel-file` anywhere pulling it into the main chunk.
- Timezone-shifted dates.
- `Blob.arrayBuffer`/`text` missing in jsdom (use `new Response(blob)` if so).

DoD
- [ ] Dependency confirmed in session; licence (MIT) and version recorded for the PR.
- [ ] `vite build` shows `read-excel-file` only in a lazy chunk. Main chunk delta recorded against the Sprint 0 baseline.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` green.

---

## Sprint 5 — Verification, docs, pull request

**Goal:** prove the three imports against the real gateway, then open one PR that closes #87 and #88.

Stack: `docker compose up -d hapi-fhir keycloak ohs-info-gateway` with `OHS_GATEWAY_IMAGE` set to the real gateway (the bundled nginx has no `/api/*` handler), `FHIR_BASE_URL=http://localhost:8080/fhir pnpm seed`, sign in as `admin-user/admin`.

Probes (record each outcome in the PR)
1. Each resource with a valid CSV, then the same rows as `.xlsx`. Processed, failed and total match.
2. Users CSV with an unknown group on row 3 of 5 → "Row 3: Group not found: …", "Stopped at row 3", imported 2.
3. Organisations CSV with a missing parent on one row → error listed, "Continued", `done` counts shown.
4. CSV with a BOM; a CRLF CSV saved by Excel on Windows (as CSV UTF-8, and once as plain CSV to hit the UTF-8 message); a workbook with trailing empty rows.
5. Workbook with a comma in `physical_address` → rejected before upload, cell named.
6. A user without `bulk-import.manage` (add one by hand in Keycloak for the session): action hidden on all three pages. A hand-crafted `curl` with that token gets `403` with the gateway text.
7. Try to close mid-stream → blocked. After the run, close and reopen → idle. Import again.
8. The bell shows "Created" plus the import description after each run. If `feat/audit-log-page` has merged: rebase, re-run, and check the audit log page row and its `entity-type` filter.
9. Chunk sizes before and after, with the lazy chunk listed separately.
10. Light and dark, narrow viewport, keyboard-only file pick and submit, a screen reader announcing progress and result, axe.
11. Example app builds and passes.

Docs
- `docs/DEPLOYMENT.md` §4 (Sprint 1).
- `docs/CORE_PUBLIC_API.md` (Sprint 3).
- `docs/CUSTOMIZING.md`: one line under messages noting the renamed import keys for deployments that override them.

PR
- Follows `.github/PULL_REQUEST_TEMPLATE.md`: "Fixes #87", "Fixes #88", CI checklist, docs checkbox.
- Body:
  - ladder tier
  - parser licence and sizes
  - the chunk table
  - probe outcomes
  - the D1 conflict note for `feat/audit-log-page`
  - the renamed-keys migration note
  - ticket vs code mismatches (F1, F2, F5, F7)
  - the design mismatch (no Figma frame for the users and organisations import)
- No attribution lines.

DoD
- [ ] `pnpm build` (full turbo), `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm bundle:check`, `pnpm config:check` green on Node 22.
- [ ] Example app build and test green.
- [ ] Probes 1 to 11 recorded.
- [ ] Backend issues B1 to B8 filed and linked from the PR.
- [ ] End-of-task summary delivered.

---

## Files intentionally not touched

- `packages/ohs-player-web-core/src/client/FhirClient.ts`: no `signal` on `customPostStream` (D8 made it unnecessary).
- `packages/ohs-player-web-shell/**`: no dropzone primitive (no second shell screen needs one), no header slot, no change to `ActivityList`.
- `packages/ohs-player-web-core/src/index.ts`, `packages/ohs-player-web-shell/src/index.ts`: no new exports.
- `config/portalConfigSchema.ts`, `FLAG_NAMES`, `env.ts`, `.env.example`: no new field, flag or `VITE_*`.
- `apps/ohs-player-web-example/**`: run, not edited.
- The users create wizard, `OrganizationFormDrawer`, and the hierarchy page beyond the import wiring.
- `docker-compose.yml`, `.github/workflows/`, the Keycloak realm.

---

## Follow-ups worth ticketing

Backend (`ohs-player-reference-backend`):
- B1. `BulkUserImportServlet` never calls `emitDone` (D2).
- B2. No up-front header validation; the users servlet enforces neither `username` nor `email` despite the README.
- B3. `CsvProcessor` does not strip a UTF-8 BOM, so the first column silently vanishes.
- B4. `emitError` does not escape `\r`, tabs or other control characters, producing invalid JSON frames.
- B5. Exceptions that escape the organisation, location and assignment servlets after the SSE headers are sent (unwrapped `find…ByIdentifier` lookups, and a missing `parent_id`, reproduced live in probe 3) end the stream without `done`, and the error dispatch appends a bare 401 JSON body to the open stream.
- B6. Invalid UTF-8 or an I/O failure before the stream gives a container 500 without the `{ error }` shape.
- B7. Row numbers count blank lines for users but not for the other three; `total` counts blank lines everywhere.
- B8. Users re-import resets the password to `{username}123` when `password` is blank. Also: CSV quoting support; the stale "Default is 5" comment on `BULK_IMPORT_BATCH_SIZE`.

Web:
- W1. `activityItemFromAuditEvent` (on `feat/audit-log-page`) could fall back to `entity.type.code` for the resource type when an entity has no `what`, so summary events read "Created Organization".
- W2. A client-side cancel for `customPostStream` (additive `signal`), if a server-side cancel ever exists.
- W3. Expose the import drawer to extensions (a header actions slot or a shell primitive) when an extension needs an import.
- W4. User assignments import (`/api/bulk-import/user-assignments`), out of scope per #87.
- W5. Bulk export, out of scope per #87.
- W6. `CareTeamFormDrawer` still carries a private `toErrorMessage` (unrelated, noted per the conventions).
- W7. At 390 px the top bar's account menu overflows the viewport on every page (pre-existing on `main`).
- W8. `oidcDiscovery.test.ts` in the library fetches a public demo issuer over the network and times out when that host is slow; it failed once in isolation and passed in the full run.

---

## Risk assessment

| # | Risk | Class | Mitigation |
| --- | --- | --- | --- |
| R1 | Users import reported as failed on success (F2) | Blocker, fixed in Sprint 1 | `completion: 'close'` plus a test; B1 filed. |
| R2 | A crashed organisations or locations stream reported as success | Must fix before merge | `done` required for those templates (F3); the `interrupted` test. |
| R3 | Imports with no audit trail | Must fix before merge | D1 library change; audit rule; D8 close block. The navigate-away gap is documented. |
| R4 | Bundle growth from the parser | Must fix before merge | Lazy `import()`; chunk table in the PR; about 19 KB gzipped off the critical path. |
| R5 | Conflict with `feat/audit-log-page` | Follow-up at merge time | Expected in `writeAudit.ts` (entity block), `appMessages.ts` and possibly `docs/DEPLOYMENT.md`. Resolution: keep that branch's `RESOURCE_TYPES_SYSTEM` type inside the new summary entity. Whichever merges second rebases and re-runs probe 8. |
| R6 | Deployments overriding the retired `locations*` keys lose their copy | Must fix before merge (documented) | Migration note in the PR and `CUSTOMIZING.md`. |
| R7 | Security: password reset on users re-import | Follow-up | Warning copy states it; B8 filed. The permission gate stays `bulk-import.manage` on both sides. |
| R8 | Single-maintainer parser | Nice to have | Exact version pin; the parser sits behind `workbookToCsv.ts`, so swapping it touches one file. |
| R9 | jsdom cannot run the parser | Follow-up inside Sprint 4 | The spike decides; `rowsToCsv` carries the unit coverage either way. |
