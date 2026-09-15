import type { TransactionBundleEntry } from 'ohs-player-web-core';
import type { NewUserFields } from '../sdc/resourceFromAnswers';

export const SETUP_WIZARD_STEPS = [
  'locations',
  'organizations',
  'careteams',
  'users',
  'review',
] as const;

export type SetupWizardStepId = (typeof SETUP_WIZARD_STEPS)[number];

export type FormMode = 'wizard' | 'standalone';

export type UserCommitStatus = 'pending' | 'success' | 'failed';

/** Safe display label from a draft FHIR resource (`name` is `unknown` on Record payloads). */
export function draftResourceName(resource: Record<string, unknown>, fallback = ''): string {
  return typeof resource.name === 'string' && resource.name ? resource.name : fallback;
}

/** One Location planned for phase-1 Bundle commit. */
export interface DraftLocation {
  fullUrl: string;
  resource: {
    resourceType: 'Location';
    name: string;
    status: 'active' | 'suspended' | 'inactive';
    mode?: 'instance' | 'kind';
    partOf?: { reference: string };
    address?: { text?: string };
  };
}

/** One Organization + optional location links for phase-1. */
export interface DraftOrganization {
  fullUrl: string;
  resource: Record<string, unknown>;
  /** Location refs (`urn:uuid:` or `Location/{id}`) to set managingOrganization. */
  managedLocationRefs: string[];
}

/** One CareTeam planned for phase-1. */
export interface DraftCareTeam {
  fullUrl: string;
  resource: Record<string, unknown>;
}

/** Pending user for phase-2 (`POST /api/users` + assignment Bundle). */
export interface DraftUser {
  localId: string;
  fields: NewUserFields;
  /** CareTeam ids or `urn:uuid:` fullUrls from the draft. */
  careTeamIds: string[];
  status: UserCommitStatus;
  error?: string;
  createdPractitionerId?: string;
}

export interface SetupWizardDraft {
  version: 1;
  currentStep: number;
  locations: DraftLocation[];
  organizations: DraftOrganization[];
  careTeams: DraftCareTeam[];
  users: DraftUser[];
  /** After phase 1: `urn:uuid:` → `ResourceType/id`. */
  urnMap: Record<string, string>;
  phase1Complete: boolean;
}

export const EMPTY_DRAFT = (): SetupWizardDraft => ({
  version: 1,
  currentStep: 0,
  locations: [],
  organizations: [],
  careTeams: [],
  users: [],
  urnMap: {},
  phase1Complete: false,
});

/** Extra Bundle entries derived from org relationships (affiliations + location patches). */
export type DerivedBundleEntries = TransactionBundleEntry[];
