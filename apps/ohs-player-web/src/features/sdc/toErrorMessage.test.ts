import { FhirError } from 'ohs-player-web-core';
import { describe, expect, it } from 'vitest';
import { toErrorMessage } from './toErrorMessage';

describe('toErrorMessage', () => {
  it('prefers OperationOutcome diagnostics', () => {
    const outcome = { resourceType: 'OperationOutcome', issue: [{ diagnostics: 'Invalid name' }] };
    expect(toErrorMessage(new FhirError('HTTP 400', 400, outcome))).toBe('Invalid name');
  });

  it('reads the gateway error body when there is no OperationOutcome', () => {
    const body = { error: 'Failed to fetch practitioner details from FHIR server' };
    expect(toErrorMessage(new FhirError('HTTP 502', 502, body))).toBe(
      'Failed to fetch practitioner details from FHIR server',
    );
  });

  it('falls back to the error message when the body carries no text', () => {
    expect(toErrorMessage(new FhirError('HTTP 403', 403, undefined))).toBe('HTTP 403');
  });

  it('handles plain errors and non-error values', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
    expect(toErrorMessage('offline')).toBe('offline');
  });
});
