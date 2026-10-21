import { render, screen } from '@testing-library/react';
import { FhirError } from 'ohs-player-web-core';
import { describe, expect, it, vi } from 'vitest';
import { describeError, errorCause, errorDetail } from './describeError';

vi.mock(
  'ohs-player-web-core',
  async (): Promise<object> => ({
    ...(await vi.importActual<object>('ohs-player-web-core')),
    useTranslation: () => ({ t: (key: string) => key }),
  }),
);

const { ErrorState } = await import('../components/ui/States');

const t = (key: string): string => key;
const refused = new FhirError('User is not authorized to POST http://localhost/fhir', 403, {
  error: 'User is not authorized to POST http://localhost/fhir',
});

describe('errorCause', () => {
  it.each([
    [401, 'signedOut'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [410, 'notFound'],
    [409, 'conflict'],
    [412, 'conflict'],
    [500, 'server'],
    [503, 'server'],
    [400, 'rejected'],
    [422, 'rejected'],
  ])('maps HTTP %i to %s', (status, cause) => {
    expect(errorCause(new FhirError('x', status, null))).toBe(cause);
  });

  it('treats a fetch TypeError as a network failure', () => {
    expect(errorCause(new TypeError('Failed to fetch'))).toBe('network');
  });

  it('treats anything else as unexpected', () => {
    expect(errorCause(new Error('Create did not return an id'))).toBe('unexpected');
    expect(errorCause('boom')).toBe('unexpected');
  });
});

describe('errorDetail', () => {
  it('prefers OperationOutcome diagnostics, then the error message', () => {
    const outcome = {
      resourceType: 'OperationOutcome',
      issue: [{ diagnostics: 'HAPI-0450: bad' }],
    };
    expect(errorDetail(new FhirError('HTTP 400', 400, outcome))).toBe('HAPI-0450: bad');
    expect(errorDetail(refused)).toBe('User is not authorized to POST http://localhost/fhir');
    expect(errorDetail(new TypeError('Failed to fetch'))).toBe('Failed to fetch');
    expect(errorDetail(undefined)).toBe('');
  });
});

describe('describeError', () => {
  it('describes a load failure by its cause', () => {
    expect(describeError(new TypeError('Failed to fetch'), t)).toEqual({
      title: 'loadFailedTitle',
      description: 'errorCauseNetwork',
      detail: 'Failed to fetch',
    });
  });

  it('says nothing was saved when the first write fails', () => {
    expect(describeError(refused, t, { action: 'save' })).toEqual({
      title: 'saveFailedTitle',
      description: 'errorCauseForbidden saveNothingSaved',
      detail: 'User is not authorized to POST http://localhost/fhir',
    });
  });

  it('says the change was saved when a later step fails', () => {
    const result = describeError(new FhirError('x', 500, null), t, { action: 'save', saved: true });
    expect(result.title).toBe('savePartlySavedTitle');
    expect(result.description).toBe('errorCauseServer savePartlySaved');
  });

  it('takes a caller sentence for what was left unchanged, and a caller heading', () => {
    const result = describeError(new FhirError('x', 409, null), t, {
      action: 'save',
      titleKey: 'customTitle',
      nothingSavedKey: 'organizationNothingSaved',
    });
    expect(result).toMatchObject({
      title: 'customTitle',
      description: 'errorCauseConflict organizationNothingSaved',
    });
  });
});

describe('ErrorState detail', () => {
  it('keeps the server text behind a collapsed Technical details disclosure', () => {
    render(<ErrorState {...describeError(refused, t, { action: 'save' })} />);
    expect(screen.getByRole('heading', { name: 'saveFailedTitle' })).toBeInTheDocument();
    const summary = screen.getByText('errorTechnicalDetails');
    expect(summary.tagName).toBe('SUMMARY');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText(/User is not authorized/)).toBeInTheDocument();
  });

  it('renders no disclosure without a detail', () => {
    render(<ErrorState description="Plain" detail="" />);
    expect(screen.queryByText('errorTechnicalDetails')).not.toBeInTheDocument();
  });
});
