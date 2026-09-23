# Extending the portal

The portal is three packages: `ohs-player-web-core` (the library), `ohs-player-web-shell` (the portal frame and the extension host) and an application that composes them, such as `apps/ohs-player-web`. See [ARCHITECTURE.md](./ARCHITECTURE.md) for what each owns and [CORE_PUBLIC_API.md](./CORE_PUBLIC_API.md) for the library's exports. For a hands-on tour of every customization and extension point, run in the browser, see [CUSTOMIZING.md](./CUSTOMIZING.md).

## Choosing how to change the portal

Pick the first option that does the job. Each later one is more code for you to own.

1. **Configure the deployment.** `public/portal-config.json` sets the product name, brand colours, feature flags, sidebar order, permission map, messages, locale and gateway endpoint aliases, with no rebuild. See [DEPLOYMENT.md](./DEPLOYMENT.md) section 4.
2. **Retheme.** Change the app's `ThemeConfigV2`, or the document's brand pins, as in [Override theme tokens](#override-theme-tokens) below.
3. **Write an extension.** Pages, sidebar entries, dashboard widgets, slot contributions, messages, flag defaults, permissions, endpoint aliases and questionnaires, declared in one manifest and kept in one folder. Installing it is one line. Upgrading the shell is a version bump, because nothing outside the folder changes.
4. **Change the app or the shell.** Add a feature folder to the application, or change the shell itself when every deployment needs the change. This is the only option that edits code another team maintains.

## Writing an extension

An extension is a folder with a manifest in it. The example application, [`apps/ohs-player-web-example`](../apps/ohs-player-web-example), ships one, `schedules`, in [`src/extensions/schedules`](../apps/ohs-player-web-example/src/extensions/schedules). It uses every registration point, and the snippets below come from it.

### The manifest

```ts
import { IconToday, type PortalExtension } from 'ohs-player-web-shell';
import { schedulesMessages } from './messages';
import { ViewSchedulesAction } from './ViewSchedulesAction';

const requires = { flag: 'schedules', permission: 'schedules.view' };

export const schedulesExtension: PortalExtension = {
  id: 'schedules',
  routes: [{ id: 'list', path: '/schedules', load: () => import('./SchedulesPage'), requires }],
  nav: [
    {
      id: 'list',
      to: '/schedules',
      labelKey: 'navSchedules',
      order: 15,
      icon: IconToday,
      requires,
    },
  ],
  widgets: [
    {
      id: 'active',
      region: 'kpi',
      order: 50,
      load: () => import('./ActiveSchedulesWidget'),
      requires,
    },
  ],
  slots: [{ id: 'view', slot: 'users.rowActions', order: 10, component: ViewSchedulesAction }],
  messages: schedulesMessages,
  flags: { schedules: true },
  permissions: { 'schedules.view': ['admin', 'care-team-manager'] },
};
```

`PortalExtension` is the library's `ExtensionManifest` bound to this shell's dashboard regions and slots, so a region or slot the shell does not declare is a compile error. There is no version field; the library version carries the contract.

### Pages

A route has an `id`, a `path` and `load`, a function that imports a module whose **default export** is the page, as `React.lazy` expects. The host serves it under the portal frame, next to the application's own pages, and shows a spinner while the chunk loads.

`requires` gates it in a fixed order: the feature **flag** first (a switched-off page renders nothing), then the **session** (a signed-out visitor goes to sign-in), then the **permission**. A path the host already serves, or another extension's path, fails startup. Paths may carry route parameters, such as `/schedules/:id`, which the page reads with `useParams`.

### Sidebar entries

A nav entry has an `id`, `to`, a `labelKey` from your messages, an integer `order` and optional `requires`. The shell's entries are spaced ten apart (the reference sidebar runs 10 to 70), so an order of 25 lands between the entries at 20 and 30. `icon` and `activeIcon` take any component with a `size` prop, such as the shell's icons; without them the entry uses a default icon.

The configuration document's `navigation` list positions the shell's own entries. Extension entries are sorted in among them by `order`.

### Dashboard widgets

A widget has an `id`, a `region`, an integer `order`, `load` (a module whose default export is the tile) and optional `requires`.

| Region | Where |
| --- | --- |
| `kpi` | The strip of totals across the top. The built-in cards are at orders 10 to 40, and the shell's `StatCard` renders a matching card. Each user picks up to four built-in cards with Customize Widgets; an extension tile always renders after them and does not count toward the four. |
| `main` | The wide column of the rows below. |
| `side` | The narrow column. A `main` and a `side` widget with the same `order` share a row. The built-in rows are at 10 to 40, and an `order` no built-in row uses starts a row of its own. |

```tsx
import type { Bundle } from '@medplum/fhirtypes';
import { useSearch, useTranslation } from 'ohs-player-web-core';
import { IconToday, StatCard } from 'ohs-player-web-shell';

export default function ActiveSchedulesWidget(): React.ReactElement {
  const { t } = useTranslation();
  const active = useSearch('Schedule', { active: 'true', _summary: 'count' });

  return (
    <StatCard
      label={t('schedulesKpi')}
      value={(active.data as Bundle | undefined)?.total}
      loading={active.isLoading}
      badgeColor="var(--ohs-sys-color-primary)"
      glyph={IconToday}
    />
  );
}
```

A widget whose flag is off or whose permission is denied is left out. One that throws renders an error tile in its own place, and the rest of the dashboard carries on.

### Slot contributions

A slot is a named place on a screen that renders every contribution registered for it, in `order`, and passes each one the slot's context. A contribution is a plain component (not lazy, so a menu item appears as soon as the menu opens) that receives `{ context }`.

| Slot | Where | Context |
| --- | --- | --- |
| `users.rowActions` | The row menu of a users table | `{ practitioner: Practitioner }` |

```tsx
import { FeatureGuard, OhsDropdownMenu, PermissionGuard, useTranslation } from 'ohs-player-web-core';
import type { SlotContexts } from 'ohs-player-web-shell';
import { useNavigate } from 'react-router-dom';

export function ViewSchedulesAction({
  context,
}: Readonly<{ context: SlotContexts['users.rowActions'] }>): React.ReactElement | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = context.practitioner;
  if (!id) return null;

  const actor = encodeURIComponent(`Practitioner/${id}`);
  return (
    <FeatureGuard flag="schedules">
      <PermissionGuard permission="schedules.view" fallback={null}>
        <OhsDropdownMenu.Item
          className="ohs-dropdown-item"
          onSelect={() => void navigate(`/schedules?actor=${actor}`)}
        >
          {t('schedulesViewForUser')}
        </OhsDropdownMenu.Item>
      </PermissionGuard>
    </FeatureGuard>
  );
}
```

Contributions carry no `requires`; gate one yourself, as above. One that throws renders an error in its own place and the screen around it is untouched. The application that owns a screen places its slot with `<Slot name="users.rowActions" context={{ practitioner }} />`.

### Messages, flags, permissions, endpoints and questionnaires

- **`messages`**: flat camelCase keys, in the same style as the app's catalogue. Use them with `useTranslation().t(key)`.
- **`flags`**: defaults for your flags. Read them with `useFlag` or `FeatureGuard`.
- **`permissions`**: permission key to the roles that hold it. Every `requires.permission` on a route, nav entry or widget must exist in the merged map.
- **`customEndpoints`**: gateway aliases for `useCustomEndpoint(alias)`.
- **`questionnaires`**: FHIR Questionnaires under keys of your choosing. Read them with `useExtensionQuestionnaire(manifestId, key)`.

The host merges these in order: the application's defaults, then the extensions, then the configuration document. An extension cannot replace a key the application or core already defines, and a deployment can still override an extension's flag default, roles or copy from `portal-config.json`.

That document is validated by the application's own schema first. The example application accepts any flag name. The reference application only accepts the names in `FLAG_NAMES` in [`config/portalConfigSchema.ts`](../apps/ohs-player-web/src/config/portalConfigSchema.ts), so a document that sets an extension's flag is invalid there, and the app falls back to its last valid document or its build-time values. To let deployments of the reference app switch an extension's flag, add the name to `FLAG_NAMES` and run `pnpm config-schema:generate`.

### Installing an extension

Add it to the application's extensions list. [`apps/ohs-player-web-example/src/extensions.ts`](../apps/ohs-player-web-example/src/extensions.ts):

```ts
import type { PortalExtension } from 'ohs-player-web-shell';
import { schedulesExtension } from './extensions/schedules/manifest';

export const extensions: readonly PortalExtension[] = [schedulesExtension];
```

The application passes the list to `createPortalHost` once, before render, and renders `PortalHost`:

```tsx
const host = createPortalHost({
  defaults: portalDefaults,
  document: configDocument,
  extensions,
  routes: appRoutes,
  development: import.meta.env.DEV,
});
installThemeCss(host.portal.theme);
createRoot(document.getElementById('root')!).render(<PortalHost host={host} />);
```

### Validation and failure

At startup the host checks every manifest:

1. **Shape:** `validateExtensionManifest` from the library, with the shell's `DASHBOARD_REGIONS` and `SLOT_NAMES`. It checks the id, unknown top-level keys, ids unique within each list, route paths and loaders, nav fields, widget regions, slot names, and the value types of the flat maps.
2. **Clashes:** a manifest id another manifest uses, or a key, contributed id or route path that the host or another extension already declares. The host's claims grow with each release: `0.2.0` adds the route path `/audit`, the flag `auditLog`, the permission `audit.view` and the reference app's `navAudit`, `pageAudit*`, `audit*` and `tableShowingRange` message keys, so an extension that already declares one of them is rejected after the upgrade.
3. **Permissions:** every `requires.permission` must be in the merged permission map.

Contributed ids become `<manifestId>.<id>`. With `development: true` the first failure throws before anything renders. The message names the extension, the field path and what was expected:

```text
Extension "schedules" is invalid: widgets[0].region must be one of "kpi", "main", "side".
```

In production the same error goes to the platform's `onError` callback and that manifest is dropped. The shell and every valid extension still render.

### Testing an extension

- Run the manifest through the validator with the shell's rules, as [`manifest.test.ts`](../apps/ohs-player-web-example/src/extensions/schedules/manifest.test.ts) does:

  ```ts
  const result = validateExtensionManifest(schedulesExtension, {
    regions: DASHBOARD_REGIONS,
    slots: SLOT_NAMES,
  });
  expect(result.success ? [] : result.errors).toEqual([]);
  ```

- Test pages and widgets on their own. Mock the core hooks they call with a module-level `vi.mock('ohs-player-web-core', …)` that spreads the real module, render inside `CorePlatformProvider`, and cover success, loading, empty and error with an axe check. See [`SchedulesPage.test.tsx`](../apps/ohs-player-web-example/src/extensions/schedules/SchedulesPage.test.tsx).
- Test the extension inside the host by rendering `PortalHost` from `createPortalHost`, as the example's [`host.test.tsx`](../apps/ohs-player-web-example/src/host.test.tsx) does for the sidebar order, the widget's region and the row action.
- Try it in the browser by running the example application with `pnpm --filter ohs-player-web-example dev`. [CUSTOMIZING.md](./CUSTOMIZING.md) walks through what to check.

## Adding a feature to the reference app

A feature that every deployment of the reference app ships goes in its own folder under `apps/ohs-player-web/src/features/`.

1. Add `VITE_FLAG_MY_FEATURE=true` to `.env` (see `.env.example`).
2. In [`config/env.ts`](../apps/ohs-player-web/src/config/env.ts), expose the flag (e.g. `myFeature: import.meta.env.VITE_FLAG_MY_FEATURE !== 'false'`).
3. In [`config/platform.ts`](../apps/ohs-player-web/src/config/platform.ts), add the key to `flags.flags` (e.g. `myFeature: env.flags.myFeature`).
4. Add the name to `FLAG_NAMES` in [`config/portalConfigSchema.ts`](../apps/ohs-player-web/src/config/portalConfigSchema.ts) so the configuration document can set it at runtime, then run `pnpm config-schema:generate`.
5. Add the page to `appRoutes` in [`AppRoutes.tsx`](../apps/ohs-player-web/src/AppRoutes.tsx) with `requires: { flag: 'myFeature', permission: '…' }`. The host gates it in the same order as an extension route.

A sidebar entry for a built-in feature is a shell change: add its id to `NAV_IDS` and `DEFAULT_NAVIGATION` in the shell's [`config/navigation.ts`](../packages/ohs-player-web-shell/src/config/navigation.ts), give it icons in `NAV_ICONS` in the shell's `layout/AppLayout.tsx`, and list it in `public/portal-config.json` with an `order` between its neighbours. If only some deployments need the feature, write it as an extension instead.

## Override theme tokens

Edit the `ThemeConfigV2` in [`apps/ohs-player-web/src/theme/sysTheme.ts`](../apps/ohs-player-web/src/theme/sysTheme.ts), which the app passes as `portalDefaults.theme`. The host merges the configuration document's brand pins over it, and `main.tsx` passes the result to `installThemeCss` before render. Pins in `overrides` and `darkOverrides` map to CSS variables such as `--ohs-sys-color-primary`; feature colours go in `extraColors`. To change a pin without a rebuild, set it in the `brand` section of `public/portal-config.json` ([DEPLOYMENT.md](./DEPLOYMENT.md) section 4). See [THEMING.md](./THEMING.md).

## Register and call a custom gateway endpoint

1. Add an alias in `customEndpoints`, e.g. `{ myAction: '/custom/my-action' }`: in the app's `platform.ts`, the configuration document, or an extension's manifest.
2. In a component: `const { post } = useCustomEndpoint('myAction');` then `post.mutateAsync(body)`.

Resolution strips `/fhir` from `fhirBaseUrl` and appends the mapped path for non-FHIR gateway calls.

## Add a FHIR Viewer resource type

The FHIR Viewer (`/resources`) is registry-driven. Adding a type is **one registry row + one i18n label** — no screens, routes, or components change.

1. Add an entry to `ENTRIES` in [`apps/ohs-player-web/src/features/fhir-viewer/registry.ts`](../apps/ohs-player-web/src/features/fhir-viewer/registry.ts): `['Endpoint', '_id', 'status']` — `[resourceType, searchParam, statusFacet?]`. Use `'name'` for `searchParam` only if the type declares a `name` search parameter; otherwise `'_id'`. Set `statusFacet` only where the type has a plain `active`/`status` search param.
2. Add its label to [`appMessages.ts`](../apps/ohs-player-web/src/i18n/appMessages.ts): `fhirTypeEndpoint: 'Endpoint'` (key is `fhirType<ResourceType>`, value is the FHIR spec spelling, humanised).

**FHIR-only rule (enforced):** every `resourceType` must be a real FHIR R4 type present in the backend `CapabilityStatement`. `registry.test.ts` fails the build for any entry that isn't — so a non-FHIR label (e.g. the design's mislabeled "Medication Required") cannot ship; it maps to its real type (`MedicationRequest`) or is dropped.

### Governing rules & known constraints

- **Backend wins over design.** Only valid FHIR R4 types appear; display/search/pagination adapt to what the backend serves, not to the Figma mockup.
- **Delete is a hard FHIR `DELETE`**, gated by `fhir-viewer.edit` (admin) with a mandatory confirm — an explicit exception to the repo's deactivate-first convention, justified by the viewer being a raw admin/debug tool where deactivation doesn't generalize across arbitrary types.
- **Edit is raw JSON** (a power-user surface), outside the SDC/typed-form path; `resourceType`/`id` are immutable.
- **Seed prerequisite:** the demo HAPI store starts empty — run `pnpm seed` before expecting rows. Only `Organization`/`Practitioner`/`Location`/`CareTeam` are seeded today; other types show the empty state until seeded.
- **Gateway constraint (backend ticket):** the viewer's FHIR reads work via the dev direct-HAPI proxy. The OHS Info Gateway 401s all `/fhir` reads without a `patient_list` token claim the realm doesn't issue, so against the gateway the viewer renders the "not available from this backend" state for every type until a Keycloak realm mapper is added.
