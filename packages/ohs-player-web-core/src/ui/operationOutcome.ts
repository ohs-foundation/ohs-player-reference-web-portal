import { isOperationOutcome } from '../client/FhirError';

export function formatOperationOutcomeMessage(outcome: unknown): string {
  if (!isOperationOutcome(outcome)) return '';
  const oo = outcome as { issue?: { diagnostics?: string; details?: { text?: string } }[] };
  const i = oo.issue?.[0];
  return i?.diagnostics ?? i?.details?.text ?? '';
}
