import type { CorePlatformConfig } from 'ohs-player-web-core';
import type { PortalDefaults } from '../config/resolvePortalConfig';

export const testPlatformConfig: CorePlatformConfig = {
  fhirBaseUrl: 'http://localhost:8080/fhir',
  fhirVersion: 'R4',
  auth: { issuer: 'http://localhost:8090/realms/ohs', clientId: 'ohs-player-web' },
  rbac: { claimPath: 'roles', permissionMap: { 'users.view': ['admin', 'care-team-manager'] } },
  flags: { defaultValue: false, flags: { userMgmt: true, orgMgmt: true } },
  i18n: {
    locale: 'en',
    messages: {
      logoutHeading: 'You have been signed out',
      logoutRedirecting: 'Taking you back to sign in…',
    },
  },
  customEndpoints: { users: '/api/users' },
};

export const testPortalDefaults: PortalDefaults = {
  platform: testPlatformConfig,
  theme: { overrides: { primary: '#094F9A' }, darkOverrides: { surface: '#0D0D0D' } },
  questionnaireVariant: 'default',
};
