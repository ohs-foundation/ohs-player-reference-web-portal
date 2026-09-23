# Customizing and extending the portal: a hands-on tour

This guide walks through every way a project can make the portal its own, and has you try each one in a running app: the product name, logo, colours, typography, sidebar, feature flags, permissions, copy, and new pages, dashboard widgets and actions. It uses the example application, [`apps/ohs-player-web-example`](../apps/ohs-player-web-example), because it is small and already installs one extension.

Use the cheapest mechanism that can express a change:

| Change | Mechanism | Needs a rebuild? |
| --- | --- | --- |
| Product name, colours, sidebar order, flags, roles, copy, locale, connection settings | The configuration document, `public/portal-config.json` ([Part 1](#part-1-configuration-document)) | No, reload the browser |
| Logo, favicon, browser tab title | Files in the app's `public/` folder and `index.html` ([Part 2](#part-2-logo-favicon-and-page-title)) | Only for `index.html` |
| Typography, corner radius, density, feature colours, the generated palette | The app's `ThemeConfigV2` ([Part 3](#part-3-theme-in-code)) | Yes |
| New pages, sidebar entries, dashboard widgets, row actions, forms | An extension manifest ([Part 4](#part-4-extensions)) | Yes |

For the reference behind each part, see [DEPLOYMENT.md](./DEPLOYMENT.md) section 4 (the document), [THEMING.md](./THEMING.md) (tokens) and [EXTENDING.md](./EXTENDING.md) (the manifest).

## Before you start

```bash
pnpm install
cp -n .env.example .env
docker compose up -d hapi-fhir keycloak
FHIR_BASE_URL=http://localhost:8080/fhir pnpm seed
pnpm --filter ohs-player-web-example dev
```

Open `http://localhost:5173`.

- **Users.** `admin-user` / `admin` holds the `admin` role. `manager-user` / `manager` holds `care-team-manager`. Use both to see permissions at work, signing out between them.
- **One app at a time.** The reference app and the example app both serve on port 5173, the only port the Keycloak client redirects to. Stop one before starting the other.
- **No package build.** Both apps resolve `ohs-player-web-core` and `ohs-player-web-shell` from source, so edits to either package show up in the dev server straight away.
- **Schedule data.** The seed script creates no `Schedule` resources. Create one so the example extension has something to show:

  ```bash
  PID=$(curl -s 'http://localhost:8080/fhir/Practitioner?_count=1&_elements=id' | jq -r '.entry[0].resource.id')
  curl -s -X POST http://localhost:8080/fhir/Schedule -H 'Content-Type: application/fhir+json' -d "{
    \"resourceType\": \"Schedule\", \"active\": true,
    \"actor\": [{ \"reference\": \"Practitioner/$PID\" }],
    \"planningHorizon\": { \"start\": \"2026-09-01\", \"end\": \"2026-12-31\" } }"
  ```

## Part 1: Configuration document

The app fetches `public/portal-config.json` once at startup, validates it, and merges it over its built-in values. The dev server serves it fresh on every load, so edit the file and reload the browser. Every field is optional.

The example app starts with this document:

```json
{
  "product": { "name": "OHS Example Portal" },
  "brand": {
    "overrides": { "primary": "#0F766E", "primary-container": "#CCFBF1" },
    "darkOverrides": { "primary": "#5EEAD4" }
  },
  "navigation": [
    { "id": "users", "to": "/users", "labelKey": "navUsers", "order": 10,
      "requires": { "flag": "userMgmt", "permission": "users.view" } },
    { "id": "dashboard", "to": "/", "labelKey": "navDashboard", "order": 20,
      "requires": { "flag": "dashboard", "permission": "dashboard.view" } }
  ]
}
```

### 1. Product name

Set `"product": { "name": "Acme Health" }`. The name replaces the `appTopbarTitle` message, so it shows in the top bar and beside the logo on the sign-in page.

### 2. Brand colours, light and dark

`brand.overrides` pins colour roles in the light scheme and `brand.darkOverrides` pins them in the dark scheme. Every role you do not pin keeps the value generated from the palette. Each pin becomes a CSS variable, so `primary` becomes `--ohs-sys-color-primary`, and every component reads those variables.

```json
"brand": {
  "overrides": { "primary": "#7C3AED", "primary-container": "#EDE9FE" },
  "darkOverrides": { "primary": "#C4B5FD" }
}
```

Reload, then use the sun and moon button in the top bar to switch schemes. Everything drawn in the primary role changes colour, such as the Schedules KPI badge. The role names are listed in [THEMING.md](./THEMING.md) section 3; the reference app's schema rejects any other name.

### 3. Sidebar order and visibility

`navigation` lists the shell's own sidebar entries. It replaces the built-in list as a whole, and entries are sorted by `order`.

- **Reorder.** Swap the `order` values of `users` and `dashboard` and reload.
- **Hide.** Remove an entry. Its link disappears, but its page is still served at its path, so use a flag (next step) to switch a feature off entirely.
- **Allowed ids.** `id` must be one of the shell's screens: `dashboard`, `users`, `locations`, `organizations`, `careTeams`, `fhirViewer`, `setup`, `audit`. A screen also needs a page in the app to be useful; the example app only has Users and the dashboard.
- **Extension entries** are not listed here. They come from each extension's manifest and are sorted in among these by `order`: the example's Schedules entry, at 15, sits between the two.

### 4. Feature flags

`flags` switches features on and off by name, overriding the app's `VITE_FLAG_*` build values and any extension's defaults.

```json
"flags": { "schedules": false }
```

Reload. The Schedules sidebar entry, its dashboard tile and the "View schedules" row action all disappear, and `/schedules` renders an empty page. The flag is checked before the session, so a signed-out visitor to a switched-off page is not sent to sign-in either. Set it back to `true`.

The example app accepts any flag name. The reference app accepts only its own eight flags, listed in [DEPLOYMENT.md](./DEPLOYMENT.md) section 4, until a name is added to its `FLAG_NAMES`.

### 5. Permissions and roles

Every gated page, sidebar entry and widget names a permission, and `permissionMap` says which roles hold it. Roles come from the `roles` claim of the Keycloak token.

```json
"permissionMap": { "schedules.view": ["admin"] }
```

Sign in as `manager-user`. Schedules is gone from the sidebar, the dashboard and the row menu, and `/schedules` renders nothing. Sign in as `admin-user` and it is all back. A document key replaces that one permission and leaves the rest of the map alone.

### 6. Copy and locale

`messages` overrides any message by key, and `locale` sets the locale for dates and numbers.

```json
"messages": { "navUsers": "Staff", "schedulesTitle": "Rosters" },
"locale": "en-GB"
```

The sidebar now says Staff, and the Schedules page is titled Rosters, with planning horizons formatted as British dates. Keys come from the library catalogue (`packages/ohs-player-web-core/src/i18n/locales/en.ts`), the app's messages and each extension's messages. A key that exists nowhere renders as the key itself, which makes a typo easy to spot. `locale` does not translate: supply translated `messages` for another language.

### 7. Connection settings and gateway endpoints

`fhirBaseUrl`, `fhirVersion`, `oidcIssuer` and `clientId` point one build at another environment. `customEndpoints` maps an alias used by `useCustomEndpoint(alias)` to a gateway path starting with `/`. These are covered in [DEPLOYMENT.md](./DEPLOYMENT.md) section 4.

### 8. When the document is wrong

Set `"order": "ten"` on a navigation entry and reload.

- The app still starts. It uses the last valid document this browser loaded, kept in `localStorage` under `ohs-portal-config`, or, when there is none, the app's build-time values.
- The error names the field and what was expected, and goes to the platform `onError` callback, which logs it to the console. The reference app also shows it as a toast in development.
- The reference app refuses to build with an invalid document; `pnpm config:check` runs the same check on its own. The example app does not check at build time.
- Delete `portal-config.json` and the app starts on its build-time values with no error.

Fix the document before moving on.

## Part 2: Logo, favicon and page title

These are files, not configuration.

| Asset | Where | Notes |
| --- | --- | --- |
| Logo | `public/brand/ohs-logo.png` | The shell's `BrandMark` shows `/brand/ohs-logo.png` in the top bar and on the sign-in page, as a square. Replace the file, keeping its name, and reload. Its alt text is fixed to "Open Health Stack". |
| Product name beside the logo | `product.name` in the document | See [Part 1](#1-product-name). |
| Favicon and home-screen icon | `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` in `public/`, linked from `index.html` | The reference app ships all three. The example app links none. |
| Browser tab title | `<title>` in the app's `index.html` | Takes effect after a dev-server reload or a rebuild. |
| Sign-in page background | `packages/ohs-player-web-shell/src/assets/illustrations/login-bg.svg` | Part of the shell, so changing it is a shell change. |

In a container, mount a replacement over `/usr/share/nginx/html/brand/ohs-logo.png` the same way [DEPLOYMENT.md](./DEPLOYMENT.md) section 4 mounts the document.

## Part 3: Theme in code

The document only pins colours. Everything else about the look lives in the `ThemeConfigV2` the app passes as `portalDefaults.theme`: `apps/ohs-player-web/src/theme/sysTheme.ts` in the reference app, and `theme: {}` in the example app's `src/config/platform.ts`. The document's brand pins are merged over it, and `main.tsx` installs the result as a stylesheet before the first render.

```ts
export const portalDefaults: PortalDefaults = {
  platform: platformConfig,
  theme: {
    overrides: { primary: '#0F766E' },
    darkOverrides: { primary: '#5EEAD4' },
    typography: {
      brandFamily: '"Inter", system-ui, sans-serif',
      plainFamily: '"Inter", system-ui, sans-serif',
      monoFamily: '"JetBrains Mono", monospace',
    },
    shape: { small: '2px', medium: '4px', large: '8px' },
    density: -1,
    extraColors: { 'status-urgent': { light: '#B91C1C', dark: '#FCA5A5' } },
  },
  questionnaireVariant: 'default',
};
```

| Field | Effect |
| --- | --- |
| `overrides`, `darkOverrides` | The same colour pins as the document. |
| `typography` | Brand, plain and mono font families, plus per-role size, line height and weight in `scale`. Load the font files yourself, as `main.tsx` does for Google Sans with `@fontsource`. |
| `shape` | Corner radii: `none`, `extra-small`, `small`, `medium`, `large`, `extra-large-decreased`, `extra-large`, `full`. |
| `density` | `0`, `-1` or `-2`; tighter spacing in dense components. |
| `extraColors` | Feature colours with light and dark values, emitted as `--ohs-sys-color-<name>`. The reference app uses them for location hierarchy levels. |

To regenerate the whole palette from a new seed colour, run `pnpm scheme:generate '#0F766E'` and rebuild; see [THEMING.md](./THEMING.md) section 2.

## Part 4: Extensions

An extension adds what configuration cannot: pages, sidebar entries, dashboard widgets, actions inside existing screens, and forms. It is one folder with a manifest, installed with one line.

### Tour the example extension

The `schedules` extension in `apps/ohs-player-web-example/src/extensions/schedules` uses every registration point. Sign in as `admin-user` and check:

| Contribution | In the manifest | What you see |
| --- | --- | --- |
| Route | `routes: [{ id: 'list', path: '/schedules', load, requires }]` | `/schedules` shows a table of Schedule resources, loaded lazily behind a spinner. |
| Sidebar entry | `nav: [{ id: 'list', to: '/schedules', labelKey: 'navSchedules', order: 15, icon: IconToday, requires }]` | Schedules sits between Users (10) and Dashboard (20). |
| Dashboard widget | `widgets: [{ id: 'active', region: 'kpi', order: 50, load, requires }]` | An Active Schedules card after the built-in Total Users card. The example turns off the other screens' flags, which hides their KPI cards too. |
| Slot contribution | `slots: [{ id: 'view', slot: 'users.rowActions', order: 10, component: ViewSchedulesAction }]` | Users, then a row's ⋮ menu: View schedules opens `/schedules?actor=Practitioner/<id>`. |
| Messages, flag, permission | `messages`, `flags: { schedules: true }`, `permissions: { 'schedules.view': ['admin', 'care-team-manager'] }` | The copy above; the gates from Part 1 steps 4 and 5. |

### Build your own

This walkthrough adds a `practice` extension to the example app with a list page, a detail page, a sidebar entry, a widget in each dashboard region, a row action and a form. It reads the seeded Practitioners, so it needs no extra data. Create the files in `apps/ohs-player-web-example/src/extensions/practice/`.

#### Pages

A route's `load` imports a module whose default export is the page. A path can carry parameters.

`PracticeListPage.tsx`

```tsx
import type { Bundle, Practitioner } from '@medplum/fhirtypes';
import { useSearch, useTranslation } from 'ohs-player-web-core';
import {
  DataTable,
  EmptyState,
  Page,
  PageHeader,
  type DataTableColumn,
} from 'ohs-player-web-shell';
import { Link } from 'react-router-dom';

export default function PracticeListPage(): React.ReactElement {
  const { t } = useTranslation();
  const search = useSearch('Practitioner', { _count: '20' });
  const practitioners = ((search.data as Bundle<Practitioner> | undefined)?.entry ?? [])
    .map((entry) => entry.resource)
    .filter((resource): resource is Practitioner => Boolean(resource));

  const columns: DataTableColumn<Practitioner>[] = [
    {
      key: 'id',
      header: t('columnIdentifier'),
      mono: true,
      render: (p) => <Link to={`/practice/${p.id}`}>{p.id}</Link>,
    },
    { key: 'name', header: t('columnName'), render: (p) => p.name?.[0]?.family ?? '—' },
  ];

  return (
    <Page>
      <PageHeader title={t('practiceTitle')} />
      <DataTable
        columns={columns}
        rows={practitioners}
        rowKey={(p) => p.id ?? ''}
        loading={search.isLoading}
        emptyState={<EmptyState title={t('practiceEmpty')} />}
      />
    </Page>
  );
}
```

`PracticeDetailPage.tsx`

```tsx
import type { Practitioner } from '@medplum/fhirtypes';
import { useResource, useTranslation } from 'ohs-player-web-core';
import { Page, PageHeader, Spinner } from 'ohs-player-web-shell';
import { useParams } from 'react-router-dom';

export default function PracticeDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const { id } = useParams();
  const read = useResource('Practitioner', id);
  const practitioner = read.data as Practitioner | undefined;

  return (
    <Page>
      <PageHeader title={t('practiceDetailTitle', { id: id ?? '' })} />
      {read.isLoading ? <Spinner /> : <pre>{JSON.stringify(practitioner?.name, null, 2)}</pre>}
    </Page>
  );
}
```

The list above loads one page of twenty. To page through a larger collection on the server, use `usePagedSearch` and hand its result to the table's `serverPagination`; the table then renders `rows` as given and draws the same footer as client paging, with numbered pages when the server reports a total and previous/next only when it does not. Show a record's fields in a drawer or panel with `DetailField` inside a `.ohs-detail-grid`.

```tsx
const [page, setPage] = useState(0);
const [pageSize, setPageSize] = useState(10);
const result = usePagedSearch<Practitioner>('Practitioner', { page, pageSize });

<DataTable
  columns={columns}
  rows={result.rows}
  rowKey={(p) => p.id ?? ''}
  loading={result.isLoading}
  serverPagination={{
    page,
    pageSize,
    total: result.total,
    hasNext: result.hasNext,
    mode: result.paginationMode,
    onPageChange: setPage,
    onPageSizeChange: (size) => {
      setPageSize(size);
      setPage(0);
    },
  }}
/>;
```

#### Dashboard widgets

A widget's `load` imports a module whose default export is the tile. There are three regions:

| Region | Where | Built-in orders |
| --- | --- | --- |
| `kpi` | The strip of totals across the top | 10 to 40 |
| `main` | The wide column of the rows below | 10 to 40 |
| `side` | The narrow column beside it | 10 to 40 |

A `main` and a `side` widget with the same `order` share a row, and an `order` no built-in row uses starts a row of its own.

The built-in KPI cards follow their sidebar entry's `requires`, so switching off a screen's flag, or denying its permission, hides its card as well. Each user chooses up to four of the remaining cards with Customize Widgets, and the choice is kept per user in that browser. Extension tiles in `kpi` always render after the chosen cards and do not count toward the four.

`PracticeKpiWidget.tsx` uses the shell's `StatCard` to match the built-in cards:

```tsx
import type { Bundle } from '@medplum/fhirtypes';
import { useSearch, useTranslation } from 'ohs-player-web-core';
import { IconGroup, StatCard } from 'ohs-player-web-shell';

export default function PracticeKpiWidget(): React.ReactElement {
  const { t } = useTranslation();
  const count = useSearch('Practitioner', { _summary: 'count' });

  return (
    <StatCard
      label={t('practiceKpi')}
      value={(count.data as Bundle | undefined)?.total}
      loading={count.isLoading}
      badgeColor="var(--ohs-sys-color-primary)"
      glyph={IconGroup}
    />
  );
}
```

`PracticeMainWidget.tsx`, and a `PracticeSideWidget.tsx` that is the same with `practiceSideTitle`:

```tsx
import { useTranslation } from 'ohs-player-web-core';
import { Card, CardHeader } from 'ohs-player-web-shell';

export default function PracticeMainWidget(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('practiceMainTitle')} description={t('practiceWidgetBody')} />
    </Card>
  );
}
```

#### An action in an existing screen

A slot is a named place in a screen that renders every contribution registered for it and passes each one the slot's context. `users.rowActions` is the row menu of the users table, with `{ practitioner }` as its context. A contribution is a plain component, not a lazy one, and carries no `requires`, so gate it yourself.

`OpenPracticeAction.tsx`

```tsx
import {
  FeatureGuard,
  OhsDropdownMenu,
  PermissionGuard,
  useTranslation,
} from 'ohs-player-web-core';
import type { SlotContexts } from 'ohs-player-web-shell';
import { useNavigate } from 'react-router-dom';

export function OpenPracticeAction({
  context,
}: Readonly<{ context: SlotContexts['users.rowActions'] }>): React.ReactElement | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = context.practitioner;
  if (!id) return null;

  return (
    <FeatureGuard flag="practice">
      <PermissionGuard permission="practice.view" fallback={null}>
        <OhsDropdownMenu.Item
          className="ohs-dropdown-item"
          onSelect={() => void navigate(`/practice/${id}`)}
        >
          {t('practiceOpen')}
        </OhsDropdownMenu.Item>
      </PermissionGuard>
    </FeatureGuard>
  );
}
```

#### A form

An extension can ship FHIR Questionnaires, which the host keeps under the manifest's id. Read one with `useExtensionQuestionnaire(manifestId, key)` and render it with the library's SDC form.

`intakeQuestionnaire.ts`

```ts
import type { Questionnaire } from 'ohs-player-web-core';

export const intakeQuestionnaire: Questionnaire = {
  resourceType: 'Questionnaire',
  status: 'active',
  item: [
    { linkId: 'reason', text: 'Reason for visit', type: 'string', required: true },
    { linkId: 'notes', text: 'Notes', type: 'text' },
  ],
};
```

`PracticeIntakePage.tsx`

```tsx
import {
  QuestionnaireFields,
  useQuestionnaireFormState,
  useTranslation,
  type Questionnaire,
} from 'ohs-player-web-core';
import { EmptyState, Page, PageHeader, useExtensionQuestionnaire } from 'ohs-player-web-shell';

function IntakeForm({ questionnaire }: Readonly<{ questionnaire: Questionnaire }>) {
  const { answers, setAnswer } = useQuestionnaireFormState(questionnaire);
  return <QuestionnaireFields questionnaire={questionnaire} answers={answers} setAnswer={setAnswer} />;
}

export default function PracticeIntakePage(): React.ReactElement {
  const { t } = useTranslation();
  const questionnaire = useExtensionQuestionnaire('practice', 'intake');

  return (
    <Page>
      <PageHeader title={t('practiceIntakeTitle')} />
      {questionnaire ? (
        <IntakeForm questionnaire={questionnaire} />
      ) : (
        <EmptyState title={t('practiceEmpty')} />
      )}
    </Page>
  );
}
```

To save the answers, map them to FHIR resources, submit through the library's FHIR hooks and write an audit event, as the reference app's user flow does.

#### The manifest

`manifest.ts`

```ts
import { IconGroup, type PortalExtension } from 'ohs-player-web-shell';
import { intakeQuestionnaire } from './intakeQuestionnaire';
import { OpenPracticeAction } from './OpenPracticeAction';

const requires = { flag: 'practice', permission: 'practice.view' };

export const practiceExtension: PortalExtension = {
  id: 'practice',
  routes: [
    { id: 'list', path: '/practice', load: () => import('./PracticeListPage'), requires },
    { id: 'intake', path: '/practice/intake', load: () => import('./PracticeIntakePage'), requires },
    { id: 'detail', path: '/practice/:id', load: () => import('./PracticeDetailPage'), requires },
  ],
  nav: [
    { id: 'list', to: '/practice', labelKey: 'navPractice', order: 12, icon: IconGroup, requires },
  ],
  widgets: [
    { id: 'kpi', region: 'kpi', order: 5, load: () => import('./PracticeKpiWidget'), requires },
    { id: 'main', region: 'main', order: 25, load: () => import('./PracticeMainWidget'), requires },
    { id: 'side', region: 'side', order: 50, load: () => import('./PracticeSideWidget'), requires },
  ],
  slots: [{ id: 'open', slot: 'users.rowActions', order: 20, component: OpenPracticeAction }],
  questionnaires: { intake: intakeQuestionnaire },
  messages: {
    navPractice: 'Practice',
    practiceTitle: 'Practice',
    practiceDetailTitle: 'Practitioner {{id}}',
    practiceIntakeTitle: 'Intake',
    practiceEmpty: 'Nothing to show',
    practiceKpi: 'Practitioners',
    practiceMainTitle: 'Main column widget',
    practiceSideTitle: 'Side column widget',
    practiceWidgetBody: 'Contributed by the practice extension',
    practiceOpen: 'Open in practice',
  },
  flags: { practice: true },
  permissions: { 'practice.view': ['admin'] },
};
```

Each field in short:

- **`id`** must be unique across the app's extensions. Contributed ids become `<manifestId>.<id>`, so `list` here cannot clash with `list` in `schedules`.
- **`requires`** gates routes, sidebar entries and widgets in a fixed order: the flag, then the signed-in session, then the permission.
- **`messages`, `flags`, `permissions`, `customEndpoints`** merge into the app's configuration. An extension cannot replace a key the app, the library or another extension already declares, and the configuration document can override the extension's values.

#### Install it

Add it to `apps/ohs-player-web-example/src/extensions.ts`:

```ts
import type { PortalExtension } from 'ohs-player-web-shell';
import { practiceExtension } from './extensions/practice/manifest';
import { schedulesExtension } from './extensions/schedules/manifest';

export const extensions: readonly PortalExtension[] = [schedulesExtension, practiceExtension];
```

To install it in the reference app instead, add it to `apps/ohs-player-web/src/extensions.ts`, which is empty.

#### Check it

Sign in as `admin-user`:

| Check | Expected |
| --- | --- |
| Sidebar | Users (10), Practice (12), Schedules (15), Dashboard (20) |
| `/practice` | A list of practitioners; each id links to `/practice/<id>` |
| `/practice/intake` | A form with a required Reason field and a Notes field |
| Dashboard, top strip | Practitioners first, at order 5, before the built-in cards |
| Dashboard, main column | A new row between the recent locations (20) and recent organizations (30) rows |
| Dashboard, side column | A row of its own at the bottom, at order 50 |
| Users, row ⋮ menu | View schedules (10), then Open in practice (20) |
| Sign in as `manager-user` | All of the above is hidden: `practice.view` only lists `admin` |
| Document `"permissionMap": { "practice.view": ["admin", "care-team-manager"] }` | `manager-user` now sees it all |
| Document `"flags": { "practice": false }` | It is gone for everyone |

### What the host checks at startup

The host validates every manifest before the first render. In development a failure throws, so the page stays blank and the console names the problem. Try each change below, reload, and revert it.

| Change | Console message |
| --- | --- |
| `region: 'footer'` | `Extension "practice" is invalid: widgets[0].region must be one of "kpi", "main", "side".` |
| `slot: 'users.header'` | `Extension "practice" is invalid: slots[0].slot must name a slot: "users.rowActions".` |
| `path: 'practice'` | `Extension "practice" is invalid: routes[0].path must be a path starting with "/".` |
| `path: '/schedules'` | `Extension "practice" declares route path "/schedules", which extension "schedules" already declares.` |
| `navUsers: 'x'` added to `messages` | `Extension "practice" declares message key "navUsers", which the host already declares.` |
| `permissions` removed | `Extension "practice": route "list" requires permission "practice.view", which is not in the permission map.` |
| `id: 'schedules'` | `Extensions at positions 0 and 1 both use the id "schedules".` |

The first three are also type errors, so `pnpm typecheck` catches them before the app runs.

In a production build, the same failure goes to the platform `onError` callback instead, the failing extension is dropped, and the app and every valid extension still render. To see it, make a change that still type-checks, such as removing `permissions`, then:

```bash
pnpm --filter ohs-player-web-example build
pnpm --filter ohs-player-web-example preview -- --port 5173 --strictPort
```

### A contribution that crashes

Add `throw new Error('boom')` to the top of `PracticeSideWidget`. Only that tile turns into an error card; the rest of the dashboard renders. A slot contribution that throws is contained the same way within its menu.

## Part 5: Automated tests

```bash
pnpm typecheck && pnpm lint && pnpm test
```

To test your own extension, follow [EXTENDING.md](./EXTENDING.md#testing-an-extension):

- Validate the manifest with `validateExtensionManifest` and the shell's `DASHBOARD_REGIONS` and `SLOT_NAMES`, as `src/extensions/schedules/manifest.test.ts` does.
- Test each page and widget on its own for success, loading, empty and error states, with an axe check.
- Render the whole app with `createPortalHost` and `PortalHost`, as `src/host.test.tsx` does. That test asserts the example's exact sidebar and KPI strip, so it fails while the `practice` extension from Part 4 is installed.

## Limits today

- **Logo.** The logo path and its alt text are fixed in the shell's `BrandMark`; a deployment replaces the file rather than configuring it.
- **Sign-in background.** It is part of the shell package.
- **Slots.** `users.rowActions` is the only slot. More need a shell change.
- **Replacing components.** An extension adds UI; it cannot replace a built-in component.
- **Sidebar ids.** The document's `navigation` only positions the shell's own screens. Extension entries are positioned by their manifest `order`.
- **Extension flags in the reference app.** The reference app's document only accepts its own flag names until an extension's flag is added to `FLAG_NAMES`.
