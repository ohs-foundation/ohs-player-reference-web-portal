import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sysTheme } from '../theme/sysTheme';
import { env } from './env';
import { DEFAULT_NAVIGATION } from './navigation';
import { platformConfig } from './platform';
import { validatePortalConfig, type NavEntry, type PortalConfig } from './portalConfigSchema';
import { resolvePortalConfig } from './resolvePortalConfig';

function referenceDocument(): PortalConfig {
  const result = validatePortalConfig(
    JSON.parse(readFileSync('public/portal-config.json', 'utf8')) as unknown,
  );
  if (!result.success) throw new Error(result.error);
  return result.data;
}

describe('resolvePortalConfig', () => {
  it('falls back to the VITE_* and platform.ts values when there is no document', () => {
    const resolved = resolvePortalConfig();

    expect(resolved.platform.fhirBaseUrl).toBe(env.fhirBaseUrl);
    expect(resolved.platform.auth).toEqual(platformConfig.auth);
    expect(resolved.platform.flags).toEqual(platformConfig.flags);
    expect(resolved.platform.rbac).toEqual(platformConfig.rbac);
    expect(resolved.platform.customEndpoints).toEqual(platformConfig.customEndpoints);
    expect(resolved.theme).toEqual(sysTheme);
    expect(resolved.navigation).toBe(DEFAULT_NAVIGATION);
    expect(resolved.questionnaireVariant).toBe(env.questionnaireVariant);
  });

  it('resolves the reference document to exactly the baked configuration', () => {
    expect(resolvePortalConfig(referenceDocument())).toEqual(resolvePortalConfig());
  });

  it('lets each key the document sets win and keeps every other value', () => {
    const resolved = resolvePortalConfig({
      fhirBaseUrl: 'https://gateway.example.org/fhir',
      oidcIssuer: 'https://auth.example.org/realms/ohs',
      flags: { userMgmt: false },
      permissionMap: { 'users.view': ['admin'] },
      customEndpoints: { users: '/custom/users' },
      brand: { overrides: { primary: '#B00020' } },
    });

    expect(resolved.platform.fhirBaseUrl).toBe('https://gateway.example.org/fhir');
    expect(resolved.platform.auth.issuer).toBe('https://auth.example.org/realms/ohs');
    expect(resolved.platform.auth.clientId).toBe(env.clientId);
    expect(resolved.platform.flags?.flags).toEqual({
      ...platformConfig.flags?.flags,
      userMgmt: false,
    });
    expect(resolved.platform.rbac?.permissionMap).toEqual({
      ...platformConfig.rbac?.permissionMap,
      'users.view': ['admin'],
    });
    expect(resolved.platform.customEndpoints).toEqual({
      ...platformConfig.customEndpoints,
      users: '/custom/users',
    });
    expect(resolved.theme.overrides).toEqual({ ...sysTheme.overrides, primary: '#B00020' });
    expect(resolved.theme.darkOverrides).toEqual(sysTheme.darkOverrides);
  });

  it('uses the product name as the top-bar title, over a message override', () => {
    const resolved = resolvePortalConfig({
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

    expect(resolvePortalConfig({ navigation }).navigation).toEqual(navigation);
  });
});
