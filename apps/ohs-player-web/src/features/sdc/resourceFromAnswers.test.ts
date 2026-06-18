import { describe, expect, it } from 'vitest';
import {
  applyUserAnswersToPractitioner,
  buildDeactivateBundle,
  careTeamFromForm,
  buildNewUserBundle,
  buildNewUserPayload,
  buildUserEditBundle,
  type NewUserFields,
  locationManagingOrgPatch,
  organizationFromForm,
  USER_LINK_IDS,
  userAnswersFromPractitioner,
} from './resourceFromAnswers';

const ROLE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/practitioner-role';

function fields(overrides: Partial<NewUserFields> = {}): NewUserFields {
  return {
    givenName: 'Jane',
    familyName: 'Smith',
    email: 'Jane@Example.com',
    phone: '',
    gender: '',
    dob: '',
    nationalId: '',
    active: true,
    role: null,
    organizations: [],
    locations: [],
    ...overrides,
  };
}

describe('buildNewUserPayload', () => {
  it('maps fields to the backend shape and derives username from the email', () => {
    expect(buildNewUserPayload(fields())).toEqual({
      username: 'jane',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'Jane@Example.com',
      enabled: true,
    });
  });

  it('reflects the active flag in enabled', () => {
    expect(buildNewUserPayload(fields({ active: false })).enabled).toBe(false);
  });

  it('includes demographics the backend owns (gender/dob/national_id/phone) when present, omits blanks', () => {
    const payload = buildNewUserPayload(
      fields({ gender: 'female', dob: '1990-05-01', nationalId: 'NID-9', phone: '0700000000' }),
    );
    expect(payload.gender).toBe('female');
    expect(payload.dob).toBe('1990-05-01');
    expect(payload.national_id).toBe('NID-9');
    expect(payload.phone).toBe('0700000000');
    // blanks are omitted, not sent as empty strings
    expect(buildNewUserPayload(fields())).not.toHaveProperty('phone');
    expect(buildNewUserPayload(fields({ gender: 'nonsense' }))).not.toHaveProperty('gender');
  });

  it('includes non-empty groupIds, omits empty/undefined, and honours a username override', () => {
    expect(buildNewUserPayload(fields({ groupIds: ['g1', 'g2'] })).groupIds).toEqual(['g1', 'g2']);
    expect(buildNewUserPayload(fields({ groupIds: [] }))).not.toHaveProperty('groupIds');
    expect(buildNewUserPayload(fields())).not.toHaveProperty('groupIds');
    // edit passes the existing username so an email change doesn't rename the Keycloak account
    expect(buildNewUserPayload(fields({ email: 'new@example.com' }), 'jane').username).toBe('jane');
  });
});

describe('buildNewUserBundle', () => {
  const created = {
    resourceType: 'Practitioner',
    id: '1000',
    name: [{ family: 'Smith', given: ['Jane'] }],
    identifier: [{ system: 'http://ohs.dev/identifiers/keycloak-user-id', value: 'kc-1' }],
  };

  it('does not PUT the Practitioner — the backend owns demographics now', () => {
    const bundle = buildNewUserBundle(
      created,
      fields({ phone: '0700000000', gender: 'female', role: { system: ROLE_SYSTEM, code: 'doctor' }, organizations: ['Organization/o1'] }),
      [],
    );
    expect(bundle.entry.some((e) => e.request.url.startsWith('Practitioner/'))).toBe(false);
  });

  it('POSTs one PractitionerRole per organisation carrying role + locations', () => {
    const bundle = buildNewUserBundle(
      created,
      fields({
        role: { system: ROLE_SYSTEM, code: 'doctor' },
        organizations: ['Organization/o1', 'Organization/o2'],
        locations: ['Location/l1'],
      }),
      [],
    );

    const roles = bundle.entry.filter((e) => e.request.url === 'PractitionerRole');
    expect(roles).toHaveLength(2);
    const role = roles[0].resource as {
      organization?: { reference?: string };
      location?: { reference?: string }[];
      code?: { coding?: { code?: string }[] }[];
      practitioner?: { reference?: string };
    };
    expect(role.practitioner?.reference).toBe('Practitioner/1000');
    expect(role.organization?.reference).toBe('Organization/o1');
    expect(role.location?.[0].reference).toBe('Location/l1');
    expect(role.code?.[0].coding?.[0].code).toBe('doctor');
  });

  it('PUTs each selected CareTeam with the practitioner added as a participant', () => {
    const careTeam = { resourceType: 'CareTeam', id: 'ct1', name: 'Ebola', participant: [] };
    const bundle = buildNewUserBundle(created, fields(), [careTeam]);
    const ct = bundle.entry.find((e) => e.request.url === 'CareTeam/ct1');
    expect(ct).toBeDefined();
    const participants = (ct?.resource as { participant?: { member?: { reference?: string } }[] })
      .participant;
    expect(participants?.[0].member?.reference).toBe('Practitioner/1000');
  });

  it('is empty when no role/org/location/careteam is chosen (caller skips the transaction)', () => {
    const bundle = buildNewUserBundle(created, fields(), []);
    expect(bundle.entry).toHaveLength(0);
  });
});

describe('buildUserEditBundle', () => {
  const pract = {
    resourceType: 'Practitioner',
    id: 'p1',
    name: [{ family: 'Smith', given: ['Jane'] }],
    identifier: [{ system: 'http://ohs.dev/identifiers/keycloak-user-id', value: 'kc-1' }],
  };

  it('replaces roles (DELETE old + POST new) and reconciles care teams; never PUTs the Practitioner', () => {
    const bundle = buildUserEditBundle(
      pract.id,
      fields({ role: { system: ROLE_SYSTEM, code: 'nurse' }, organizations: ['Organization/o1'] }),
      {
        existingRoleIds: ['r1', 'r2'],
        careTeamAdds: [{ resourceType: 'CareTeam', id: 'ctA', participant: [] }],
        careTeamRemoves: [
          { resourceType: 'CareTeam', id: 'ctR', participant: [{ member: { reference: 'Practitioner/p1' } }] },
        ],
      },
    );

    const methods = bundle.entry.map((e) => `${e.request.method} ${e.request.url}`);
    // The gateway PUT /api/users/{id} owns the Practitioner — this bundle must not touch it.
    expect(methods.some((m) => m.startsWith('PUT Practitioner/'))).toBe(false);
    expect(methods).toContain('DELETE PractitionerRole/r1');
    expect(methods).toContain('DELETE PractitionerRole/r2');
    expect(methods.filter((m) => m === 'POST PractitionerRole')).toHaveLength(1);

    const add = bundle.entry.find((e) => e.request.url === 'CareTeam/ctA');
    const addParticipants = (add?.resource as { participant?: { member?: { reference?: string } }[] })
      .participant;
    expect(addParticipants?.some((p) => p.member?.reference === 'Practitioner/p1')).toBe(true);

    const rem = bundle.entry.find((e) => e.request.url === 'CareTeam/ctR');
    expect((rem?.resource as { participant?: unknown[] }).participant).toHaveLength(0);
  });
});

describe('careTeamFromForm', () => {
  const base = {
    name: 'Ebola Response',
    description: '',
    status: 'active' as const,
    memberIds: [],
    organizationId: '',
  };

  it('maps name + status, and omits blank description/members/organisation (no location — not in R4)', () => {
    const ct = careTeamFromForm(base);
    expect(ct).toEqual({ resourceType: 'CareTeam', status: 'active', name: 'Ebola Response' });
    expect(ct).not.toHaveProperty('participant');
    expect(ct).not.toHaveProperty('managingOrganization');
  });

  it('maps description→note, members→participant (Practitioner refs + clinical role), and managingOrganization', () => {
    const ct = careTeamFromForm({
      ...base,
      description: 'Outbreak team',
      status: 'inactive',
      memberIds: ['p1', 'Practitioner/p2'],
      organizationId: 'o1',
    }) as {
      status?: string;
      note?: { text?: string }[];
      managingOrganization?: { reference?: string }[];
      participant?: { member?: { reference?: string }; role?: { coding?: { code?: string }[] }[] }[];
    };
    expect(ct.status).toBe('inactive');
    expect(ct.note?.[0].text).toBe('Outbreak team');
    expect(ct.participant?.map((p) => p.member?.reference)).toEqual([
      'Practitioner/p1',
      'Practitioner/p2',
    ]);
    expect(ct.participant?.[0].role?.[0].coding?.[0].code).toBe('clinical');
    // R4 managingOrganization is 0..* — must be an array, not a scalar object
    expect(Array.isArray(ct.managingOrganization)).toBe(true);
    expect(ct.managingOrganization?.[0].reference).toBe('Organization/o1');
  });

  it('preserves a passed Organization/ ref and clears managingOrganization on edit when blank', () => {
    const created = careTeamFromForm({ ...base, organizationId: 'Organization/o9' }) as {
      managingOrganization?: { reference?: string }[];
    };
    expect(created.managingOrganization?.[0].reference).toBe('Organization/o9');

    const cleared = careTeamFromForm(base, {
      id: 'ct1',
      managingOrganization: [{ reference: 'Organization/o9' }],
    });
    expect(cleared).not.toHaveProperty('managingOrganization');
    expect(cleared.id).toBe('ct1');
  });
});

describe('buildDeactivateBundle', () => {
  const pract = { resourceType: 'Practitioner', id: 'p1', active: true };
  const END = '2026-06-09T00:00:00.000Z';

  it('PUTs active:false, end-dates active roles, removes the practitioner from care teams', () => {
    const roles = [
      { resourceType: 'PractitionerRole', id: 'r1', active: true },
      { resourceType: 'PractitionerRole', id: 'r2', active: true, period: { start: '2026-01-01' } },
    ];
    const careTeams = [
      {
        resourceType: 'CareTeam',
        id: 'ct1',
        participant: [{ member: { reference: 'Practitioner/p1' } }, { member: { reference: 'Practitioner/p9' } }],
      },
    ];
    const { bundle, endedRoleCount, removedCareTeamCount } = buildDeactivateBundle(pract, roles, careTeams, END);

    expect(endedRoleCount).toBe(2);
    expect(removedCareTeamCount).toBe(1);

    const practEntry = bundle.entry.find((e) => e.request.url === 'Practitioner/p1');
    expect((practEntry?.resource as { active?: boolean }).active).toBe(false);

    const r1 = bundle.entry.find((e) => e.request.url === 'PractitionerRole/r1');
    expect((r1?.resource as { period?: { end?: string }; active?: boolean }).period?.end).toBe(END);
    expect((r1?.resource as { active?: boolean }).active).toBe(false);

    const ct = bundle.entry.find((e) => e.request.url === 'CareTeam/ct1');
    const members = (ct?.resource as { participant?: { member?: { reference?: string } }[] }).participant;
    expect(members?.map((m) => m.member?.reference)).toEqual(['Practitioner/p9']);
  });

  it('leaves already-ended roles untouched and skips care teams the user is not in', () => {
    const roles = [{ resourceType: 'PractitionerRole', id: 'r1', period: { end: '2025-01-01' } }];
    const careTeams = [
      { resourceType: 'CareTeam', id: 'ct1', participant: [{ member: { reference: 'Practitioner/other' } }] },
    ];
    const { bundle, endedRoleCount, removedCareTeamCount } = buildDeactivateBundle(pract, roles, careTeams, END);
    expect(endedRoleCount).toBe(0);
    expect(removedCareTeamCount).toBe(0);
    // only the Practitioner PUT remains
    expect(bundle.entry).toHaveLength(1);
    expect(bundle.entry[0].request.url).toBe('Practitioner/p1');
  });
});

describe('organizationFromForm', () => {
  const base = { name: 'Ministry of Health', typeCode: '', email: '', active: true };

  it('maps name + active, omits blank type/email, and never sets identifier (server-assigned)', () => {
    const org = organizationFromForm(base);
    expect(org).toEqual({ resourceType: 'Organization', name: 'Ministry of Health', active: true });
    expect(org).not.toHaveProperty('type');
    expect(org).not.toHaveProperty('identifier');
    expect(org).not.toHaveProperty('telecom');
  });

  it('maps type→coding, email→telecom, and the inactive flag', () => {
    const org = organizationFromForm({
      ...base,
      typeCode: 'govt',
      email: 'info@moh.go.ke',
      active: false,
    }) as {
      active?: boolean;
      type?: { coding?: { system?: string; code?: string }[] }[];
      telecom?: { system?: string; value?: string }[];
    };
    expect(org.active).toBe(false);
    expect(org.type?.[0].coding?.[0]).toEqual({
      system: 'http://terminology.hl7.org/CodeSystem/organization-type',
      code: 'govt',
    });
    expect(org.telecom?.[0]).toEqual({ system: 'email', value: 'info@moh.go.ke' });
  });

  it('on edit, preserves unmanaged fields incl. server identifier, drops the cleared email', () => {
    const existing = {
      id: 'o1',
      partOf: { reference: 'Organization/parent' },
      identifier: [{ system: 'http://other', value: 'keep' }],
      telecom: [
        { system: 'phone', value: '0700' },
        { system: 'email', value: 'old@x.com' },
      ],
    };
    const org = organizationFromForm(base, existing) as {
      id?: string;
      partOf?: { reference?: string };
      identifier?: { system?: string; value?: string }[];
      telecom?: { system?: string; value?: string }[];
    };
    expect(org.id).toBe('o1');
    expect(org.partOf?.reference).toBe('Organization/parent');
    // identifier is not form-managed — it passes through untouched
    expect(org.identifier).toEqual([{ system: 'http://other', value: 'keep' }]);
    // email was blank in base → cleared; the non-email telecom survives
    expect(org.telecom).toEqual([{ system: 'phone', value: '0700' }]);
  });
});

describe('locationManagingOrgPatch', () => {
  type Op = { name: string; valueCode?: string; valueString?: string; valueReference?: { reference?: string } };
  const operations = (patch: Record<string, unknown>): Op[][] =>
    (patch.parameter as { part?: Op[] }[]).map((op) => op.part ?? []);
  const typeOf = (parts: Op[]): string | undefined => parts.find((p) => p.name === 'type')?.valueCode;

  it('links via `delete` then `add` so it is conformant whether the element is absent or present', () => {
    const patch = locationManagingOrgPatch('Organization/o1');
    expect(patch.resourceType).toBe('Parameters');
    const ops = operations(patch);
    expect(ops.map(typeOf)).toEqual(['delete', 'add']);
    // the `add` op carries path/name/value for managingOrganization
    const add = ops[1];
    expect(add.find((p) => p.name === 'path')?.valueString).toBe('Location');
    expect(add.find((p) => p.name === 'name')?.valueString).toBe('managingOrganization');
    expect(add.find((p) => p.name === 'value')?.valueReference?.reference).toBe('Organization/o1');
  });

  it('unlinks with a lone `delete` op (orgRef null)', () => {
    const ops = operations(locationManagingOrgPatch(null));
    expect(ops.map(typeOf)).toEqual(['delete']);
    expect(ops[0].find((p) => p.name === 'path')?.valueString).toBe('Location.managingOrganization');
    expect(ops[0].some((p) => p.name === 'value')).toBe(false);
  });
});

describe('Practitioner answer round-trip (edit)', () => {
  it('pre-populates answers from a Practitioner and writes them back', () => {
    const practitioner = {
      resourceType: 'Practitioner',
      id: 'p1',
      active: true,
      name: [{ family: 'Smith', given: ['Jane'] }],
      telecom: [{ system: 'email', value: 'jane@example.com' }],
    };

    const answers = userAnswersFromPractitioner(practitioner);
    expect(answers[USER_LINK_IDS.given]).toBe('Jane');
    expect(answers[USER_LINK_IDS.family]).toBe('Smith');
    expect(answers[USER_LINK_IDS.email]).toBe('jane@example.com');
    expect(answers[USER_LINK_IDS.active]).toBe('true');

    const updated = applyUserAnswersToPractitioner(practitioner, {
      ...answers,
      [USER_LINK_IDS.family]: 'Jones',
      [USER_LINK_IDS.active]: 'false',
    });
    expect((updated.name as { family?: string }[])[0].family).toBe('Jones');
    expect(updated.active).toBe(false);
    expect(updated.id).toBe('p1');
  });
});
