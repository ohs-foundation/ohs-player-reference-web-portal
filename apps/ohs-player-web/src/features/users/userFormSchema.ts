import { z } from 'zod';
import { usernameFromEmail } from '../sdc/resourceFromAnswers';

/** Raw values collected by the Add/Edit User drawers, validated before submit. */
export interface UserFormValues {
  givenName: string;
  familyName: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  nationalId: string;
}

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>;

/** On create, the email local-part becomes the Keycloak username, which the realm caps at 3–255 chars. */
export interface ValidateUserOptions {
  enforceUsername?: boolean;
}

type Translate = (key: string) => string;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s()-]{7,}$/;
const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;
const USERNAME_MIN = 3;

/**
 * Today as `YYYY-MM-DD` in local time. Built from local parts because a date-only ISO string parses
 * as UTC midnight, which shifts a day in negative offsets and would misjudge "today" as future.
 */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Zod schema for the user form. Required: given/family/email; email must be well-formed; phone is
 * optional but format-checked when present. With `enforceUsername`, the email local-part must yield a
 * Keycloak-valid username (≥ 3 chars). Messages are translated up-front so callers get display-ready text.
 */
function userFormSchema(t: Translate, opts: ValidateUserOptions) {
  return z
    .object({
      givenName: z.string().trim().min(1, t('validationRequiredGiven')),
      familyName: z.string().trim().min(1, t('validationRequiredFamily')),
      email: z.string().trim().min(1, t('validationRequiredEmail')),
      phone: z.string(),
      gender: z.string(),
      dob: z.string(),
      nationalId: z.string(),
    })
    .superRefine((val, ctx) => {
      const email = val.email.trim();
      if (email && !EMAIL_RE.test(email)) {
        ctx.addIssue({ code: 'custom', path: ['email'], message: t('validationInvalidEmail') });
      } else if (email && opts.enforceUsername && usernameFromEmail(email).length < USERNAME_MIN) {
        ctx.addIssue({ code: 'custom', path: ['email'], message: t('validationEmailUsernameLength') });
      }
      if (val.phone.trim() && !PHONE_RE.test(val.phone.trim())) {
        ctx.addIssue({ code: 'custom', path: ['phone'], message: t('validationInvalidPhone') });
      }
      const dob = val.dob.trim();
      if (dob && !DOB_RE.test(dob)) {
        ctx.addIssue({ code: 'custom', path: ['dob'], message: t('validationInvalidDob') });
      } else if (dob && dob > todayIso()) {
        // Same fixed-width format on both sides, so a string compare orders dates correctly.
        ctx.addIssue({ code: 'custom', path: ['dob'], message: t('validationFutureDob') });
      }
    });
}

/** Validate the form; returns a map of field → first error message (empty object = valid). */
export function validateUserForm(
  values: UserFormValues,
  t: Translate,
  opts: ValidateUserOptions = {},
): UserFormErrors {
  const result = userFormSchema(t, opts).safeParse(values);
  if (result.success) return {};
  const errors: UserFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof UserFormValues | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
