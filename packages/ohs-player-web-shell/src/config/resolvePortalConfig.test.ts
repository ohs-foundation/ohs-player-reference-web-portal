import { describe, expect, it } from 'vitest';
import { testPortalDefaults } from '../test/testPlatformConfig';
import { DEFAULT_NAVIGATION, type NavEntry } from './navigation';
import { resolvePortalConfig } from './resolvePortalConfig';

const { platform, theme } = testPortalDefaults;

describe('resolvePortalConfig', () => {
  it('falls back to the host defaults when there is no document', () => {
    const resolved = resolvePortalConfig(testPortalDefaults);

    expect(resolved.platform.fhirBaseUrl).toBe(platform.fhirBaseUrl);
    expect(resolved.platform.auth).toEqual(platform.auth);
    expect(resolved.platform.flags).toEqual(platform.flags);
    expect(resolved.platform.rbac).toEqual(platform.rbac);
    expect(resolved.platform.customEndpoints).toEqual(platform.customEndpoints);
    expect(resolved.theme).toEqual(theme);
    expect(resolved.navigation).toBe(DEFAULT_NAVIGATION);
    expect(resolved.questionnaireVariant).toBe(testPortalDefaults.questionnaireVariant);
  });

  it('lets each key the document sets win and keeps every other value', () => {
    const resolved = resolvePortalConfig(testPortalDefaults, {
      fhirBaseUrl: 'https://gateway.example.org/fhir',
      oidcIssuer: 'https://auth.example.org/realms/ohs',
      flags: { userMgmt: false },
      permissionMap: { 'users.view': ['admin'] },
      customEndpoints: { users: '/custom/users' },
      brand: { overrides: { primary: '#B00020' } },
    });

    expect(resolved.platform.fhirBaseUrl).toBe('https://gateway.example.org/fhir');
    expect(resolved.platform.auth.issuer).toBe('https://auth.example.org/realms/ohs');
    expect(resolved.platform.auth.clientId).toBe(platform.auth.clientId);
    expect(resolved.platform.flags?.flags).toEqual({ ...platform.flags?.flags, userMgmt: false });
    expect(resolved.platform.rbac?.permissionMap).toEqual({
      ...platform.rbac?.permissionMap,
      'users.view': ['admin'],
    });
    expect(resolved.platform.customEndpoints).toEqual({
      ...platform.customEndpoints,
      users: '/custom/users',
    });
    expect(resolved.theme.overrides).toEqual({ ...theme.overrides, primary: '#B00020' });
    expect(resolved.theme.darkOverrides).toEqual(theme.darkOverrides);
  });

  it('uses the product name as the top-bar title, over a message override', () => {
    const resolved = resolvePortalConfig(testPortalDefaults, {
      product: { name: 'County Health' },
      messages: { appTopbarTitle: 'Other', loginHeading: 'Welcome' },
    });

    expect(resolved.platform.i18n?.messages).toMatchObject({
      appTopbarTitle: 'County Health',
      loginHeading: 'Welcome',
    });
  });

  it('replaces the whole sidebar when the document lists one', () => {
    const navigation: NavEntry[] = [{ id: 'users', to: '/users', labelKey: 'navUsers', order: 5 }];

    expect(resolvePortalConfig(testPortalDefaults, { navigation }).navigation).toEqual(navigation);
  });

  it('lets a document place and relabel the audit log entry', () => {
    const navigation: NavEntry[] = [
      {
        id: 'audit',
        to: '/audit',
        labelKey: 'navAuditTrail',
        order: 15,
        requires: { flag: 'auditLog', permission: 'audit.view' },
      },
    ];

    expect(resolvePortalConfig(testPortalDefaults, { navigation }).navigation).toEqual(navigation);
  });

  it('includes the audit log after Setup in the built-in sidebar', () => {
    const ids = resolvePortalConfig(testPortalDefaults, {}).navigation.map((entry) => entry.id);
    expect(ids.slice(-2)).toEqual(['setup', 'audit']);
  });
});
