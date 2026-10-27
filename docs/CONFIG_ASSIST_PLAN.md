# Assisted configuration changes implementation plan

Issue #94. Base `main` at `49e7ba9`. Branch `feat/config-assist`.

Issue #94 is a layer on #93, the configuration editor. #93 was closed with no code, so this branch also builds the part of #93 that #94 stands on. That part is validation with field paths, a diff against the running document, a preview of brand and navigation, a download and an audit record. The form generated from the schema is left out and tracked in #116.

The whole ticket lands as one pull request. Each phase leaves the quality gates green and the example app building and passing `host.test.tsx`.

---

## 0. Findings

Verified against the checkout on 27 October 2026.

| #   | Finding                                                                                                                                                                                                                        | Where                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| F1  | A brand pin is any non empty string, and the theme writes override values into the stylesheet verbatim. A pin such as `#fff; } body { display: none } :root {` passes validation and rewrites the portal's CSS once installed. | `apps/ohs-player-web/src/config/portalConfigSchema.ts` line 64, `packages/ohs-player-web-core/src/theme/sysTokens.ts` line 325 |
| F2  | A navigation `to` only has to start with `/`. React Router 7 treats `//host/path` as an absolute address and renders a link to another site, which looks like an internal screen in the sidebar.                               | `portalConfigSchema.ts` line 68, `react-router` `ABSOLUTE_URL_REGEX`                                                           |
| F3  | The example app's schema accepts any colour role and has the same `to` rule.                                                                                                                                                   | `apps/ohs-player-web-example/src/config/portalConfigSchema.ts` lines 4 and 8                                                   |
| F4  | Nothing keeps the raw running document after boot. `main.tsx` passes it to `createPortalHost` and drops it. The resolved config is the merge, not the document.                                                                | `apps/ohs-player-web/src/main.tsx` line 18                                                                                     |
| F5  | The sidebar reads `usePortalConfig().navigation`, and on `main` only `PortalHost` provides that context. An app cannot override it for the frame until #114 adds a `providers` prop.                                           | `packages/ohs-player-web-shell/src/layout/AppLayout.tsx` line 79, `src/host/PortalHost.tsx`                                    |
| F6  | The `UserManager` is memoised on the issuer and client id, so applying `oidcIssuer` or `clientId` to the live session would sign the user out.                                                                                 | `packages/ohs-player-web-core/src/auth/AuthProvider.tsx` line 44                                                               |
| F7  | `writeAuditEvent` types every entity under the FHIR resource types system and only knows create, update and delete. A configuration file is not a FHIR resource.                                                               | `packages/ohs-player-web-core/src/audit/writeAudit.ts`                                                                         |
| F8  | The audit list already shows an `E` action with the generic Changed label and a summary entity with no `what`.                                                                                                                 | `apps/ohs-player-web/src/features/audit/auditPresentation.ts`, `auditActivity.ts`                                              |
| F9  | zod skips `__proto__` keys when it parses a record, so a proposal cannot swap a prototype through `messages` or `permissionMap`.                                                                                               | `zod/v4/core/schemas.js` line 767                                                                                              |
| F10 | The backend has no relay and no model client. Gateway secrets arrive through Spring properties, which is the shape a relay credential takes.                                                                                   | `ohs-player-reference-backend` `configs/OtherConfigs.java`                                                                     |
| F11 | The dev server already proxies `/api` to the gateway, so a relay needs no proxy change.                                                                                                                                        | `apps/ohs-player-web/vite.config.ts` line 57                                                                                   |

---

## Reference or product

| Part                                                                                  | Bin                | Outcome                                          |
| ------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------ |
| Validation, diff, preview, download and audit for any edit                            | Reference          | Built                                            |
| The relay contract and one `configAssist` alias                                       | Reference          | Built on the web side, relay is a backend ticket |
| Schema rules that close F1 and F2                                                     | Reference          | Built                                            |
| The prompt box, one request and one proposal at a time                                | Borderline         | Smallest version                                 |
| The schema generated form                                                             | Product leaning    | Left out, #116                                   |
| Provider choice in the UI, chat, streaming, suggestions, per row accept, saved drafts | Product            | Not built                                        |
| Saving the document to a server                                                       | Blocked on backend | #117                                             |

---

## Decisions

| #   | Question                              | Answer                                                                                                                                                                                                      |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Where the running document comes from | `main.tsx` passes the loaded document, its source and any load error to `App`, which provides them through an app only context.                                                                             |
| D2  | Editor                                | A monospace text field that parses and validates on every change. No dependency.                                                                                                                            |
| D3  | Diff                                  | A pure diff over JSON paths. Navigation entries are matched by `id`, so a reorder reads as order changes. No dependency.                                                                                    |
| D4  | Preview                               | The real sidebar through #114's `providers` prop once it merges. Until then the brand applies live and the new navigation order shows as a list on the page.                                                |
| D5  | Flags and permission                  | `configEditor` is on unless set to `false`. `configAssist` is off unless set to `true`. One permission, `configuration.edit`, maps to `admin`.                                                              |
| D6  | Fields a proposal may not change      | `$schema`, `fhirBaseUrl`, `fhirVersion`, `oidcIssuer`, `clientId`, `permissionMap` and `customEndpoints`. A proposal that touches one is refused. A hand edit is allowed and marked for engineering review. |
| D7  | F1 and F2                             | Both schemas reject brand pin values with `;`, `{`, `}`, `<`, `>`, `\` or a line break, and navigation `to` values that start with `//`.                                                                    |
| D8  | Relay contract                        | See below. The browser sends the JSON Schema it validates against.                                                                                                                                          |
| D9  | Where a proposal lands                | In the editor, through the same checks as a hand edit, with one step back to the previous draft.                                                                                                            |
| D10 | Audit on download                     | Action `E` and entity type `audit-entity-type` code `2` System Object, with the changed paths in the description. An additive library change.                                                               |

### Relay contract

```
POST /api/config-assist          alias configAssist, overridable in the document's customEndpoints
Request  { request: string (1 to 2000 characters), document: <validated draft>, schema: <JSON Schema> }
200      { proposal: object, summary?: string }
Errors   { error: string }
         400 bad input, 401 signed out, 403 missing realm role, 413 too large,
         422 the model did not return a JSON object, 429 rate limited,
         502 provider error, 503 not configured, 504 provider timeout
```

The relay owns the provider, its endpoint, its credential, the model and the prompt. None of them exist in the portal. The browser treats the reply as untrusted and accepts only an object in `proposal`.

FHIR references for D10.

- `AuditEvent.action` code `E`, Execute. https://hl7.org/fhir/R4/valueset-audit-event-action.html
- `AuditEvent.entity.type` is bound extensibly to a value set that includes `http://terminology.hl7.org/CodeSystem/audit-entity-type` code `2`, System Object. https://hl7.org/fhir/R4/valueset-audit-entity-type.html

---

## Edge cases

| Case                                                         | Answer                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| No `portal-config.json`                                      | The editor starts at `{}` and the page says the session runs on built in values.      |
| The served document is invalid                               | The editor starts from the last good copy and the page shows the load error.          |
| The draft is not JSON, is not an object, or fails the schema | Three distinct messages. Preview, Download and Ask are disabled.                      |
| The draft equals the running document                        | No changes. Download is disabled.                                                     |
| A proposal touches a guarded field                           | Refused with the paths named. The editor is unchanged.                                |
| A proposal that is not an object                             | Refused as not a configuration document. The editor is unchanged.                     |
| The relay is absent or not configured                        | The page says the assistant is not set up for this deployment.                        |
| The provider fails or times out                              | Plain words with the server's text behind Technical details. The editor is unchanged. |
| The draft changes while a request is pending                 | It cannot. The editor is read only until the reply.                                   |
| Preview, then leave the page                                 | The running brand and navigation come back.                                           |

---

## Phases

| Phase | Steps                                                        | Commit                                                               |
| ----- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| 0     | This file                                                    | `docs: plan assisted configuration changes`                          |
| 1     | Flags, permission, alias, sidebar entry, route               | `feat(config): ...`, `feat(shell): configuration sidebar entry`      |
| 2     | Field issues, draft parsing, diff, serialising, schema rules | `feat(config): ...`, `fix(config): ...`                              |
| 3     | Running document, the page, the audit coding                 | `feat(core): ...`, `feat(config): ...`                               |
| 4     | Preview                                                      | `feat(config): preview brand and navigation in the current session`  |
| 5     | The assistant panel                                          | `feat(config): ask the configured assistant for a proposed document` |
| 6     | Guides                                                       | `docs: configuration page and assistant`                             |

---

## Files intentionally not touched

- `DashboardPage.tsx`, the extension host and `PortalHost.tsx`.
- The backend. The relay is a separate ticket.

## Decisions as implemented

| #   | As built                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | `RunningConfigContext` wraps `PortalHost` in `App.tsx`, so no shell change was needed.                                                                                                                                                                                                                                   |
| D4  | #114 had not merged, so preview takes the fallback. `useConfigPreview` installs the draft brand and the page lists the draft sidebar order, marking screens the draft switches off. Extension entries join the list by `order` through `ExtensionsContext`.                                                              |
| D5  | As decided. `.env.example` sits at the repository root, not in the app.                                                                                                                                                                                                                                                  |
| D7  | Stronger than first decided, with a second yes. Colour tokens feed `background` shorthands, so a pin of `url(...)` would load an outside image. A pin must now be a hex value, a keyword or a colour function, with no `url(` or quotes. Paths also reject a backslash or whitespace, which browsers turn into `//host`. |
| D10 | `AuditParams` and `AuditEntityType` are exported, and the app's `useWriteAudit` takes its input type from `AuditParams`. Library bundle 50,622 to 50,704 bytes gzip.                                                                                                                                                     |

The rest are as decided.

## Verification

Automated gates at the last commit. Typecheck, lint, test and build pass in all four packages (library 175 tests, shell 285, reference app 637, example 24). `pnpm bundle:check` and `pnpm config:check` pass. The configuration page is its own lazy chunk at 4.5 KB gzip. The main chunk grew from 207,147 to 210,230 bytes gzip, for the message copy, two icons and the route.

Live walk on 27 October 2026, HAPI, Keycloak and the gateway on the local stack, headless Chrome, a stub relay answering `/api/config-assist` and passing every other `/api/*` call to the gateway. 28 of 28 checks passed.

| Check                                                          | Result                                                                                                                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin-user` sidebar                                           | Configuration listed last                                                                                                                                                                     |
| Editor                                                         | Opens on the served document, nothing to download                                                                                                                                             |
| Not JSON, a field error, a `url(...)` pin                      | Each reported with its path, Download off                                                                                                                                                     |
| Two changes                                                    | Listed exactly, `brand.overrides.primary` and `navigation.audit.order`                                                                                                                        |
| Preview                                                        | `--ohs-sys-color-primary` moved to the draft teal and back on End preview, on an edit and on leaving the page                                                                                 |
| Download                                                       | `portal-config.json` saved and passed `checkPortalConfigFile`                                                                                                                                 |
| Audit                                                          | HAPI holds action `E`, entity type `audit-entity-type` code `2`, the description naming both paths, agent `admin-user`. The audit list shows it as Changed with No resource, tracked in #118. |
| Assistant, valid, invalid, guarded, failure, not set up, prose | Placed, field errors and Download off, refused naming `oidcIssuer`, plain words with details, not set up message, refused as not a document                                                   |
| Relay request body                                             | Exactly `document`, `request` and `schema`                                                                                                                                                    |
| `configAssist: false` in the document                          | No assistant panel                                                                                                                                                                            |
| `manager-user`                                                 | No sidebar entry, Access denied on `/configuration`                                                                                                                                           |
| axe with colour contrast, light and dark                       | No violations                                                                                                                                                                                 |
| Built bundle                                                   | Only the alias path `/api/config-assist`. No provider name, model or key.                                                                                                                     |

## Bug hunt

Run after the live walk, with an independent review of the whole diff. Each fix has a test that fails without it.

| Finding                                                                                                                               | Outcome                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Reset and Restore previous draft stayed live while the assistant worked, and the reply then replaced what they did                    | Fixed. Both are off while a request is pending                                                     |
| A session on the last valid copy could not download that copy unchanged to repair a broken served file                                | Fixed. Download is on for `last-good` with no changes, and the audit record says so                |
| A brand pin such as `rgb(/*)` passed and commented out every token after it, the dark scheme included                                 | Fixed in both schemas                                                                              |
| A dashboard id the schema accepts but the host rejects at startup showed as valid and could be downloaded                             | Fixed. Every valid draft also runs the host's startup checks                                       |
| The editor's problem was an assertive alert on every keystroke, and for JSON that is not an object its description pointed at nothing | Fixed. The issues are linked with `aria-describedby` and always exist when the draft is invalid    |
| The pending and preview messages mounted with their live regions, which screen readers can miss                                       | Fixed. One status region is always mounted                                                         |
| The audit attribution covered hand edits made before asking, and dropped after one keystroke                                          | Fixed. It reads as including an assistant proposal until the draft is reset                        |
| A reply landing after the page was left still showed a toast                                                                          | Fixed                                                                                              |
| A preview test could not fail, and the `App` wiring of the running document was never exercised                                       | Fixed. The test is renamed to what it proves and `App.configuration.test.tsx` drives the real page |
| Double click on Ask                                                                                                                   | Already safe. Pinned by a test                                                                     |
| A keyword that is not a colour, such as `banana`, or a `var()` that names its own token, still passes and renders no colour           | Not changed. It predates this branch and needs a colour name list. Follow up                       |
| `revokeObjectURL` runs straight after the click, which Safari may refuse                                                              | Not changed. The bulk import template download does the same. Follow up for both                   |
| The draft sidebar list ignores extension flag defaults                                                                                | Not changed. Latent, the reference app installs no extension                                       |
| Two navigation entries with the same `order` swapped in the array give an empty diff                                                  | Not changed. Every built in entry has its own `order`                                              |
| `AuditEvent.type` stays `rest` for a download                                                                                         | Not changed. Belongs with #118                                                                     |

## Follow ups

- #116 the schema generated form.
- #117 saving the document through a backend endpoint.
- #118 an Exported label for configuration downloads in the audit log.
- The backend relay ticket.

## Risks

- A document that relied on a brand pin or a navigation link that D7 now rejects fails validation at boot and falls back to the last good copy. The error names the field.
- The request text and the draft leave the browser for the relay and then the provider. The document is already public because it is served as a static file. The request text may not be, and the panel says where it goes.
