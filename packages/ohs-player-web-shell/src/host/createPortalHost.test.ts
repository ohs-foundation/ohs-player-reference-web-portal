import { describe, expect, it, vi } from 'vitest';
import { resolvePortalConfig } from '../config/resolvePortalConfig';
import type { PortalRoute } from '../routes/types';
import { testPortalDefaults } from '../test/testPlatformConfig';
import { SHELL_MESSAGES } from '../i18n/shellMessages';
import { createPortalHost } from './createPortalHost';
import type { PortalExtension } from './types';

const load = () => Promise.resolve({ default: () => null });

const schedules: PortalExtension = {
  id: 'schedules',
  routes: [{ id: 'list', path: '/schedules', load }],
  nav: [{ id: 'list', to: '/schedules', labelKey: 'navSchedules', order: 25 }],
  messages: { navSchedules: 'Schedules' },
  flags: { schedules: true },
  permissions: { 'schedules.view': ['admin'] },
  customEndpoints: { schedules: '/api/schedules' },
  questionnaires: { schedule: { resourceType: 'Questionnaire', title: 'Schedule' } },
};

const appRoutes: PortalRoute[] = [{ id: 'users', path: '/users', load }];

describe('createPortalHost', () => {
  it('resolves to the plain configuration when there are no extensions', () => {
    const document = { product: { name: 'County Health' } };
    const host = createPortalHost({ defaults: testPortalDefaults, document, development: true });

    const { platform } = testPortalDefaults;
    const withShellCopy = {
      ...testPortalDefaults,
      platform: {
        ...platform,
        i18n: { ...platform.i18n, messages: { ...SHELL_MESSAGES, ...platform.i18n?.messages } },
      },
    };
    expect(host.portal).toEqual(resolvePortalConfig(withShellCopy, document));
  });

  it("merges an extension's messages, flag defaults, permissions and endpoints", () => {
    const { platform } = createPortalHost({
      defaults: testPortalDefaults,
      extensions: [schedules],
      development: true,
    }).portal;

    expect(platform.i18n?.messages).toMatchObject({ navSchedules: 'Schedules' });
    expect(platform.flags?.flags).toMatchObject({ schedules: true });
    expect(platform.rbac?.permissionMap).toMatchObject({ 'schedules.view': ['admin'] });
    expect(platform.customEndpoints).toMatchObject({ schedules: '/api/schedules' });
  });

  it("keeps every one of the host's own values alongside the extension's", () => {
    const { platform } = createPortalHost({
      defaults: testPortalDefaults,
      extensions: [schedules],
      development: true,
    }).portal;
    const defaults = testPortalDefaults.platform;

    expect(platform.i18n?.messages).toMatchObject(defaults.i18n?.messages ?? {});
    expect(platform.flags?.flags).toMatchObject(defaults.flags?.flags ?? {});
    expect(platform.rbac?.permissionMap).toMatchObject(defaults.rbac?.permissionMap ?? {});
    expect(platform.customEndpoints).toMatchObject(defaults.customEndpoints ?? {});
  });

  it("lets the configuration document override an extension's flag default, roles and copy", () => {
    const { platform } = createPortalHost({
      defaults: testPortalDefaults,
      document: {
        flags: { schedules: false },
        permissionMap: { 'schedules.view': ['care-team-manager'] },
        messages: { navSchedules: 'Rotas' },
      },
      extensions: [schedules],
      development: true,
    }).portal;

    expect(platform.flags?.flags?.schedules).toBe(false);
    expect(platform.rbac?.permissionMap['schedules.view']).toEqual(['care-team-manager']);
    expect(platform.i18n?.messages).toMatchObject({ navSchedules: 'Rotas' });
  });

  it('registers questionnaires under the manifest id', () => {
    const { contributions } = createPortalHost({
      defaults: testPortalDefaults,
      extensions: [schedules],
      development: true,
    });

    expect(contributions.questionnaires).toEqual({
      schedules: { schedule: { resourceType: 'Questionnaire', title: 'Schedule' } },
    });
  });

  it('accepts document message keys the library, the app or an extension declares', () => {
    const host = createPortalHost({
      defaults: testPortalDefaults,
      document: { messages: { saving: 'Working…', logoutHeading: 'Bye', navSchedules: 'Rosters' } },
      extensions: [schedules],
      development: true,
    });

    expect(host.unknownMessageKeys).toEqual([]);
  });

  it('reports a misspelled document message key without throwing, with the key it meant', () => {
    const onError = vi.fn();
    const host = createPortalHost({
      defaults: { ...testPortalDefaults, platform: { ...testPortalDefaults.platform, onError } },
      document: { messages: { navSchedles: 'Rosters' } },
      extensions: [schedules],
      development: true,
    });

    expect(host.unknownMessageKeys).toEqual([{ key: 'navSchedles', suggestion: 'navSchedules' }]);
    expect(onError).toHaveBeenCalledOnce();
    expect(String(onError.mock.calls[0][0])).toContain(
      '"navSchedles" (did you mean "navSchedules"?)',
    );
    expect(host.portal.platform.i18n?.messages).toMatchObject({ navSchedules: 'Schedules' });
  });

  it("serves extension routes after the host's own routes", () => {
    const host = createPortalHost({
      defaults: testPortalDefaults,
      extensions: [schedules],
      routes: appRoutes,
      development: true,
    });

    expect(host.routes.map((route) => route.path)).toEqual(['/users', '/schedules']);
  });

  it("gives every app the shell's copy below its own messages and the document's", () => {
    const defaults = {
      ...testPortalDefaults,
      platform: {
        ...testPortalDefaults.platform,
        i18n: { locale: 'en', messages: { navUsers: 'Staff' } },
      },
    };
    const host = createPortalHost({
      defaults,
      document: { messages: { dashboardConfigure: 'Arrange dashboard' } },
      development: true,
    });

    expect(host.portal.platform.i18n?.messages).toMatchObject({
      navDashboard: 'Dashboard',
      navUsers: 'Staff',
      dashboardConfigure: 'Arrange dashboard',
    });
    expect(host.unknownMessageKeys).toEqual([]);
  });
});
