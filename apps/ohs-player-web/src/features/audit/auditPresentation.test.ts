import { FhirError } from 'ohs-player-web-core';
import { describe, expect, it } from 'vitest';
import { actionLabelKey, actionTone, auditErrorMessage, recordedDate } from './auditPresentation';

const t = (key: string): string => key;

describe('audit presentation', () => {
  it.each([
    ['C', 'activityCreated', 'success'],
    ['R', 'activityViewed', 'neutral'],
    ['U', 'activityUpdated', 'info'],
    ['D', 'activityDeleted', 'warning'],
    [undefined, 'activityChanged', 'neutral'],
  ] as const)('names action %s with the bell verb and a tone', (action, key, tone) => {
    expect(actionLabelKey(action)).toBe(key);
    expect(actionTone(action)).toBe(tone);
  });

  it.each([401, 403])('shows fixed copy, not the server body, on %s', (status) => {
    const error = new FhirError('Forbidden: missing role GET_AUDITEVENT', status, undefined);
    expect(auditErrorMessage(error, t)).toBe('auditErrorForbidden');
  });

  it('shows OperationOutcome diagnostics for a server error', () => {
    const outcome = {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'processing', diagnostics: 'HAPI-0389: database down' }],
    };
    const message = auditErrorMessage(new FhirError('Internal Server Error', 500, outcome), t);
    expect(message).toContain('HAPI-0389: database down');
  });

  it('shows the gateway { error } text carried on the error message', () => {
    expect(
      auditErrorMessage(new FhirError('gateway timeout', 504, { error: 'gateway timeout' }), t),
    ).toBe('gateway timeout');
  });

  it('falls back to generic copy when there is no message at all', () => {
    expect(auditErrorMessage(new Error(''), t)).toBe('auditErrorDescription');
  });

  it('reads recorded instants and rejects missing or malformed ones', () => {
    expect(recordedDate('2026-09-22T08:30:00.000Z')?.toISOString()).toBe(
      '2026-09-22T08:30:00.000Z',
    );
    expect(recordedDate(undefined)).toBeUndefined();
    expect(recordedDate('yesterday')).toBeUndefined();
  });
});
