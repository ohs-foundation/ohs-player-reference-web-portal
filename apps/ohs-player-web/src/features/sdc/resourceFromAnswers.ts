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

/** System for the human-facing Practitioner identifier (distinct from the backend's Keycloak-id system). */
export const PRACTITIONER_IDENTIFIER_SYSTEM = 'urn:ohs:reference:practitioner-identifier';

/**
 * Request body for `POST /api/users` (OHS backend). Creates the Keycloak user and a Practitioner with
 * only name + active + the Keycloak-id identifier; every other FHIR field is enriched by the client
 * afterwards via `buildNewUserBundle`.
 */
export interface CreateUserPayload {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  enabled: boolean;
}

/** Everything the redesigned Add User drawer collects (bespoke form, not SDC). */
export interface NewUserFields {
  givenName: string;
  familyName: string;
  email: string;
  phone: string;
  /** FHIR administrative-gender code (`male` | `female` | `other` | `unknown`) or ''. */
  gender: string;
  qualification: string;
  active: boolean;
  /** PractitionerRole.code coding; null = no clinical role. */
  role: { system: string; code: string } | null;
  organizations: string[];
  locations: string[];
}

/** Backend requires a username; derive it from the email local-part. */
export function usernameFromEmail(email: string): string {
  return email.split('@')[0]?.trim().toLowerCase() ?? '';
}

function genderToFhir(raw: string): string | undefined {
  const g = raw.trim().toLowerCase();
  return g === 'male' || g === 'female' || g === 'other' || g === 'unknown' ? g : undefined;
}

export function buildNewUserPayload(fields: NewUserFields): CreateUserPayload {
  return {
    username: usernameFromEmail(fields.email),
    firstName: fields.givenName.trim(),
    lastName: fields.familyName.trim(),
    email: fields.email.trim(),
    enabled: fields.active,
  };
}

interface TransactionEntry {
  /** Omitted for DELETE entries. */
  resource?: Record<string, unknown>;
  request: { method: 'POST' | 'PUT' | 'DELETE'; url: string };
}

/** Merge the form's demographic fields into a Practitioner, preserving unmanaged fields via spread. */
function enrichPractitioner(
  created: Record<string, unknown>,
  fields: NewUserFields,
): Record<string, unknown> {
  const given = fields.givenName.trim() ? fields.givenName.trim().split(/\s+/) : [];
  const telecom: ContactPoint[] = [];
  if (fields.email.trim()) telecom.push({ system: 'email', value: fields.email.trim() });
  if (fields.phone.trim()) telecom.push({ system: 'phone', value: fields.phone.trim() });

  const gender = genderToFhir(fields.gender);

  const practitioner: Record<string, unknown> = {
    ...created,
    active: fields.active,
    name: [{ family: fields.familyName.trim(), given }],
  };
  if (telecom.length > 0) practitioner.telecom = telecom;
  else delete practitioner.telecom;
  if (gender) practitioner.gender = gender;
  else delete practitioner.gender;
  if (fields.qualification.trim())
    practitioner.qualification = [{ code: { text: fields.qualification.trim() } }];
  else delete practitioner.qualification;
  return practitioner;
}

/** One PractitionerRole per organisation (or a single role-only entry when no org is chosen). */
function roleEntries(ref: string, fields: NewUserFields): TransactionEntry[] {
  const hasAssignment =
    Boolean(fields.role) || fields.organizations.length > 0 || fields.locations.length > 0;
  if (!hasAssignment) return [];
  const orgs = fields.organizations.length > 0 ? fields.organizations : [''];
  return orgs.map((org) => {
    const role: Record<string, unknown> = {
      resourceType: 'PractitionerRole',
      active: true,
      practitioner: { reference: ref },
    };
    if (org) role.organization = { reference: org };
    if (fields.locations.length > 0) role.location = fields.locations.map((l) => ({ reference: l }));
    if (fields.role) role.code = [{ coding: [{ system: fields.role.system, code: fields.role.code }] }];
    return { resource: role, request: { method: 'POST' as const, url: 'PractitionerRole' } };
  });
}

function addParticipant(ct: Record<string, unknown>, ref: string): TransactionEntry {
  const ctId = typeof ct.id === 'string' ? ct.id : '';
  const participant = Array.isArray(ct.participant) ? [...(ct.participant as unknown[])] : [];
  participant.push({ member: { reference: ref } });
  return { resource: { ...ct, participant }, request: { method: 'PUT', url: `CareTeam/${ctId}` } };
}

function removeParticipant(ct: Record<string, unknown>, ref: string): TransactionEntry {
  const ctId = typeof ct.id === 'string' ? ct.id : '';
  const participant = (
    Array.isArray(ct.participant) ? (ct.participant as { member?: { reference?: string } }[]) : []
  ).filter((p) => p.member?.reference !== ref);
  return { resource: { ...ct, participant }, request: { method: 'PUT', url: `CareTeam/${ctId}` } };
}

/**
 * Post-create FHIR transaction enriching the bare Practitioner the backend returned: PUT it with the
 * demographics the backend drops (email/phone → telecom, gender, qualification, display identifier),
 * POST one PractitionerRole per organisation, and PUT each selected CareTeam with the practitioner added
 * as a participant. The Keycloak-id identifier is preserved.
 */
export function buildNewUserBundle(
  created: Record<string, unknown>,
  fields: NewUserFields,
  careTeams: Record<string, unknown>[],
): { resourceType: 'Bundle'; type: 'transaction'; entry: TransactionEntry[] } {
  const id = typeof created.id === 'string' ? created.id : '';
  const ref = `Practitioner/${id}`;
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [
      { resource: enrichPractitioner(created, fields), request: { method: 'PUT', url: ref } },
      ...roleEntries(ref, fields),
      ...careTeams.filter((ct) => typeof ct.id === 'string').map((ct) => addParticipant(ct, ref)),
    ],
  };
}

/**
 * Edit-save transaction: PUT the enriched Practitioner, replace its PractitionerRoles (DELETE the
 * existing ones, POST fresh ones from the form), and reconcile CareTeam membership (PUT additions with
 * the participant added, removals with it filtered out). FHIR processes DELETE before POST, so the
 * replace is conflict-free.
 */
export function buildUserEditBundle(
  practitioner: Record<string, unknown>,
  fields: NewUserFields,
  opts: {
    existingRoleIds: string[];
    careTeamAdds: Record<string, unknown>[];
    careTeamRemoves: Record<string, unknown>[];
  },
): { resourceType: 'Bundle'; type: 'transaction'; entry: TransactionEntry[] } {
  const id = typeof practitioner.id === 'string' ? practitioner.id : '';
  const ref = `Practitioner/${id}`;
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [
      { resource: enrichPractitioner(practitioner, fields), request: { method: 'PUT', url: ref } },
      ...opts.existingRoleIds.map((rid) => ({
        request: { method: 'DELETE' as const, url: `PractitionerRole/${rid}` },
      })),
      ...roleEntries(ref, fields),
      ...opts.careTeamAdds.filter((ct) => typeof ct.id === 'string').map((ct) => addParticipant(ct, ref)),
      ...opts.careTeamRemoves
        .filter((ct) => typeof ct.id === 'string')
        .map((ct) => removeParticipant(ct, ref)),
    ],
  };
}

/**
 * Deactivation transaction: PUT the Practitioner `active:false`, end-date every still-active
 * PractitionerRole (`period.end` = the deactivation timestamp + `active:false`), and remove the
 * practitioner from each CareTeam's participants — all in one atomic Bundle. Roles that already carry
 * a `period.end` are left untouched (no double end-dating). Returns counts for the AuditEvent note.
 */
export function buildDeactivateBundle(
  practitioner: Record<string, unknown>,
  roles: Record<string, unknown>[],
  careTeams: Record<string, unknown>[],
  endIso: string,
): {
  bundle: { resourceType: 'Bundle'; type: 'transaction'; entry: TransactionEntry[] };
  endedRoleCount: number;
  removedCareTeamCount: number;
} {
  const id = typeof practitioner.id === 'string' ? practitioner.id : '';
  const ref = `Practitioner/${id}`;
  const entry: TransactionEntry[] = [
    { resource: { ...practitioner, active: false }, request: { method: 'PUT', url: ref } },
  ];

  let endedRoleCount = 0;
  for (const role of roles) {
    const rid = typeof role.id === 'string' ? role.id : '';
    const period = (role.period as { start?: string; end?: string } | undefined) ?? {};
    if (!rid || period.end) continue; // already ended → leave untouched
    entry.push({
      resource: { ...role, active: false, period: { ...period, end: endIso } },
      request: { method: 'PUT', url: `PractitionerRole/${rid}` },
    });
    endedRoleCount += 1;
  }

  let removedCareTeamCount = 0;
  for (const ct of careTeams) {
    const ctId = typeof ct.id === 'string' ? ct.id : '';
    if (!ctId) continue;
    const participant = Array.isArray(ct.participant)
      ? (ct.participant as { member?: { reference?: string } }[])
      : [];
    const next = participant.filter((p) => p.member?.reference !== ref);
    if (next.length === participant.length) continue; // practitioner not a member here
    entry.push({ resource: { ...ct, participant: next }, request: { method: 'PUT', url: `CareTeam/${ctId}` } });
    removedCareTeamCount += 1;
  }

  return { bundle: { resourceType: 'Bundle', type: 'transaction', entry }, endedRoleCount, removedCareTeamCount };
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
