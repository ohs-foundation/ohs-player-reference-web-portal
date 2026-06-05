import { describe, expect, it } from 'vitest';
import { type UserFormValues, validateUserForm } from './userFormSchema';

const t = (key: string) => key;

function values(overrides: Partial<UserFormValues> = {}): UserFormValues {
  return {
    givenName: 'Jane',
    familyName: 'Smith',
    email: 'jane@example.com',
    phone: '',
    gender: '',
    qualification: '',
    identifierMode: 'auto',
    identifierValue: '',
    ...overrides,
  };
}

describe('validateUserForm', () => {
  it('passes a complete, valid form', () => {
    expect(validateUserForm(values(), t)).toEqual({});
  });

  it('flags missing required fields', () => {
    const errors = validateUserForm(values({ givenName: ' ', familyName: '', email: '' }), t);
    expect(errors.givenName).toBe('validationRequiredGiven');
    expect(errors.familyName).toBe('validationRequiredFamily');
    expect(errors.email).toBe('validationRequiredEmail');
  });

  it('flags a malformed email', () => {
    expect(validateUserForm(values({ email: 'not-an-email' }), t).email).toBe('validationInvalidEmail');
  });

  it('accepts an empty phone but rejects a malformed one', () => {
    expect(validateUserForm(values({ phone: '' }), t).phone).toBeUndefined();
    expect(validateUserForm(values({ phone: 'abc' }), t).phone).toBe('validationInvalidPhone');
    expect(validateUserForm(values({ phone: '+254 700 000 000' }), t).phone).toBeUndefined();
  });

  it('requires an identifier value only in manual mode', () => {
    expect(validateUserForm(values({ identifierMode: 'auto', identifierValue: '' }), t).identifierValue).toBeUndefined();
    expect(validateUserForm(values({ identifierMode: 'manual', identifierValue: '' }), t).identifierValue).toBe(
      'validationRequiredIdentifier',
    );
    expect(
      validateUserForm(values({ identifierMode: 'manual', identifierValue: 'PRAC-012' }), t).identifierValue,
    ).toBeUndefined();
  });
});
