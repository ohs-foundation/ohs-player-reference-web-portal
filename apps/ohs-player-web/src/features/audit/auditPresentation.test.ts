import { FhirError } from 'ohs-player-web-core';
import { describe, expect, it } from 'vitest';
import { actionLabelKey, actionTone, auditError, recordedDate } from './auditPresentation';

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

  it.each([401, 403])('shows fixed copy on %s and keeps the server body as a detail', (status) => {
    const error = new FhirError('Forbidden: missing role GET_AUDITEVENT', status, undefined);
    expect(auditError(error, t)).toEqual({
      title: 'auditErrorTitle',
      description: 'auditErrorForbidden',
      detail: 'Forbidden: missing role GET_AUDITEVENT',
    });
  });

  it('describes a server error in plain words and keeps the diagnostics as a detail', () => {
    const outcome = {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'processing', diagnostics: 'HAPI-0389: database down' }],
    };
    expect(auditError(new FhirError('Internal Server Error', 500, outcome), t)).toEqual({
      title: 'auditErrorTitle',
      description: 'errorCauseServer',
      detail: 'HAPI-0389: database down',
    });
  });

  it('keeps the gateway { error } text as the detail', () => {
    const error = new FhirError('gateway timeout', 504, { error: 'gateway timeout' });
    expect(auditError(error, t).detail).toBe('gateway timeout');
  });

  it('reads recorded instants and rejects missing or malformed ones', () => {
    expect(recordedDate('2026-09-22T08:30:00.000Z')?.toISOString()).toBe(
      '2026-09-22T08:30:00.000Z',
    );
    expect(recordedDate(undefined)).toBeUndefined();
    expect(recordedDate('yesterday')).toBeUndefined();
  });
});
