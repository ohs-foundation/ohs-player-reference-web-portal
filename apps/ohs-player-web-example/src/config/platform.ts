import type { CorePlatformConfig, FhirVersion, PermissionMap } from 'ohs-player-web-core';
import type { PortalDefaults } from 'ohs-player-web-shell';
import { messages } from '../i18n/messages';
import { env } from './env';

const permissionMap: PermissionMap = {
  'dashboard.view': ['admin', 'care-team-manager'],
  'users.view': ['admin', 'care-team-manager'],
};

const FHIR_VERSIONS: readonly FhirVersion[] = ['R4', 'R5', 'STU3'];

export const platformConfig: CorePlatformConfig = {
  fhirBaseUrl: env.fhirBaseUrl,
  fhirVersion: FHIR_VERSIONS.find((version) => version === env.fhirVersion) ?? 'R4',
  auth: {
    issuer: env.oidcIssuer,
    clientId: env.clientId,
    scopes: ['openid', 'profile', 'email'],
  },
  rbac: {
    claimPath: 'roles',
    permissionMap,
    unauthorizedBehaviour: 'hide',
    unauthorizedRedirectPath: '/unauthorized',
  },
  flags: {
    defaultValue: false,
    flags: { userMgmt: env.flags.userMgmt, dashboard: env.flags.dashboard },
  },
  i18n: { locale: 'en', messages },
  onError: (error) => globalThis.reportError(error),
};

export const portalDefaults: PortalDefaults = {
  platform: platformConfig,
  theme: {},
  questionnaireVariant: 'default',
};
