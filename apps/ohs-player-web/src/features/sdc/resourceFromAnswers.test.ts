import { describe, expect, it } from 'vitest';
import {
  applyUserAnswersToPractitioner,
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
