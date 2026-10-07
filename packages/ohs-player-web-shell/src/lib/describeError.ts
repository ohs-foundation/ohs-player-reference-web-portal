import { FhirError, formatOperationOutcomeMessage } from 'ohs-player-web-core';

/** What kind of failure an error is, judged from its HTTP status or, without one, from its type. */
export type ErrorCause =
  | 'signedOut'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'server'
  | 'network'
  | 'rejected'
  | 'unexpected';

/** A failure in plain words: a heading, what happened, and the server's own text for support. */
export interface ErrorDescription {
  title: string;
  description: string;
  /** The server's own message, or the error's, to show behind a "Technical details" disclosure. */
  detail: string;
}

export interface DescribeErrorOptions {
  /** `'load'` (the default) for a read, `'save'` for a write. A save also says whether anything was saved. */
  action?: 'load' | 'save';
  /** For a save: `true` once the first write succeeded, so the message says the change was saved. */
  saved?: boolean;
  /** Replaces the default heading. */
  titleKey?: string;
  /** Replaces "Nothing was saved." with a sentence that names what was left unchanged. */
  nothingSavedKey?: string;
}

const CAUSE_MESSAGE_KEY: Record<ErrorCause, string> = {
  signedOut: 'errorCauseSignedOut',
  forbidden: 'errorCauseForbidden',
  notFound: 'errorCauseNotFound',
  conflict: 'errorCauseConflict',
  server: 'errorCauseServer',
  network: 'errorCauseNetwork',
  rejected: 'errorCauseRejected',
  unexpected: 'errorCauseUnexpected',
};

const CONFLICT_STATUSES = new Set([409, 412]);
const GONE_STATUSES = new Set([404, 410]);
const FIRST_SERVER_STATUS = 500;

/** Classifies a thrown value. `fetch` rejects with a `TypeError` when the server cannot be reached. */
export function errorCause(error: unknown): ErrorCause {
  if (error instanceof FhirError) {
    if (error.status === 401) return 'signedOut';
    if (error.status === 403) return 'forbidden';
    if (GONE_STATUSES.has(error.status)) return 'notFound';
    if (CONFLICT_STATUSES.has(error.status)) return 'conflict';
    if (error.status >= FIRST_SERVER_STATUS) return 'server';
    return 'rejected';
  }
  return error instanceof TypeError ? 'network' : 'unexpected';
}

/**
 * The server's own text: an `OperationOutcome`'s diagnostics, else the error message (a gateway
 * `/api/*` route returns a plain `{ error }` body that the client copies into `message`).
 */
export function errorDetail(error: unknown): string {
  if (error instanceof FhirError)
    return formatOperationOutcomeMessage(error.outcome) || error.message;
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : '';
}

function saveTitleKey(saved: boolean): string {
  return saved ? 'savePartlySavedTitle' : 'saveFailedTitle';
}

/**
 * A plain-language heading and description for a failed load or save, plus the server's text as a
 * detail. Spread the result into `ErrorState`: `<ErrorState {...describeError(err, t)} />`.
 */
export function describeError(
  error: unknown,
  t: (key: string) => string,
  {
    action = 'load',
    saved = false,
    titleKey,
    nothingSavedKey = 'saveNothingSaved',
  }: DescribeErrorOptions = {},
): ErrorDescription {
  const cause = t(CAUSE_MESSAGE_KEY[errorCause(error)]);
  const detail = errorDetail(error);
  if (action === 'load') {
    return { title: t(titleKey ?? 'loadFailedTitle'), description: cause, detail };
  }
  const savedState = t(saved ? 'savePartlySaved' : nothingSavedKey);
  return {
    title: t(titleKey ?? saveTitleKey(saved)),
    description: `${cause} ${savedState}`,
    detail,
  };
}
