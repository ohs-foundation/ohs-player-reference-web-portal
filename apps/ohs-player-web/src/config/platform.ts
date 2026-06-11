import type { CorePlatformConfig, PermissionMap } from 'ohs-player-web-core';
import { env } from './env';
import { appMessageOverrides } from '../i18n/appMessages';
import { alternateTheme } from '../theme/altTheme';
import { lightTheme } from '../theme/lightTheme';

const permissionMap: PermissionMap = {
  'dashboard.view': ['admin', 'care-team-manager'],
  'users.view': ['admin', 'care-team-manager'],
  'users.create': ['admin'],
  'users.edit': ['admin'],
  'users.deactivate': ['admin'],
  'locations.view': ['admin', 'care-team-manager'],
  'locations.edit': ['admin'],
  'orgs.view': ['admin', 'care-team-manager'],
  'orgs.create': ['admin'],
  'careteams.view': ['admin', 'care-team-manager'],
  'careteams.manage': ['admin', 'care-team-manager'],
};

export const platformConfig: CorePlatformConfig = {
  fhirBaseUrl: env.fhirBaseUrl,
  fhirVersion: 'R4',
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
    flags: {
      userMgmt: env.flags.userMgmt,
      locationMgmt: env.flags.locationMgmt,
      careTeams: env.flags.careTeams,
      dashboard: env.flags.dashboard,
      orgMgmt: env.flags.orgMgmt,
    },
  },
  i18n: {
    locale: 'en',
    messages: appMessageOverrides,
  },
  theme: env.themeAlt ? alternateTheme : lightTheme,
  customEndpoints: {
    users: '/api/users',
    groups: '/api/groups',
    roles: '/api/roles',
  },
};
