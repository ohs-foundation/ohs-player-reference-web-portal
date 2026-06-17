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

/** Default CareTeam participant role coding. Members reference `Practitioner/{id}`, per the sync-doc
 * model where CareTeam.participant.member resolves to a Practitioner. */
export const CARE_TEAM_ROLE_CODING = {
  system: 'http://terminology.hl7.org/CodeSystem/care-team-roles',
  code: 'clinical',
  display: 'Clinical',
};

/**
 * Fields the bespoke Add/Edit Care Team drawer collects. `memberIds` are Practitioner ids. A
 * CareTeam→Location association is not modelled (R4 CareTeam has no `location`); the org link is the
 * optional `managingOrganization`.
 */
export interface CareTeamFormFields {
  name: string;
  description: string;
  status: 'active' | 'inactive';
  /** Practitioner ids to add as participants. */
  memberIds: string[];
  /** Managing Organization id (or `Organization/{id}` ref), or '' for none. */
  organizationId: string;
}

/**
 * Map the Care Team form to a FHIR CareTeam resource. On create, omit `existing` (server assigns the
 * id). On edit, pass the existing resource so unmanaged fields (id, meta, identifier, …) are preserved
 * while the form-managed fields are overwritten — including removals (cleared description / no members /
 * no organisation).
 */
export function careTeamFromForm(
  fields: CareTeamFormFields,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const careTeam: Record<string, unknown> = {
    ...(existing ?? {}),
    resourceType: 'CareTeam',
    status: fields.status,
    name: fields.name.trim(),
  };
  if (fields.description.trim()) careTeam.note = [{ text: fields.description.trim() }];
  else delete careTeam.note;
  if (fields.memberIds.length > 0) {
    careTeam.participant = fields.memberIds.map((id) => ({
      member: { reference: id.includes('/') ? id : `Practitioner/${id}` },
      role: [{ coding: [CARE_TEAM_ROLE_CODING] }],
    }));
  } else {
    delete careTeam.participant;
  }
  const orgId = fields.organizationId.trim();
  // R4 CareTeam.managingOrganization is 0..* — always an array.
  if (orgId) careTeam.managingOrganization = [{ reference: orgId.includes('/') ? orgId : `Organization/${orgId}` }];
  else delete careTeam.managingOrganization;
  return careTeam;
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

/** Backend writes the national id as a Practitioner identifier under this system. */
export const NATIONAL_ID_IDENTIFIER_SYSTEM = 'http://ohs.dev/identifiers/national-id';

/**
 * Request body for `POST /api/users` and `PUT /api/users/{id}` (OHS backend). The backend writes the
 * Keycloak user (username/first/last/email/enabled) AND the full FHIR Practitioner (name, telecom,
 * active, gender, birthDate, national-id identifier) itself — the client does not patch demographics.
 * `national_id` is snake_case to match the backend's `@JsonProperty`.
 */
export interface CreateUserPayload {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  enabled: boolean;
  gender?: string;
  dob?: string;
  national_id?: string;
  phone?: string;
  /** IAM group ids; omit to leave membership unchanged, `[]` removes all, a set replaces. */
  groupIds?: string[];
}

/** Everything the redesigned Add/Edit User drawer collects (bespoke form, not SDC). */
export interface NewUserFields {
  givenName: string;
  familyName: string;
  email: string;
  phone: string;
  /** FHIR administrative-gender code (`male` | `female` | `other` | `unknown`) or ''. */
  gender: string;
  /** FHIR date `YYYY-MM-DD` or ''. */
  dob: string;
  /** National identifier value or ''. */
  nationalId: string;
  active: boolean;
  /** PractitionerRole.code coding; null = no clinical role. */
  role: { system: string; code: string } | null;
  organizations: string[];
  locations: string[];
  /** Selected IAM group ids; omit (undefined) to leave Keycloak group membership unchanged. */
  groupIds?: string[];
}

/** Backend requires a username; derive it from the email local-part. */
export function usernameFromEmail(email: string): string {
  return email.split('@')[0]?.trim().toLowerCase() ?? '';
}

function genderToFhir(raw: string): string | undefined {
  const g = raw.trim().toLowerCase();
  return g === 'male' || g === 'female' || g === 'other' || g === 'unknown' ? g : undefined;
}

/**
 * Map the form to the backend user body for `POST`/`PUT /api/users`; omit blank optionals so the
 * gateway treats them as unset. On edit, pass `usernameOverride` (the user's existing username) so an
 * email change does not rename the Keycloak account.
 */
export function buildNewUserPayload(fields: NewUserFields, usernameOverride?: string): CreateUserPayload {
  const payload: CreateUserPayload = {
    username: usernameOverride?.trim() || usernameFromEmail(fields.email),
    firstName: fields.givenName.trim(),
    lastName: fields.familyName.trim(),
    email: fields.email.trim(),
    enabled: fields.active,
  };
  const gender = genderToFhir(fields.gender);
  if (gender) payload.gender = gender;
  if (fields.dob.trim()) payload.dob = fields.dob.trim();
  if (fields.nationalId.trim()) payload.national_id = fields.nationalId.trim();
  if (fields.phone.trim()) payload.phone = fields.phone.trim();
  if (fields.groupIds?.length) payload.groupIds = fields.groupIds;
  return payload;
}

interface TransactionEntry {
  /** Omitted for DELETE entries. */
  resource?: Record<string, unknown>;
  request: { method: 'POST' | 'PUT' | 'DELETE'; url: string };
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
 * Post-create FHIR transaction for what the backend does NOT manage: POST one PractitionerRole per
 * organisation, and PUT each selected CareTeam with the practitioner added as a participant. The
 * backend's `POST /api/users` already wrote the full Practitioner (demographics + identifiers), so the
 * client no longer PUTs it. May be empty when no role/careteam is chosen — callers should skip the
 * transaction in that case.
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
      ...roleEntries(ref, fields),
      ...careTeams.filter((ct) => typeof ct.id === 'string').map((ct) => addParticipant(ct, ref)),
    ],
  };
}

/**
 * Edit-save FHIR transaction for what the backend does NOT manage: replace the PractitionerRoles
 * (DELETE the existing ones, POST fresh ones from the form) and reconcile CareTeam membership. The
 * Practitioner demographics are written by `PUT /api/users/{id}` (gateway), so this bundle never PUTs
 * the Practitioner. FHIR processes DELETE before POST, so the role replace is conflict-free. May be
 * empty when nothing changed — callers should skip the transaction in that case.
 */
export function buildUserEditBundle(
  practitionerId: string,
  fields: NewUserFields,
  opts: {
    existingRoleIds: string[];
    careTeamAdds: Record<string, unknown>[];
    careTeamRemoves: Record<string, unknown>[];
  },
): { resourceType: 'Bundle'; type: 'transaction'; entry: TransactionEntry[] } {
  const ref = `Practitioner/${practitionerId}`;
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [
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

export const LOCATION_LINK_IDS = {
  name: 'loc-name',
  status: 'loc-status',
  mode: 'loc-mode',
  addressLine: 'loc-address-line',
  parent: 'loc-parent',
} as const;

/** CodeSystem for `Organization.type`. A "Team" is an Organization of type `team` (per backend). */
export const ORGANIZATION_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/organization-type';

/**
 * Fields the bespoke Add/Edit Organisation drawer collects. R4 `Organization` has no `description`, so
 * the design's Description is omitted. The org↔location link lives on the Location side
 * (`Location.managingOrganization`), written via {@link locationWithManagingOrg}, not on the Organization.
 */
export interface OrgFormFields {
  name: string;
  /** `Organization.type` code (HL7 organization-type), or '' for none. */
  typeCode: string;
  email: string;
  active: boolean;
}

/**
 * Map the Organisation form to a FHIR Organization. On create, omit `existing` (server assigns the id).
 * On edit, pass the existing resource so unmanaged fields (id, meta, identifier, partOf, …) survive
 * while form-managed fields are overwritten — including removals (cleared type/email). The identifier
 * is not form-managed: the resource id is the identifier (matching Users/Care Teams), so any
 * server-assigned `identifier` on `existing` passes through untouched.
 */
export function organizationFromForm(
  fields: OrgFormFields,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const org: Record<string, unknown> = {
    ...(existing ?? {}),
    resourceType: 'Organization',
    name: fields.name.trim(),
    active: fields.active,
  };
  // `managedLocations` is a UI-only field the page attaches to the row; never send it to the server.
  delete org.managedLocations;

  const typeCode = fields.typeCode.trim();
  if (typeCode) org.type = [{ coding: [{ system: ORGANIZATION_TYPE_SYSTEM, code: typeCode }] }];
  else delete org.type;

  const email = fields.email.trim();
  const otherTelecom = Array.isArray(existing?.telecom)
    ? (existing.telecom as ContactPoint[]).filter((tc) => tc.system !== 'email')
    : [];
  const telecom = email ? [...otherTelecom, { system: 'email', value: email }] : otherTelecom;
  if (telecom.length > 0) org.telecom = telecom;
  else delete org.telecom;

  return org;
}

/**
 * Build a FHIRPath Patch (`Parameters`) that sets or clears a Location's `managingOrganization`
 * (R4 `0..1`) — the link between an Organization (the "who") and a Location (the "where"). Pass `orgRef`
 * (`Organization/{id}` or a transaction `urn:uuid:`) to link, or `null` to unlink. Used as the `resource`
 * of a `PATCH Location/{id}` transaction-Bundle entry, so no read-modify-write of the full resource.
 * Verified against HAPI: `add` sets the element whether absent or already present (idempotent for `0..1`);
 * `delete` removes it and is a no-op when already absent.
 */
export function locationManagingOrgPatch(orgRef: string | null): Record<string, unknown> {
  const operation =
    orgRef === null
      ? [
          { name: 'type', valueCode: 'delete' },
          { name: 'path', valueString: 'Location.managingOrganization' },
        ]
      : [
          { name: 'type', valueCode: 'add' },
          { name: 'path', valueString: 'Location' },
          { name: 'name', valueString: 'managingOrganization' },
          { name: 'value', valueReference: { reference: orgRef } },
        ];
  return { resourceType: 'Parameters', parameter: [{ name: 'operation', part: operation }] };
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
