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
  // Real backend roles (JWT realm_access.roles). The hierarchy browser + bulk import are gated by the
  // exact endpoint roles, not the coarse 'locations.*' keys — a 403 means the role isn't seeded/granted.
  'location-hierarchy.view': ['admin', 'location-hierarchy.view'],
  'bulk-import.manage': ['admin', 'bulk-import.manage'],
  'orgs.view': ['admin', 'care-team-manager'],
  'orgs.create': ['admin'],
  'careteams.view': ['admin', 'care-team-manager'],
  'careteams.manage': ['admin', 'care-team-manager'],
  'setup.view': ['admin'],
  // FHIR Viewer: read for admins + care-team managers; edit/delete (raw-JSON mutations) admin-only.
  'fhir-viewer.view': ['admin', 'care-team-manager'],
  'fhir-viewer.edit': ['admin'],
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
      setupWizard: env.flags.setupWizard,
      fhirViewer: env.flags.fhirViewer,
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
    locationHierarchy: '/api/location-hierarchy',
    locationsBulkImport: '/api/bulk-import/locations',
  },
};
