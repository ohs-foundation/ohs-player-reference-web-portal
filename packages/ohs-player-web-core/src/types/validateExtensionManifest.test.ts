import { describe, expect, it } from 'vitest';
import { validateExtensionManifest } from './validateExtensionManifest';

const rules = { regions: ['kpi', 'main', 'side'], slots: ['users.rowActions'] };
const load = () => Promise.resolve({ default: () => null });

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'schedules',
    routes: [
      {
        id: 'list',
        path: '/schedules',
        load,
        requires: { flag: 'schedules', permission: 'schedules.view' },
      },
    ],
    nav: [{ id: 'list', to: '/schedules', labelKey: 'navSchedules', order: 25 }],
    widgets: [{ id: 'active', region: 'kpi', order: 50, load }],
    slots: [{ id: 'view', slot: 'users.rowActions', order: 10, component: () => null }],
    messages: { navSchedules: 'Schedules' },
    flags: { schedules: true },
    permissions: { 'schedules.view': ['admin'] },
    customEndpoints: { schedules: '/api/schedules' },
    questionnaires: { schedule: { resourceType: 'Questionnaire' } },
    ...overrides,
  };
}

function errorsOf(input: unknown): { path: string; message: string }[] {
  const result = validateExtensionManifest(input, rules);
  return result.success ? [] : result.errors;
}

describe('validateExtensionManifest', () => {
  it('accepts a valid manifest', () => {
    const result = validateExtensionManifest(manifest(), rules);

    expect(result.success).toBe(true);
  });

  it('reports an id repeated within a list', () => {
    const routes = [
      { id: 'list', path: '/schedules', load },
      { id: 'list', path: '/schedules/new', load },
    ];

    expect(errorsOf(manifest({ routes }))).toEqual([
      { path: 'routes[1].id', message: 'repeats the id "list" already used in routes' },
    ]);
  });

  it('reports a widget in a region the host does not declare', () => {
    const widgets = [{ id: 'active', region: 'sidebar', order: 50, load }];

    expect(errorsOf(manifest({ widgets }))).toEqual([
      { path: 'widgets[0].region', message: 'must be one of "kpi", "main", "side"' },
    ]);
  });

  it('reports a slot contribution that names no declared slot', () => {
    const slots = [{ id: 'view', slot: 'users.rowAction', order: 10, component: () => null }];

    expect(errorsOf(manifest({ slots }))).toEqual([
      { path: 'slots[0].slot', message: 'must name a slot: "users.rowActions"' },
    ]);
  });

  it('reports a route without a path or a page loader', () => {
    const routes = [{ id: 'list', path: 'schedules' }];

    expect(errorsOf(manifest({ routes }))).toEqual([
      { path: 'routes[0].path', message: 'must be a path starting with "/"' },
      { path: 'routes[0].load', message: 'must be a function that imports the page' },
    ]);
  });

  it('reports a nav entry missing its id, label key or order', () => {
    const nav = [{ to: '/schedules', order: 2.5 }];

    expect(errorsOf(manifest({ nav })).map((issue) => issue.path)).toEqual([
      'nav[0].id',
      'nav[0].labelKey',
      'nav[0].order',
    ]);
  });

  it('reports an unknown key, so a misspelt registration point is not silently ignored', () => {
    expect(errorsOf(manifest({ route: [] })).map((issue) => issue.path)).toEqual(['route']);
  });

  it('reports values of the wrong type in the flat maps', () => {
    const issues = errorsOf(
      manifest({
        messages: { navSchedules: 42 },
        flags: { schedules: 'yes' },
        permissions: { 'schedules.view': 'admin' },
        customEndpoints: { schedules: 'api/schedules' },
      }),
    );

    expect(issues.map((issue) => issue.path)).toEqual([
      'messages.navSchedules',
      'flags.schedules',
      'permissions.schedules.view',
      'customEndpoints.schedules',
    ]);
  });

  it('reports a requirement that is neither a flag nor a permission', () => {
    const routes = [{ id: 'list', path: '/schedules', load, requires: { role: 'admin' } }];

    expect(errorsOf(manifest({ routes }))).toEqual([
      {
        path: 'routes[0].requires.role',
        message: 'is not a requirement; expected flag or permission',
      },
    ]);
  });

  it('reports a manifest that is not an object or has no id', () => {
    expect(errorsOf(null)).toEqual([{ path: '', message: 'must be an object' }]);
    expect(errorsOf(manifest({ id: ' ' }))).toEqual([
      { path: 'id', message: 'must be a non-empty string' },
    ]);
  });
});
