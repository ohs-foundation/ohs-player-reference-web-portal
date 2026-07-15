import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { todayIso, type UserFormValues, validateUserForm } from './userFormSchema';

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

  describe('date of birth cannot be in the future', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Local noon, so "today" resolves to this calendar day in every timezone.
      vi.setSystemTime(new Date(2026, 6, 14, 12, 0, 0));
    });
    afterEach(() => vi.useRealTimers());

    it('rejects a dob after today', () => {
      expect(validateUserForm(values({ dob: '2026-07-15' }), t).dob).toBe('validationFutureDob');
      expect(validateUserForm(values({ dob: '2030-01-01' }), t).dob).toBe('validationFutureDob');
    });

    it('accepts today and past dates', () => {
      expect(validateUserForm(values({ dob: '2026-07-14' }), t).dob).toBeUndefined();
      expect(validateUserForm(values({ dob: '2026-07-13' }), t).dob).toBeUndefined();
      expect(validateUserForm(values({ dob: '1990-05-01' }), t).dob).toBeUndefined();
    });

    it('reports the format error rather than the future error when both could apply', () => {
      expect(validateUserForm(values({ dob: '15/07/2030' }), t).dob).toBe('validationInvalidDob');
    });
  });
});

describe('todayIso', () => {
  it('formats local date parts, zero-padded', () => {
    // Late evening: a UTC-based implementation would roll to the 6th in positive offsets.
    expect(todayIso(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
