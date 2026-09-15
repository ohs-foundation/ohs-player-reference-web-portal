import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { appMessageOverrides } from '../i18n/appMessages';
import { sysTheme } from '../theme/sysTheme';
import { DEFAULT_NAVIGATION } from './navigation';
import { platformConfig } from './platform';
import { validatePortalConfig, type PortalConfig } from './portalConfigSchema';

function referenceDocument(): PortalConfig {
  const result = validatePortalConfig(
    JSON.parse(readFileSync('public/portal-config.json', 'utf8')) as unknown,
  );
  if (!result.success) throw new Error(result.error);
  return result.data;
}

describe('reference configuration document', () => {
  it('validates against the schema', () => {
    expect(() => referenceDocument()).not.toThrow();
  });

  it('holds the values platform.ts builds today', () => {
    const document = referenceDocument();
    expect(document.permissionMap).toEqual(platformConfig.rbac?.permissionMap);
    expect(document.customEndpoints).toEqual(platformConfig.customEndpoints);
    expect(document.locale).toEqual(platformConfig.i18n?.locale);
  });

  it('holds the baked sidebar, spaced ten apart in the current order', () => {
    const { navigation } = referenceDocument();
    expect(navigation).toEqual(DEFAULT_NAVIGATION);
    expect(navigation?.map((entry) => entry.order)).toEqual([10, 20, 30, 40, 50, 60, 70]);
  });

  it('holds the brand pins and product name the app already renders', () => {
    const document = referenceDocument();
    expect(document.brand?.overrides).toEqual(sysTheme.overrides);
    expect(document.brand?.darkOverrides).toEqual(sysTheme.darkOverrides);
    expect(document.product?.name).toBe(appMessageOverrides.appTopbarTitle);
  });

  it('leaves environment-specific values to VITE_*', () => {
    const document = referenceDocument();
    for (const field of [
      'fhirBaseUrl',
      'fhirVersion',
      'oidcIssuer',
      'clientId',
      'flags',
      'questionnaireVariant',
    ]) {
      expect(document, field).not.toHaveProperty(field);
    }
  });
});
