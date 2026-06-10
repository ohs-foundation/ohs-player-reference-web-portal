import { describe, expect, it } from 'vitest';
import {
  applyUserAnswersToPractitioner,
  buildDeactivateBundle,
  buildNewUserBundle,
  buildNewUserPayload,
  buildUserEditBundle,
  type NewUserFields,
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
    qualification: '',
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
});

describe('buildNewUserBundle', () => {
  const created = {
    resourceType: 'Practitioner',
    id: '1000',
    name: [{ family: 'Smith', given: ['Jane'] }],
    identifier: [{ system: 'http://ohs.dev/identifiers/keycloak-user-id', value: 'kc-1' }],
  };

  it('PUTs the enriched Practitioner (telecom, gender, qualification; Keycloak id preserved)', () => {
    const bundle = buildNewUserBundle(
      created,
      fields({
        email: 'jane@example.com',
        phone: '0700000000',
        gender: 'female',
        qualification: 'MBChB',
      }),
      [],
    );

    expect(bundle.entry).toHaveLength(1);
    const put = bundle.entry[0];
    expect(put.request).toEqual({ method: 'PUT', url: 'Practitioner/1000' });
    const r = put.resource as {
      telecom?: { system?: string; value?: string }[];
      gender?: string;
      qualification?: { code?: { text?: string } }[];
      identifier?: { value?: string }[];
    };
    expect(r.telecom).toEqual([
      { system: 'email', value: 'jane@example.com' },
      { system: 'phone', value: '0700000000' },
    ]);
    expect(r.gender).toBe('female');
    expect(r.qualification?.[0].code?.text).toBe('MBChB');
    // The Keycloak-id identifier is preserved untouched; no client-minted identifier is added.
    expect(r.identifier?.map((i) => i.value)).toEqual(['kc-1']);
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

  it('PUTs only the Practitioner when no role/org/location/careteam is chosen', () => {
    const bundle = buildNewUserBundle(created, fields(), []);
    expect(bundle.entry).toHaveLength(1);
    expect(bundle.entry[0].request.method).toBe('PUT');
  });
});

describe('buildUserEditBundle', () => {
  const pract = {
    resourceType: 'Practitioner',
    id: 'p1',
    name: [{ family: 'Smith', given: ['Jane'] }],
    identifier: [{ system: 'http://ohs.dev/identifiers/keycloak-user-id', value: 'kc-1' }],
  };

  it('PUTs the practitioner, replaces roles (DELETE old + POST new), and reconciles care teams', () => {
    const bundle = buildUserEditBundle(
      pract,
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
    expect(methods).toContain('PUT Practitioner/p1');
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
