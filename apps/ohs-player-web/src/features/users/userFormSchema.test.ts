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
    dob: '',
    nationalId: '',
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

  it('accepts an empty dob but rejects a malformed one', () => {
    expect(validateUserForm(values({ dob: '' }), t).dob).toBeUndefined();
    expect(validateUserForm(values({ dob: '01/05/1990' }), t).dob).toBe('validationInvalidDob');
    expect(validateUserForm(values({ dob: '1990-05-01' }), t).dob).toBeUndefined();
  });

  it('rejects an email whose username (local-part) is under 3 chars only when enforceUsername is set', () => {
    // nh@mail.com → username "nh" (2 chars) — Keycloak rejects < 3.
    expect(validateUserForm(values({ email: 'nh@mail.com' }), t, { enforceUsername: true }).email).toBe(
      'validationEmailUsernameLength',
    );
    expect(validateUserForm(values({ email: 'nh@mail.com' }), t).email).toBeUndefined();
    expect(validateUserForm(values({ email: 'nhx@mail.com' }), t, { enforceUsername: true }).email).toBeUndefined();
  });
});
