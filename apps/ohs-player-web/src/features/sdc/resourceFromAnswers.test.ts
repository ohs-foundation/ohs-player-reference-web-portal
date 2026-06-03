import { describe, expect, it } from 'vitest';
import {
  applyUserAnswersToPractitioner,
  buildCreateUserBundle,
  buildCreateUserPayload,
  USER_LINK_IDS,
  userAnswersFromPractitioner,
} from './resourceFromAnswers';

describe('buildCreateUserPayload', () => {
  it('composes demographics, roles, and assignments', () => {
    const answers = {
      [USER_LINK_IDS.given]: ' Jane ',
      [USER_LINK_IDS.family]: ' Smith ',
      [USER_LINK_IDS.email]: 'jane@example.com',
    };
    const payload = buildCreateUserPayload(answers, ['admin'], [
      {
        organization: 'Organization/o1',
        location: 'Location/l1',
        role: { system: 'http://example.com/roles', code: 'nurse' },
      },
    ]);

    expect(payload).toEqual({
      givenName: 'Jane',
      familyName: 'Smith',
      email: 'jane@example.com',
      roles: ['admin'],
      assignments: [
        {
          organization: 'Organization/o1',
          location: 'Location/l1',
          role: { system: 'http://example.com/roles', code: 'nurse' },
        },
      ],
    });
  });

  it('supports an empty assignment list', () => {
    const payload = buildCreateUserPayload({}, ['care-team-manager'], []);
    expect(payload.assignments).toEqual([]);
    expect(payload.roles).toEqual(['care-team-manager']);
  });
});

describe('buildCreateUserBundle (dev direct-to-FHIR)', () => {
  it('builds a transaction with a Practitioner and one PractitionerRole per assignment', () => {
    const bundle = buildCreateUserBundle({
      givenName: 'Jane',
      familyName: 'Smith',
      email: 'jane@example.com',
      roles: ['admin'],
      assignments: [
        {
          organization: 'Organization/o1',
          location: 'Location/l1',
          role: { system: 'http://terminology.hl7.org/CodeSystem/practitioner-role', code: 'nurse' },
        },
      ],
    });

    expect(bundle.type).toBe('transaction');
    expect(bundle.entry).toHaveLength(2);

    const [practEntry, roleEntry] = bundle.entry;
    expect(practEntry.resource.resourceType).toBe('Practitioner');
    expect(practEntry.request).toEqual({ method: 'POST', url: 'Practitioner' });

    expect(roleEntry.resource.resourceType).toBe('PractitionerRole');
    expect(roleEntry.request).toEqual({ method: 'POST', url: 'PractitionerRole' });
    expect((roleEntry.resource.practitioner as { reference?: string }).reference).toBe(
      practEntry.fullUrl,
    );
    expect((roleEntry.resource.organization as { reference?: string }).reference).toBe(
      'Organization/o1',
    );
  });

  it('omits PractitionerRole entries when there are no assignments', () => {
    const bundle = buildCreateUserBundle({
      givenName: 'Jane',
      familyName: 'Smith',
      email: '',
      roles: ['admin'],
      assignments: [],
    });
    expect(bundle.entry).toHaveLength(1);
    expect(bundle.entry[0].resource.resourceType).toBe('Practitioner');
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
