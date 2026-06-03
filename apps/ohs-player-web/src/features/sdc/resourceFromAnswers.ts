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
  identifier: 'user-identifier',
  active: 'user-active',
} as const;

const PRACTITIONER_IDENTIFIER_SYSTEM = 'urn:ohs:reference:practitioner-identifier';

/**
 * One Organisation + Location context, materialised by the gateway as a `PractitionerRole`.
 * `organization`/`location` are FHIR references (e.g. `Organization/123`).
 */
export interface PractitionerRoleAssignment {
  organization: string;
  location: string;
  role: { system: string; code: string };
}

/** Request body for `POST /custom/users` (see ticket #2 "Payload contract"). */
export interface CreateUserPayload {
  givenName: string;
  familyName: string;
  email: string;
  roles: string[];
  assignments: PractitionerRoleAssignment[];
}

export function buildCreateUserPayload(
  answers: Record<string, string>,
  roles: string[],
  assignments: PractitionerRoleAssignment[],
): CreateUserPayload {
  return {
    givenName: answers[USER_LINK_IDS.given]?.trim() ?? '',
    familyName: answers[USER_LINK_IDS.family]?.trim() ?? '',
    email: answers[USER_LINK_IDS.email]?.trim() ?? '',
    roles,
    assignments,
  };
}

type PractitionerName = { family?: string; given?: string[] };
type ContactPoint = { system?: string; value?: string };
type Identifier = { system?: string; value?: string };

/** Pre-populate edit-form answers from an existing Practitioner. */
export function userAnswersFromPractitioner(
  pract: Record<string, unknown>,
): Record<string, string> {
  const name = (pract.name as PractitionerName[] | undefined)?.[0];
  const telecom = pract.telecom as ContactPoint[] | undefined;
  const email = telecom?.find((tc) => tc.system === 'email')?.value ?? '';
  const identifiers = pract.identifier as Identifier[] | undefined;
  const identifier =
    identifiers?.find((i) => i.system === PRACTITIONER_IDENTIFIER_SYSTEM)?.value ?? '';
  return {
    [USER_LINK_IDS.given]: name?.given?.join(' ') ?? '',
    [USER_LINK_IDS.family]: name?.family ?? '',
    [USER_LINK_IDS.email]: email,
    [USER_LINK_IDS.identifier]: identifier,
    [USER_LINK_IDS.active]: (pract.active as boolean | undefined) === false ? 'false' : 'true',
  };
}

/**
 * Merge edit-form answers into an existing Practitioner, preserving fields the form
 * does not manage (id, meta, other identifiers/telecoms, role links).
 */
export function applyUserAnswersToPractitioner(
  existing: Record<string, unknown>,
  answers: Record<string, string>,
): Record<string, unknown> {
  const givenRaw = answers[USER_LINK_IDS.given]?.trim() ?? '';
  const family = answers[USER_LINK_IDS.family]?.trim() ?? '';
  const email = answers[USER_LINK_IDS.email]?.trim() ?? '';
  const idValue = answers[USER_LINK_IDS.identifier]?.trim() ?? '';
  const active = answers[USER_LINK_IDS.active] !== 'false';

  const names = Array.isArray(existing.name)
    ? [...(existing.name as Record<string, unknown>[])]
    : [];
  const primaryName = names[0] as Record<string, unknown> | undefined;
  names[0] = { ...primaryName, family, given: givenRaw ? givenRaw.split(/\s+/) : [] };

  const otherTelecom = Array.isArray(existing.telecom)
    ? (existing.telecom as ContactPoint[]).filter((tc) => tc.system !== 'email')
    : [];
  const telecom = email ? [...otherTelecom, { system: 'email', value: email }] : otherTelecom;

  const otherIds = Array.isArray(existing.identifier)
    ? (existing.identifier as Identifier[]).filter((i) => i.system !== PRACTITIONER_IDENTIFIER_SYSTEM)
    : [];
  const identifier = idValue
    ? [...otherIds, { system: PRACTITIONER_IDENTIFIER_SYSTEM, value: idValue }]
    : otherIds;

  const next: Record<string, unknown> = { ...existing, name: names, active };
  if (telecom.length > 0) next.telecom = telecom;
  else delete next.telecom;
  if (identifier.length > 0) next.identifier = identifier;
  else delete next.identifier;
  return next;
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
