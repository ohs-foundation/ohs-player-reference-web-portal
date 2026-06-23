import { FhirError, formatOperationOutcomeMessage } from 'ohs-player-web-core';

/**
 * Best-effort human message from a thrown value. For a `FhirError`, prefer the FHIR
 * `OperationOutcome` diagnostics, but fall back to the error's own message — gateway custom routes
 * (`/api/*`) return a plain `{ error }` body that isn't an OperationOutcome, so `error.message`
 * (set by the client) carries the real text. Then any `Error`, then a string cast.
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof FhirError) {
    return formatOperationOutcomeMessage(error.outcome) || error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

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
