import { FhirError, formatOperationOutcomeMessage } from 'ohs-player-web-core';

/** Gateway servlets report failures as `{ "error": "..." }` rather than an OperationOutcome. */
function gatewayErrorText(body: unknown): string {
  const text = (body as { error?: unknown } | null | undefined)?.error;
  return typeof text === 'string' ? text : '';
}

/** Best-effort human message from a thrown value: OperationOutcome text for a FhirError, else the message. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof FhirError) {
    return (
      formatOperationOutcomeMessage(error.outcome) || gatewayErrorText(error.outcome) || error.message
    );
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
