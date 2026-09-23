import type { PortalRoute } from 'ohs-player-web-shell';
import { LocationsNoAccess } from './features/locations/LocationsNoAccess';
import { OrganizationsPermissionFallback } from './features/organizations/OrganizationsPermissionFallback';

const loadFhirViewerPage = () =>
  import('./features/fhir-viewer/FhirViewerPage').then((m) => ({ default: m.FhirViewerPage }));

export const appRoutes: readonly PortalRoute[] = [
  {
    id: 'users',
    path: '/users',
    load: () => import('./features/users/UsersPage').then((m) => ({ default: m.UsersPage })),
    requires: { flag: 'userMgmt', permission: 'users.view' },
  },
  {
    id: 'locations',
    path: '/locations',
    load: () =>
      import('./features/locations/LocationsPage').then((m) => ({ default: m.LocationsPage })),
    requires: { flag: 'locationMgmt', permission: 'location-hierarchy.view' },
    permissionFallback: <LocationsNoAccess status={403} />,
  },
  {
    id: 'organizations',
    path: '/organizations',
    load: () =>
      import('./features/organizations/OrganizationsPage').then((m) => ({
        default: m.OrganizationsPage,
      })),
    requires: { flag: 'orgMgmt', permission: 'orgs.view' },
    permissionFallback: <OrganizationsPermissionFallback />,
  },
  {
    id: 'careTeams',
    path: '/care-teams',
    load: () =>
      import('./features/careteams/CareTeamsPage').then((m) => ({ default: m.CareTeamsPage })),
    requires: { flag: 'careTeams', permission: 'careteams.view' },
  },
  {
    id: 'setup',
    path: '/setup',
    load: () =>
      import('./features/setup-wizard/SetupWizardPage').then((m) => ({
        default: m.SetupWizardPage,
      })),
    requires: { flag: 'setupWizard', permission: 'setup.view' },
  },
  {
    id: 'fhirViewer',
    path: '/resources',
    load: loadFhirViewerPage,
    requires: { flag: 'fhirViewer', permission: 'fhir-viewer.view' },
  },
  {
    id: 'fhirViewerResourceType',
    path: '/resources/:resourceType',
    load: loadFhirViewerPage,
    requires: { flag: 'fhirViewer', permission: 'fhir-viewer.view' },
  },
  {
    id: 'audit',
    path: '/audit',
    load: () => import('./features/audit/AuditPage').then((m) => ({ default: m.AuditPage })),
    requires: { flag: 'auditLog', permission: 'audit.view' },
    permissionFallback: <OrganizationsPermissionFallback />,
  },
];
