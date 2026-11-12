import { describe, expect, it } from 'vitest';
import { diffDocuments, guardedChanges } from './documentDiff';

const nav = (id: string, order: number) => ({ id, to: `/${id}`, labelKey: `nav${id}`, order });

describe('diffDocuments', () => {
  it('finds nothing when the documents match, whatever their key order', () => {
    expect(
      diffDocuments(
        { locale: 'en', flags: { a: true, b: false } },
        {
          flags: { b: false, a: true },
          locale: 'en',
        },
      ),
    ).toEqual([]);
  });

  it('reports a changed scalar with both values', () => {
    expect(diffDocuments({ locale: 'en' }, { locale: 'sw' })).toEqual([
      { kind: 'changed', field: 'locale', path: 'locale', before: 'en', after: 'sw' },
    ]);
  });

  it('reports added and removed keys, nested ones included', () => {
    expect(
      diffDocuments(
        { brand: { overrides: { primary: '#094F9A' } }, locale: 'en' },
        { brand: { overrides: { primary: '#094F9A', error: '#E50000' } } },
      ),
    ).toEqual([
      {
        kind: 'added',
        field: 'brand',
        path: 'brand.overrides.error',
        after: '#E50000',
      },
      { kind: 'removed', field: 'locale', path: 'locale', before: 'en' },
    ]);
  });

  it('quotes a key that is not a plain name, as validation errors do', () => {
    expect(
      diffDocuments(
        { permissionMap: { 'users.edit': ['admin'] } },
        { permissionMap: { 'users.edit': ['admin', 'care-team-manager'] } },
      ),
    ).toEqual([
      {
        kind: 'changed',
        field: 'permissionMap',
        path: 'permissionMap["users.edit"]',
        before: ['admin'],
        after: ['admin', 'care-team-manager'],
      },
    ]);
  });

  it('matches navigation entries by id, so a reorder reads as order changes', () => {
    const before = { navigation: [nav('users', 10), nav('audit', 20)] };
    const after = { navigation: [nav('audit', 10), nav('users', 20)] };

    expect(
      diffDocuments(before, after).map(({ kind, path, before: was, after: now }) => ({
        kind,
        path,
        was,
        now,
      })),
    ).toEqual([
      { kind: 'changed', path: 'navigation.users.order', was: 10, now: 20 },
      { kind: 'changed', path: 'navigation.audit.order', was: 20, now: 10 },
    ]);
  });

  it('reports a navigation entry added or removed by its id', () => {
    const changes = diffDocuments(
      { navigation: [nav('users', 10), nav('setup', 20)] },
      { navigation: [nav('users', 10), nav('audit', 30)] },
    );
    expect(changes.map(({ kind, path }) => [kind, path])).toEqual([
      ['removed', 'navigation.setup'],
      ['added', 'navigation.audit'],
    ]);
  });

  it('compares arrays as one value when ids repeat or are missing', () => {
    const repeated = { navigation: [nav('users', 10), nav('users', 20)] };
    expect(diffDocuments({ navigation: [nav('users', 10)] }, repeated)).toEqual([
      {
        kind: 'changed',
        field: 'navigation',
        path: 'navigation',
        before: [nav('users', 10)],
        after: repeated.navigation,
      },
    ]);
    expect(
      diffDocuments(
        { dashboard: { layout: { kpi: ['kpi.users'] } } },
        {
          dashboard: { layout: { kpi: ['kpi.locations'] } },
        },
      ).map((entry) => entry.path),
    ).toEqual(['dashboard.layout.kpi']);
  });

  it('reports a value that changes between an object and a scalar as changed', () => {
    expect(diffDocuments({ product: { name: 'OHS' } }, { product: 'OHS' })).toEqual([
      {
        kind: 'changed',
        field: 'product',
        path: 'product',
        before: { name: 'OHS' },
        after: 'OHS',
      },
    ]);
  });
});

describe('guardedChanges', () => {
  it('keeps the changes to connection, permission, endpoint and schema fields', () => {
    const changes = diffDocuments(
      {
        $schema: './portal-config.schema.json',
        locale: 'en',
        permissionMap: { 'users.edit': ['admin'] },
      },
      {
        locale: 'sw',
        oidcIssuer: 'https://idp.example/realms/ohs',
        permissionMap: { 'users.edit': ['admin'], 'users.view': ['nurse'] },
        customEndpoints: { users: '/api/users' },
      },
    );

    expect(guardedChanges(changes).map((entry) => entry.path)).toEqual([
      '$schema',
      'permissionMap["users.view"]',
      'oidcIssuer',
      'customEndpoints',
    ]);
  });
});
