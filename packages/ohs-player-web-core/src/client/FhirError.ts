/** Structured error for non-success FHIR responses (typically `OperationOutcome`). */
export class FhirError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly outcome: unknown,
  ) {
    super(message);
    this.name = 'FhirError';
  }
}

export function isOperationOutcome(body: unknown): boolean {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { resourceType?: string }).resourceType === 'OperationOutcome'
  );
}
