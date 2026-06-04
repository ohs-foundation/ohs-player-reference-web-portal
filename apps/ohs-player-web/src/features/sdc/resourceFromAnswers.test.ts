import { describe, expect, it } from 'vitest';
import {
  applyUserAnswersToPractitioner,
  buildAssignmentsBundle,
  buildCreateUserPayload,
  USER_LINK_IDS,
  userAnswersFromPractitioner,
} from './resourceFromAnswers';

describe('buildCreateUserPayload', () => {
  it('maps demographics to the backend shape and derives username from the email', () => {
    const answers = {
      [USER_LINK_IDS.given]: ' Jane ',
      [USER_LINK_IDS.family]: ' Smith ',
      [USER_LINK_IDS.email]: 'Jane@Example.com',
    };

    expect(buildCreateUserPayload(answers)).toEqual({
      username: 'jane',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'Jane@Example.com',
      enabled: true,
    });
  });

  it('defaults to empty strings when answers are missing', () => {
    const payload = buildCreateUserPayload({});
    expect(payload.username).toBe('');
    expect(payload.enabled).toBe(true);
  });
});

describe('buildAssignmentsBundle (post-create PractitionerRoles)', () => {
  it('builds one PractitionerRole POST per assignment, referencing the created Practitioner', () => {
    const bundle = buildAssignmentsBundle('1000', [
      {
        organization: 'Organization/o1',
        location: 'Location/l1',
        role: { system: 'http://terminology.hl7.org/CodeSystem/practitioner-role', code: 'nurse' },
      },
    ]);

    expect(bundle.type).toBe('transaction');
    expect(bundle.entry).toHaveLength(1);
    const [roleEntry] = bundle.entry;
    expect(roleEntry.resource.resourceType).toBe('PractitionerRole');
    expect(roleEntry.request).toEqual({ method: 'POST', url: 'PractitionerRole' });
    expect((roleEntry.resource.practitioner as { reference?: string }).reference).toBe(
      'Practitioner/1000',
    );
    expect((roleEntry.resource.organization as { reference?: string }).reference).toBe(
      'Organization/o1',
    );
  });

  it('produces an empty transaction when there are no assignments', () => {
    const bundle = buildAssignmentsBundle('1000', []);
    expect(bundle.entry).toHaveLength(0);
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
