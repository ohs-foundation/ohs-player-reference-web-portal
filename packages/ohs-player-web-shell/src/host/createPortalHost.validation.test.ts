import { describe, expect, it, vi } from 'vitest';
import type { PortalRoute } from '../routes/types';
import { testPortalDefaults } from '../test/testPlatformConfig';
import { createPortalHost, type PortalHostInput } from './createPortalHost';
import type { PortalExtension } from './types';

const load = () => Promise.resolve({ default: () => null });

function extension(id: string, parts: Omit<PortalExtension, 'id'> = {}): PortalExtension {
  return { id, ...parts };
}

const reports: PortalExtension = extension('reports', {
  routes: [{ id: 'list', path: '/reports', load, requires: { permission: 'reports.view' } }],
  nav: [{ id: 'list', to: '/reports', labelKey: 'navReports', order: 25 }],
  widgets: [{ id: 'count', region: 'kpi', order: 50, load }],
  slots: [{ id: 'open', slot: 'users.rowActions', order: 10, component: () => null }],
  messages: { navReports: 'Reports' },
  permissions: { 'reports.view': ['admin'] },
});

function inDevelopment(input: Partial<PortalHostInput>) {
  return () => createPortalHost({ defaults: testPortalDefaults, development: true, ...input });
}

function inProduction(input: Partial<PortalHostInput>) {
  const onError = vi.fn();
  const defaults = {
    ...testPortalDefaults,
    platform: { ...testPortalDefaults.platform, onError },
  };
  return { host: createPortalHost({ defaults, development: false, ...input }), onError };
}

function reportedMessages(onError: ReturnType<typeof vi.fn>): string[] {
  return onError.mock.calls.map(([error]) => (error instanceof Error ? error.message : ''));
}

describe('createPortalHost startup validation', () => {
  it('prefixes every contributed id with the manifest id', () => {
    const { contributions } = inDevelopment({ extensions: [reports] })();

    expect(contributions.routes.map((route) => route.id)).toEqual(['reports.list']);
    expect(contributions.nav.map((entry) => entry.id)).toEqual(['reports.list']);
    expect(contributions.widgets.map((widget) => widget.id)).toEqual(['reports.count']);
    expect(contributions.slots.map((slot) => slot.id)).toEqual(['reports.open']);
  });

  it('fails when two manifests claim the same id, naming both', () => {
    const twin = extension('reports', { messages: { reportsTwin: 'Twin' } });

    expect(inDevelopment({ extensions: [reports, twin] })).toThrow(
      'Extensions at positions 0 and 1 both use the id "reports".',
    );
  });

  it('fails when two manifests declare the same key, naming both', () => {
    const rival = extension('audits', { messages: { navReports: 'Audit reports' } });

    expect(inDevelopment({ extensions: [reports, rival] })).toThrow(
      'Extension "audits" declares message key "navReports", which extension "reports" already declares.',
    );
  });

  it.each([
    ['message key', extension('clash', { messages: { loading: 'Busy' } }), 'loading'],
    ['flag', extension('clash', { flags: { userMgmt: false } }), 'userMgmt'],
    ['permission', extension('clash', { permissions: { 'users.view': ['admin'] } }), 'users.view'],
    [
      'custom endpoint alias',
      extension('clash', { customEndpoints: { users: '/api/other' } }),
      'users',
    ],
  ])('fails when an extension redeclares a host %s', (kind, manifest, key) => {
    expect(inDevelopment({ extensions: [manifest] })).toThrow(
      `Extension "clash" declares ${kind} "${key}", which the host already declares.`,
    );
  });

  it('fails when an extension routes a path the host already serves', () => {
    const routes: PortalRoute[] = [{ id: 'users', path: '/users', load }];
    const clash = extension('clash', { routes: [{ id: 'users', path: '/users', load }] });

    expect(inDevelopment({ extensions: [clash], routes })).toThrow(
      'Extension "clash" declares route path "/users", which the host already declares.',
    );
  });

  it('fails when a requires.permission is not in the merged permission map', () => {
    const unmapped = extension('audits', {
      nav: [
        {
          id: 'list',
          to: '/audits',
          labelKey: 'navReports',
          order: 30,
          requires: { permission: 'audits.view' },
        },
      ],
    });

    expect(inDevelopment({ extensions: [unmapped] })).toThrow(
      'Extension "audits": nav entry "list" requires permission "audits.view", which is not in the permission map.',
    );
  });

  it('accepts a permission that another extension or the document maps', () => {
    const usesReports = extension('dashboards', {
      widgets: [
        { id: 'chart', region: 'main', order: 5, load, requires: { permission: 'reports.view' } },
      ],
    });
    const usesDocument = extension('exports', {
      routes: [{ id: 'list', path: '/exports', load, requires: { permission: 'exports.run' } }],
    });

    const host = inDevelopment({
      extensions: [reports, usesReports, usesDocument],
      document: { permissionMap: { 'exports.run': ['admin'] } },
    })();

    expect(host.contributions.widgets.map((widget) => widget.id)).toContain('dashboards.chart');
    expect(host.routes.map((route) => route.id)).toContain('exports.list');
  });

  it('in production reports through onError, drops the manifest and keeps the rest', () => {
    const twin = extension('reports', { messages: { reportsTwin: 'Twin' } });
    const unmapped = extension('audits', {
      routes: [{ id: 'list', path: '/audits', load, requires: { permission: 'audits.view' } }],
    });

    const { host, onError } = inProduction({ extensions: [reports, twin, unmapped] });

    expect(reportedMessages(onError)).toEqual([
      'Extensions at positions 0 and 1 both use the id "reports".',
      'Extension "audits": route "list" requires permission "audits.view", which is not in the permission map.',
    ]);
    expect(host.routes.map((route) => route.id)).toEqual(['reports.list']);
    expect(host.portal.platform.i18n?.messages).not.toHaveProperty('reportsTwin');
    expect(host.portal.navigation.length).toBeGreaterThan(0);
  });
});
