# OHS Player Web Portal - Roadmap and Epics

**Repository:** `ohs-foundation/ohs-player-reference-web-portal` (code)
**Coordination:** `ohs-foundation/ohs-player` (epics tracked here)
**MVP1 Target:** v0.0.1-alpha by end of June 2026
**MVP2 Target:** v0.1.0-beta by end of August 2026
**MVP3 Target:** v1.0.0-rc by end of September 2026

## Document structure

Epics in this document map to issues in the coordination repo (`ohs-foundation/ohs-player`). Tasks under each epic map to issues in the workstream repo (`ohs-player-reference-web-portal`) or sibling repos (`-backend`, `-infrastructure`).

This follows the same two-level structure used by the analytics workstream.

## Foundational decisions

These decisions shape the build and are referenced throughout the epics below.

**Platform positioning.** OHS is a web platform for FHIR-native digital health, parallel to what the Android FHIR SDK does on mobile. Multiple downstream teams (MoH deployments, partner orgs, future OHS consumers) will build on the library and theme freely.

**UI library: Radix + Tailwind + Shadcn-style component layer.** Headless primitives in the library, design tokens drive theming, downstream consumers theme freely without forking components. This is the platform-correct choice for configurability levels 3-5.

**Starting point: clean repo, not Cinder fork.** Cinder is reference material for the FHIR client adapter pattern and the Bun proxy pattern. The admin is built natively. Cinder's resource browser components may be ported into our stack as an MVP2 feature.

**Commit semantics: Bundle transactions.** Every entity form produces a Bundle entry. Single-resource saves submit one-entry Bundle transactions. The wizard composes multi-entry Bundles with `urn:uuid:` cross-references.

**Assignment graph for mobile sync.** MVP1 supports `Location.partOf`, `Location.managingOrganization`, `Organization.partOf`, `Organization.type`, `CareTeam.managingOrganization`, `CareTeam.participant.member` (with role coding), `Practitioner.identifier` (Keycloak ID), `PractitionerRole` (Practitioner-Org-Location-role), and `OrganizationAffiliation` (Org-Org and Org-Location relationships).

**Early showcase UI in the monorepo.** Brian's initial work is part of MVP1 code, not a throwaway. It builds the initial components of the monorepo (Epic 1 foundation + first cuts of entity UIs from Epics 3-7) with enough surface area to demo to stakeholders. The "showcase" framing is about having something visible early; the code itself is the real reference app.

**OSS workflow.** Personal forks for contributions, GPG-signed commits, all issues under naming conventions specifying sub-project (web-admin, analytics, backend, infrastructure, mobile-client).

## MVP1 Epics

### Epic 1: Foundation and Dev Environment

**Objective.** Establish the project scaffold, local development stack, foundational authentication flow, and headless UI primitives so developers can build admin features against a running OHS backend.

**User story.** As a developer, I want to run the full OHS stack locally with one command and have authentication and the UI baseline working, so that I can develop admin features against real services with a consistent component library.

**Key deliverables.**
- pnpm monorepo with `packages/ohs-player-web-core` and `apps/ohs-player-web`
- Docker Compose stack (HAPI FHIR, Keycloak, OHS Info Gateway)
- OIDC + PKCE authentication flow against Keycloak
- Radix + Tailwind + Shadcn-style component scaffold with design token system
- Minimal app shell with protected routing
- Authenticated FHIR client (read operations)

**Acceptance criteria.**
- `pnpm install && pnpm dev` launches the app on localhost
- `docker compose up` brings all backend services healthy
- User can log in via Keycloak and see a protected page
- Logout clears session and redirects to Keycloak
- Authenticated requests to FHIR server return data
- Non-authenticated users are redirected to login
- Component scaffold renders themed primitives via design tokens

**Tasks.**

Web portal:
- Monorepo and tooling scaffold (Vite, TypeScript strict, pnpm workspaces, Tailwind, Shadcn-style component layer)
- OIDC + PKCE login flow (with library spike on `oidc-client-ts` vs hand-rolled)
- Authenticated FHIR client (minimal read)
- Minimal app shell with Radix-based primitives
- Design token system: CSS variables driving Tailwind theme + component variants

Infrastructure:
- Local dev Docker Compose stack with HAPI FHIR, Keycloak (seeded `ohs-player` realm), OHS Info Gateway
- Seed script for sample Practitioner, Organization, Location, CareTeam resources

### Epic 2: Core Library Extraction

**Objective.** Extract reusable OHS-specific functionality into `ohs-player-web-core`, establishing the foundation for auth, FHIR client, RBAC, AuditEvent, Bundle helpers, and headless primitives that other OHS web apps can consume.

**User story.** As a developer building OHS web applications, I want to import a library with auth, FHIR client, RBAC, and accessible component primitives already configured, so that I can focus on building features instead of infrastructure.

**Key deliverables.**
- `ohs-player-web-core` npm package skeleton
- `CorePlatformProvider` with config contract (fhirBaseUrl, auth, rbac, customEndpoints, onError)
- Auth module with `useAuth()` hook
- Unified FHIR client over OHS Gateway with `useResource()`, `useSearch()`, `useCreateResource()`, `useUpdateResource()`, `useCustomEndpoint()` hooks
- RBAC primitives: `usePermission()`, `useRoles()`, `PermissionGuard`, `RoleGuard`
- Bundle transaction wrapper utility
- Headless component primitives (Radix-wrapped) with design token contract

**Acceptance criteria.**
- Reference app imports library via workspace alias
- `CorePlatformProvider` wraps the app with all config
- Auth state accessible via `useAuth()` hook
- FHIR operations work via library hooks including transactions
- Permission checks work via `usePermission()` and guards
- Bundle transactions can be constructed and submitted
- Component primitives consume design tokens; downstream consumers can theme freely

**Tasks.**

Web portal:
- `CorePlatformProvider` with full config contract
- Auth module extraction (`useAuth`, token storage, refresh)
- FHIR client extraction (adapter pattern, OHS Gateway aware)
- FHIR hooks extraction
- RBAC primitives extraction (token-claim role extraction, configurable claim path)
- Bundle helpers utility
- Component primitives layer (Radix wrappers + Tailwind variants)

### Epic 3: User Management - List and Edit

**Objective.** Enable administrators to view all users in the system, search by name, and edit user demographics.

**User story.** As an administrator, I want to view a list of all users and edit their information, so that I can manage the health workforce in my program.

**Key deliverables.**
- User list page with search by name
- Filter by active/inactive status
- Pagination for large user lists
- User edit form pre-populated from Practitioner
- Loading, empty, and error states

**Acceptance criteria.**
- User list displays Practitioner resources with key demographics
- Search filters list by name (client- or server-side based on dataset size)
- Active/inactive filter works correctly
- Pagination handles 100+ users
- Edit form loads existing Practitioner data
- Save updates Practitioner resource via one-entry Bundle transaction
- Proper loading and error states throughout

**Tasks.**

Web portal:
- User list page with search
- User list pagination
- Active/inactive filter
- User edit form
- `Practitioner.update` via Bundle transaction on save

### Epic 4: User Create (Journey 1)

**Objective.** Enable administrators to create new users with a transactional flow that creates the Keycloak account, FHIR Practitioner resource, and supporting PractitionerRole resources atomically.

**User story.** As an administrator, I want to create a new user with their demographics, role assignments, and organizational assignments, so that they can log in and access the system with appropriate permissions and be queryable by the mobile sync layer.

**Key deliverables.**
- User create form with demographics fields
- Role assignment during creation (multi-select)
- Organization and Location assignment (creates `PractitionerRole` resources)
- Gateway custom endpoint `POST /custom/users` integration
- Transactional create (Keycloak + Practitioner + PractitionerRoles with rollback)
- Client-side and server-side validation
- `Practitioner.identifier` stores Keycloak user ID

**Acceptance criteria.**
- Create form captures all required demographics
- Roles can be assigned during creation
- User can be assigned to one or more Organization and Location contexts via PractitionerRole
- Submit creates Keycloak user, Practitioner, and PractitionerRole(s) atomically
- Keycloak ID is stored in `Practitioner.identifier`
- Partial failure rolls back (no orphan accounts)
- Validation errors are displayed clearly
- Success redirects to user list with confirmation

**Tasks.**

Web portal:
- User create form UI
- Role assignment multi-select
- Organization and Location PractitionerRole UI (multi-context)
- Integration with `POST /custom/users` endpoint
- Validation and error handling

Backend:
- `POST /custom/users` endpoint (Keycloak + Practitioner + PractitionerRole transactional)
- Rollback on partial failure
- Idempotency handling

### Epic 5: User Deactivate (Journey 4)

**Objective.** Enable administrators to deactivate users, which disables their Keycloak account, sets `Practitioner.active` to false, and removes them from CareTeam memberships and PractitionerRole assignments.

**User story.** As an administrator, I want to deactivate a user who has left the program, so that they can no longer access the system and are removed from active rosters.

**Key deliverables.**
- Deactivate action on user list/detail
- Confirmation dialog before deactivation
- Keycloak account disable
- `Practitioner.active = false`
- Remove user from `CareTeam.participant` entries
- Deactivate `PractitionerRole` entries (set period.end)
- Audit trail of deactivation

**Acceptance criteria.**
- Deactivate button visible for active users (admin only)
- Confirmation dialog prevents accidental deactivation
- Keycloak account is disabled (cannot log in)
- `Practitioner.active` is set to false
- User is removed from all `CareTeam.participant` entries
- All active `PractitionerRole` entries for the user are end-dated
- Deactivated user appears in inactive filter
- Action is logged as AuditEvent

**Tasks.**

Web portal:
- Deactivate button and confirmation dialog
- Integration with deactivate endpoint
- Update CareTeam.participant removal
- PractitionerRole end-dating

Backend:
- Deactivate endpoint (Keycloak + Practitioner + CareTeam + PractitionerRole cleanup)

### Epic 6: Location Hierarchy (Journey 2)

**Objective.** Enable administrators to manage a hierarchical location structure using `Location.partOf` relationships, with tree visualization and circular reference prevention.

**User story.** As an administrator, I want to create and organize locations in a hierarchy (Country → Region → District → Facility), so that I can structure the geographic scope of my health program.

**Key deliverables.**
- Location list view
- Location create form with parent picker (sets `Location.partOf`)
- Location edit form
- Tree view visualization with breadcrumbs
- Circular reference guard at write time
- `Location.managingOrganization` linkage

**Acceptance criteria.**
- Locations display in a navigable tree structure
- Create form allows selecting a parent location
- `Location.partOf` correctly references parent
- Circular references are prevented (A → B → A blocked)
- Tree can be expanded/collapsed
- Breadcrumbs show current location path
- Locations can be linked to managing Organization

**Tasks.**

Web portal:
- Location list view
- Location create form with parent picker
- Location edit form
- Tree view component (recursive render)
- Circular reference validation
- `managingOrganization` linkage UI

### Epic 7: Organization, CareTeam, and Assignment Graph (Journey 3)

**Objective.** Enable administrators to manage Organizations and CareTeams, including organizational hierarchy via `Organization.partOf`, organizational relationships via `OrganizationAffiliation`, participant assignment with role coding, and the full FHIR resource graph that the mobile sync layer queries against.

**User story.** As an administrator, I want to create organizations and care teams, link them in hierarchies, assign health workers to teams with role coding, and establish the relationships that determine which patient and clinical data syncs to each worker's device, so that the mobile sync model has the resource graph it needs.

**Key deliverables.**
- Organization list, create, edit, with `Organization.type` coding (supports team-type orgs)
- Organization hierarchy via `Organization.partOf`
- OrganizationAffiliation editor (Org-to-Org and Org-to-Location relationships)
- CareTeam list, create, edit
- `CareTeam.managingOrganization` linkage
- Participant management: add/remove Practitioners with role coding
- Assignment graph documented in `ARCHITECTURE.md`

**Acceptance criteria.**
- Organizations can be created with `Organization.type` coding
- Organizations can be linked into a hierarchy via `partOf`
- OrganizationAffiliation can be created linking Orgs to other Orgs and Locations
- Organizations can be linked to managing Locations
- CareTeams can be created under a managing Organization
- Practitioners can be added to `CareTeam.participant` with role coding
- Participants can be removed from CareTeams
- Assignment graph supports all four sync strategies in the sync design doc (by Organization, by Team, by Location, by CareTeam)

**Tasks.**

Web portal:
- Organization list view
- Organization create/edit forms with `type` and `partOf`
- OrganizationAffiliation editor
- CareTeam list view
- CareTeam create/edit forms with `managingOrganization`
- Participant add/remove UI with role coding
- ARCHITECTURE.md: assignment graph documentation

### Epic 8: Guided Setup Wizard

**Objective.** Provide a multi-step wizard that guides administrators through initial system setup, creating locations, organizations, care teams, users, and assignments in one cohesive flow.

**User story.** As an administrator setting up a new deployment, I want to follow a guided wizard to create my org structure and users, so that I can get the system ready for use without navigating multiple screens.

**Key deliverables.**
- 5-step wizard: Locations → Organizations → CareTeams → Users → Assignments + Review
- Reuse of entity forms in wizard mode (emit Bundle entries instead of POSTing)
- Progress indicator and navigation
- Draft state persistence in sessionStorage
- Two-phase commit: Bundle transaction for non-user resources, then per-user creation
- Review step showing complete resource graph
- Partial failure recovery for user creation

**Acceptance criteria.**
- Wizard guides through all 5 steps in order
- Entity forms work in both standalone and wizard modes
- Draft state persists within browser session
- Review step shows all resources to be created
- Submit creates non-user resources in atomic Bundle transaction
- Users created via custom endpoint with CareTeam and PractitionerRole assignments
- Partial user creation failure shows which succeeded/failed
- Failed users can be retried individually

**Tasks.**

Web portal:
- Wizard route and step framework
- Progress indicator component
- Refactor forms to support `mode: 'wizard' | 'standalone'`
- Step 1: Locations (with hierarchy)
- Step 2: Organizations
- Step 3: CareTeams
- Step 4: Users
- Step 5: Assignments and review
- Two-phase commit logic
- Partial failure recovery UI

### Epic 9: AuditEvent Integration

**Objective.** Write FHIR `AuditEvent` resources for all mutating operations, establishing an audit trail for compliance and troubleshooting.

**User story.** As a compliance officer, I want all user and data changes to be logged as audit events, so that I can track who made what changes and when.

**Key deliverables.**
- AuditEvent writing primitive in library
- AuditEvent shape documented (action codes, subtypes, agent)
- Integration into all mutation flows (user, location, organization, careteam, OrganizationAffiliation, PractitionerRole)
- `ARCHITECTURE.md` documentation of AuditEvent shape

**Acceptance criteria.**
- Every create, update, deactivate operation writes an AuditEvent
- `AuditEvent.agent` references the current user's Practitioner
- `AuditEvent.action` uses correct FHIR codes (C/R/U/D)
- AuditEvent shape is documented in `ARCHITECTURE.md`
- AuditEvents can be queried via FHIR API

**Tasks.**

Web portal:
- AuditEvent writing primitive (library)
- Wire AuditEvent into user mutations
- Wire AuditEvent into location mutations
- Wire AuditEvent into organization, OrganizationAffiliation mutations
- Wire AuditEvent into careteam, PractitionerRole mutations
- Document AuditEvent shape in `ARCHITECTURE.md`

### Epic 10: Dashboard

**Objective.** Provide a dashboard landing page with live counts of key entities, giving administrators an at-a-glance view of system status.

**User story.** As an administrator, I want to see a dashboard with counts of users, locations, care teams, and organizations, so that I can quickly understand the current state of my deployment.

**Key deliverables.**
- Dashboard route as landing page
- Live counts: active users, locations, care teams, organizations
- Count queries using FHIR `_summary=count`
- Loading states for each count
- Quick links to management sections

**Acceptance criteria.**
- Dashboard shows count of active users, locations, care teams, organizations
- Counts load dynamically from FHIR server
- Loading states display while fetching
- Counts link to respective list views

**Tasks.**

Web portal:
- Dashboard route and layout
- Count cards component
- FHIR `_summary=count` queries
- Quick links to entity lists

### Epic 11: Alpha Release and Documentation

**Objective.** Package and release v0.0.1-alpha of the web portal library and reference app, with documentation enabling developers to get started quickly.

**User story.** As a developer adopting OHS Player, I want clear documentation and published packages, so that I can get started with the admin portal in minutes.

**Key deliverables.**
- `ohs-player-web-core@0.0.1-alpha` published to registry
- Reference app Docker image tagged and published
- `README.md` with project overview
- `ARCHITECTURE.md` with design decisions
- `QUICKSTART.md` (5-minute setup guide)
- Release notes

**Acceptance criteria.**
- Library published to npm or chosen registry
- Docker image built and tagged
- `README.md` explains project purpose and structure
- `ARCHITECTURE.md` documents key decisions (library scope, wizard, assignment graph, AuditEvent shape, configurability)
- `QUICKSTART.md` enables setup in 5 minutes
- Release notes summarize MVP1 features
- Basic a11y pass completed (axe-core, critical issues fixed)

**Tasks.**

Web portal:
- npm publish configuration
- `README.md`
- `ARCHITECTURE.md`
- `QUICKSTART.md`
- Release notes
- a11y pass with axe-core

Infrastructure:
- Docker image build and tag
- CI/CD release pipeline

### Epic 12: UI/UX Design System

**Objective.** Establish UI/UX designs for the admin portal in Figma, providing visual reference for engineers, a consistent design language for downstream consumers, and a starting point for the design token system.

**User story.** As an engineer building admin features, I want Figma designs that show what each screen should look like and how interactions should flow, so that I can implement consistently without inventing visual decisions ad hoc. As a downstream implementer, I want a published design system I can fork and theme.

**Key deliverables.**
- Figma file with designs for all MVP1 screens (auth, dashboard, user CRUD, location tree, org/careteam CRUD, wizard, all 5 steps)
- Design token specification (colors, typography, spacing, radius, shadows)
- Component library in Figma matching the Shadcn-style React components
- Interaction patterns documented (loading, empty, error states; form validation; confirmation dialogs)
- Design handoff process documented

**Acceptance criteria.**
- Figma file is shareable with engineers
- Design tokens are explicitly defined and consumable from code (CSS variable names, Tailwind config)
- All MVP1 screens have a design
- Wizard flow is fully designed with all 5 steps
- Loading/empty/error states designed
- Design system can be forked by a downstream consumer for retheming

**Tasks.**

Design:
- Onboard UX designer to project
- Audit existing OpenSRP web admin designs as reference
- Figma file creation with design tokens
- Design all MVP1 screens
- Wizard flow design
- State variations (loading, empty, error)
- Handoff to engineers per epic milestone

**Timeline notes.** Design work runs parallel to engineering. Auth + dashboard designs needed by week 2. User management designs by week 3. Location/Org/CareTeam designs by week 4. Wizard designs by week 5. Stretch deliverables continue into MVP2.

## MVP2 Epics (provisional - sharpen after MVP1 ships)

### Epic 13: FHIR Resource Browser

**Objective.** Embed a FHIR resource browser into the admin (or as a parallel route), enabling implementers and operators to inspect arbitrary FHIR resources, search, and view raw JSON during troubleshooting and deployment validation.

**Approach.** Port Cinder's FHIR adapter pattern (`src/fhir/` directory), schema loading from `@medplum/definitions`, two-tier ValueSet expansion, and page-level resource browsing UI into our stack. Build on Radix primitives, themed via our design tokens. Drop Cinder's GCP-specific code and StoreSelector.

### Epic 14: Reference Client App Configuration Management

**Objective.** Provide a web-based interface for managing the FHIR Implementation Guide that drives the **OHS Player reference client app** (mobile and desktop) behavior, allowing implementers to manage client-app configs without working directly with IG files.

**Scope clarification.** This epic is about managing configurations *consumed by the mobile/desktop reference client app*. It is distinct from configurability of the web admin itself (which is covered by Epics 17/18/19 and the Configurability Annex). Two different products, two different configuration surfaces:

- *Web admin configurability* (Epics 17/18/19): how downstream consumers theme and configure the web admin itself
- *Reference client app config management* (this epic): the web admin as the tool implementers use to manage what the mobile client renders, syncs, and captures

**Background.** Per Elly's update in the May 19 standup, the mobile KMP client now uses Kotlin Poet code generation to extract state classes from FHIR Implementation Guides. The IG is the contract between the web admin (which produces the data) and the mobile client (which consumes it). This epic puts management of that contract into the web admin.

**Scope hypothesis.**
- View current IG resources consumed by the reference client app (Questionnaires, ValueSets, StructureDefinitions, view definitions)
- Edit IG resources via guided UI rather than raw FHIR JSON
- Publish IG updates that propagate to mobile clients via sync
- Validate IG before publish
- Version/preview before publish

**Open questions to settle before scoping properly.**
- Does the mobile client pull IG resources directly from HAPI, or via a dedicated config endpoint? Determines what "publish" means.
- What's the minimum useful slice for MVP2: just Questionnaire editing, or the full IG surface?
- How does this interact with the Kotlin Poet code generation pipeline — does publishing an IG trigger a regen, or does the mobile client re-extract at runtime?

### Epic 15: Keycloak User Import

**Objective.** Sync existing Keycloak realm users into Practitioner resources, with conflict resolution against existing Practitioners. Useful for deployments migrating from existing IAM into OHS.

### Epic 16: Bulk Imports

**Objective.** CSV import for users, locations, organizations, careteams. Per-entity preview, validation, dry-run, error reporting, partial success handling.

### Epic 17: Full Theming System

**Objective.** Formalize `ThemeConfig` contract beyond design tokens. Per-component overrides. Default theme and one alternate theme in reference app.

### Epic 18: Feature Flag Contract

**Objective.** `FlagsConfig`, `useFlag`, `FeatureGuard` in the library. Env-var driven. Evaluation order: flag → auth → permission.

### Epic 19: i18n Surface

**Objective.** Typed `MessageCatalog`, `useTranslation`, `{{interpolation}}`. Stub for one alternate locale (Swahili). `dir` attribute for RTL readiness.

### Epic 20: IAM Groups

**Objective.** Group CRUD beyond role assignment. Group-to-user assignment.

### Epic 21: Hardening and Extension Documentation

**Objective.** a11y to zero criticals. Performance pass. EXTENDING walkthrough. API reference for the library.

### Epic 22: UI/UX Design - MVP2

**Objective.** Designs for all MVP2 screens, dark mode variant, additional theme variant demonstrating configurability.

**Target:** beta release v0.1.0 at end of August.

## MVP3 Epics (sketch)

### Epic 23: FHIR-Backed Roles

`PractitionerRole`-driven RBAC, `RbacAdapter` interface for custom IAM integrations.

### Epic 24: Advanced CareTeam Features

CareTeam reorder and effective-dating UI. Storybook for primitives. v1.0.0 release candidate.

### Epic 25: Storybook and Component Documentation

Full Storybook for the headless primitives library, enabling downstream consumers to browse and theme components.

**Target:** v1.0.0-rc at end of September.

## Six-week MVP1 timeline

| Week | Dates | Focus |
|---|---|---|
| 1 | 18-22 May | Epic 1 + 12 kickoff: scaffold + auth + dev env + design system bootstrap |
| 2 | 25-29 May | Epic 2 + Epic 3: library extraction + user list/edit (auth designs delivered) |
| 3 | 1-5 Jun | Epic 4 + 5: user create + deactivate (user mgmt designs delivered) |
| 4 | 8-12 Jun | Epic 6 + start Epic 7: location hierarchy + org CRUD (location/org/careteam designs delivered) |
| 5 | 15-19 Jun | Epic 7 + Epic 9 + Epic 8 scaffold: careteam + assignment graph + AuditEvent + wizard scaffold (wizard designs delivered) |
| 6 | 22-26 Jun | Epic 8 completion + Epic 10 + Epic 11: wizard completion + dashboard + release |

## Cut list if things slip

If the timeline shows signs of slipping mid-flight, here is the agreed cut order (most cuttable first):

1. **Dashboard polish.** Bare counts, no styling beyond defaults.
2. **a11y hardening.** Defer non-critical a11y to MVP2.
3. **AuditEvent on edit operations.** Keep AuditEvent on create and deactivate; defer edits to MVP2.
4. **OrganizationAffiliation editor.** Ship Organization CRUD without the affiliation editor; defer to MVP2.
5. **Wizard review step polish.** Functional review step, minimal visuals.
6. **CareTeam participant role coding.** Add/remove participants without role first.

Cuts not on the table without a re-plan: the four journeys, the wizard core flow, the assignment graph (excluding OrganizationAffiliation editor), library extraction, the gateway custom endpoint, the local dev environment.

## Open questions

1. Gateway custom endpoint contract: should `POST /custom/users` accept PractitionerRole and CareTeam assignment refs so the wizard can create user-with-assignments in one call?
2. Registry strategy: public scoped npm, private registry, or GitHub Packages first?
3. AuditEvent shape: subtypes, action codes, agent shape (hypothesis exists, confirm before week 4)
4. Role taxonomy for alpha: static list of role names the permission map references
5. UX designer: who, what start date, what tool (Figma confirmed?)
6. OrganizationAffiliation use cases: how exactly are deployments expected to use this? Affects the editor UX

## Process notes

- Epics are tracked in `ohs-foundation/ohs-player` as roadmap items
- Tasks are tracked in `ohs-foundation/ohs-player-reference-web-portal` (or sibling repos as noted)
- Each task is assigned to a project board view: web admin, backend, infrastructure, design
- All commits GPG-signed, all contributions via personal fork PRs
- Issue naming convention prefixes the sub-project: `[web-admin]`, `[backend]`, `[infrastructure]`, `[design]`
- Each week opens with a 30-minute planning huddle and closes with a 30-minute review and demo
