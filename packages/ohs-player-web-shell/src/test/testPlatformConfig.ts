import type { CorePlatformConfig } from 'ohs-player-web-core';

export const testPlatformConfig: CorePlatformConfig = {
  fhirBaseUrl: 'http://localhost:8080/fhir',
  auth: { issuer: 'http://localhost:8090/realms/ohs', clientId: 'ohs-player-web' },
  i18n: {
    messages: {
      logoutHeading: 'You have been signed out',
      logoutRedirecting: 'Taking you back to sign in…',
    },
  },
};
