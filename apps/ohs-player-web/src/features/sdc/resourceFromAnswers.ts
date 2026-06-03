/**
 * Link IDs and extraction functions for questionnaire-driven FHIR resource creation.
 * Link IDs must match bundled Questionnaire JSON in `src/questionnaires/`.
 */

// ---------------------------------------------------------------------------
// Care Team
// ---------------------------------------------------------------------------

export const CARETEAM_LINK_IDS = {
  name: 'team-name',
  org: 'team-org',
} as const;

export function careTeamBodyFromAnswers(answers: Record<string, string>): {
  resourceType: 'CareTeam';
  name: string;
  status: 'active';
  managingOrganization: { reference: string }[];
} {
  const name = answers[CARETEAM_LINK_IDS.name]?.trim() ?? '';
  const orgId = answers[CARETEAM_LINK_IDS.org] ?? '';
  const orgRef = orgId.includes('/') ? orgId : `Organization/${orgId}`;
  return {
    resourceType: 'CareTeam',
    name,
    status: 'active',
    managingOrganization: [{ reference: orgRef }],
  };
}

// ---------------------------------------------------------------------------
// User (Practitioner via custom gateway)
// ---------------------------------------------------------------------------

export const USER_LINK_IDS = {
  given: 'user-given',
  family: 'user-family',
  email: 'user-email',
  roles: 'user-roles',
} as const;

export function userBodyFromAnswers(answers: Record<string, string>): {
  givenName: string;
  familyName: string;
  email: string;
  roles: string[];
} {
  return {
    givenName: answers[USER_LINK_IDS.given]?.trim() ?? '',
    familyName: answers[USER_LINK_IDS.family]?.trim() ?? '',
    email: answers[USER_LINK_IDS.email]?.trim() ?? '',
    roles: (answers[USER_LINK_IDS.roles] ?? 'admin')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export const ORGANIZATION_LINK_IDS = {
  name: 'org-name',
  active: 'org-active',
  identifierValue: 'org-identifier-value',
} as const;

export const LOCATION_LINK_IDS = {
  name: 'loc-name',
  status: 'loc-status',
  mode: 'loc-mode',
  addressLine: 'loc-address-line',
  parent: 'loc-parent',
} as const;

const ORG_IDENTIFIER_SYSTEM = 'urn:ohs:reference:organization-identifier';

export function organizationFromAnswers(answers: Record<string, string>): {
  resourceType: 'Organization';
  name: string;
  active: boolean;
  identifier?: { system: string; value: string }[];
} {
  const name = answers[ORGANIZATION_LINK_IDS.name]?.trim() ?? '';
  const active = answers[ORGANIZATION_LINK_IDS.active] !== 'false';
  const idVal = answers[ORGANIZATION_LINK_IDS.identifierValue]?.trim();
  const identifier =
    idVal && idVal.length > 0
      ? [{ system: ORG_IDENTIFIER_SYSTEM, value: idVal }]
      : undefined;
  return { resourceType: 'Organization', name, active, ...(identifier ? { identifier } : {}) };
}

type LocationStatus = 'active' | 'suspended' | 'inactive';
type LocationMode = 'instance' | 'kind';

function parseLocationStatus(raw: string | undefined): LocationStatus {
  if (raw === 'suspended' || raw === 'inactive') return raw;
  return 'active';
}

function parseLocationMode(raw: string | undefined): LocationMode {
  return raw === 'kind' ? 'kind' : 'instance';
}

export function locationBodyFromAnswers(answers: Record<string, string>): {
  resourceType: 'Location';
  status: LocationStatus;
  mode: LocationMode;
  name: string;
  partOf?: { reference: string };
  address?: { text?: string };
} {
  const name = answers[LOCATION_LINK_IDS.name]?.trim() ?? '';
  const parent = answers[LOCATION_LINK_IDS.parent];
  const partOf =
    parent && parent !== '__root__'
      ? { reference: parent.includes('/') ? parent : `Location/${parent}` }
      : undefined;
  const status = parseLocationStatus(answers[LOCATION_LINK_IDS.status]);
  const mode = parseLocationMode(answers[LOCATION_LINK_IDS.mode]);
  const line = answers[LOCATION_LINK_IDS.addressLine]?.trim();
  const address = line ? { text: line } : undefined;
  return {
    resourceType: 'Location',
    status,
    mode,
    name,
    partOf,
    ...(address ? { address } : {}),
  };
}

/** Parent location id for cycle checks (`undefined` = root). */
export function parentLocationIdFromAnswer(raw: string | undefined): string | undefined {
  if (!raw || raw === '__root__') return undefined;
  return raw.replace(/^Location\//, '');
}
