import { FhirError, formatOperationOutcomeMessage } from 'ohs-player-web-core';

/** Best-effort human message from a thrown value: OperationOutcome text for a FhirError, else the message. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof FhirError) return formatOperationOutcomeMessage(error.outcome);
  if (error instanceof Error) return error.message;
  return String(error);
}
