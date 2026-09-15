import type { NavEntry } from './portalConfigSchema';

export const NAV_IDS = [
  'dashboard',
  'users',
  'locations',
  'organizations',
  'careTeams',
  'fhirViewer',
  'setup',
] as const;

export type NavId = (typeof NAV_IDS)[number];

export const DEFAULT_NAVIGATION: readonly NavEntry[] = [
  {
    id: 'dashboard',
    to: '/',
    labelKey: 'navDashboard',
    order: 10,
    requires: { flag: 'dashboard', permission: 'dashboard.view' },
  },
  {
    id: 'users',
    to: '/users',
    labelKey: 'navUsers',
    order: 20,
    requires: { flag: 'userMgmt', permission: 'users.view' },
  },
  {
    id: 'locations',
    to: '/locations',
    labelKey: 'navLocations',
    order: 30,
    requires: { flag: 'locationMgmt', permission: 'locations.view' },
  },
  {
    id: 'organizations',
    to: '/organizations',
    labelKey: 'navOrganizations',
    order: 40,
    requires: { flag: 'orgMgmt', permission: 'orgs.view' },
  },
  {
    id: 'careTeams',
    to: '/care-teams',
    labelKey: 'navCareTeams',
    order: 50,
    requires: { flag: 'careTeams', permission: 'careteams.view' },
  },
  {
    id: 'fhirViewer',
    to: '/resources',
    labelKey: 'navFhirViewer',
    order: 60,
    requires: { flag: 'fhirViewer', permission: 'fhir-viewer.view' },
  },
  {
    id: 'setup',
    to: '/setup',
    labelKey: 'navSetup',
    order: 70,
    requires: { flag: 'setupWizard', permission: 'setup.view' },
  },
];
