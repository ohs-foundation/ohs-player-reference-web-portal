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

## Follow ups

- #116 the schema generated form.
- #117 saving the document through a backend endpoint.
- #118 an Exported label for configuration downloads in the audit log.
- The backend relay ticket.

## Risks

- A document that relied on a brand pin or a navigation link that D7 now rejects fails validation at boot and falls back to the last good copy. The error names the field.
- The request text and the draft leave the browser for the relay and then the provider. The document is already public because it is served as a static file. The request text may not be, and the panel says where it goes.
