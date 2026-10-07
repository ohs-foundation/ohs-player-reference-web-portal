import { FhirError } from 'ohs-player-web-core';

/**
 * User-facing message for a failed user create/update. Maps the known HTTP status to friendly copy
 * (a `409` conflict = duplicate user) and falls back to `fallbackKey` for everything else, so the raw
 * gateway/technical text never reaches end users. `t` is the i18n translate function.
 */
export function userErrorMessage(
  error: unknown,
  t: (key: string) => string,
  fallbackKey: 'userCreateError' | 'userSaveError',
): string {
  if (error instanceof FhirError && error.status === 409) return t('userConflictError');
  return t(fallbackKey);
}
