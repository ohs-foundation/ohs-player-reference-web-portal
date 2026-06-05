import { z } from 'zod';

/** Raw values collected by the Add/Edit User drawers, validated before submit. */
export interface UserFormValues {
  givenName: string;
  familyName: string;
  email: string;
  phone: string;
  gender: string;
  qualification: string;
  identifierMode: 'auto' | 'manual';
  identifierValue: string;
}

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>;

type Translate = (key: string) => string;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s()-]{7,}$/;

/**
 * Zod schema for the user form. Required: given/family/email; email must be well-formed; phone is
 * optional but format-checked when present; a manual identifier must have a value. Messages are
 * translated up-front so callers get display-ready text.
 */
function userFormSchema(t: Translate) {
  return z
    .object({
      givenName: z.string().trim().min(1, t('validationRequiredGiven')),
      familyName: z.string().trim().min(1, t('validationRequiredFamily')),
      email: z.string().trim().min(1, t('validationRequiredEmail')),
      phone: z.string(),
      gender: z.string(),
      qualification: z.string(),
      identifierMode: z.enum(['auto', 'manual']),
      identifierValue: z.string(),
    })
    .superRefine((val, ctx) => {
      if (val.email.trim() && !EMAIL_RE.test(val.email.trim())) {
        ctx.addIssue({ code: 'custom', path: ['email'], message: t('validationInvalidEmail') });
      }
      if (val.phone.trim() && !PHONE_RE.test(val.phone.trim())) {
        ctx.addIssue({ code: 'custom', path: ['phone'], message: t('validationInvalidPhone') });
      }
      if (val.identifierMode === 'manual' && !val.identifierValue.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['identifierValue'],
          message: t('validationRequiredIdentifier'),
        });
      }
    });
}

/** Validate the form; returns a map of field → first error message (empty object = valid). */
export function validateUserForm(values: UserFormValues, t: Translate): UserFormErrors {
  const result = userFormSchema(t).safeParse(values);
  if (result.success) return {};
  const errors: UserFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof UserFormValues | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
