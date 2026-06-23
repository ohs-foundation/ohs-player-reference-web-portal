import { afterEach, describe, expect, it, vi } from 'vitest';
import { FhirClient } from './FhirClient';
import { FhirError } from './FhirError';

function makeClient(): FhirClient {
  return new FhirClient('http://localhost:5173/fhir', { users: '/api/users' }, () =>
    Promise.resolve('tok'),
  );
}

describe('FhirClient error message extraction', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('surfaces the gateway custom-route error field (e.g. a 409 conflict)', async () => {
    const body = JSON.stringify({
      error: 'Failed to create user in IAM provider: IAM provider returned status 409 creating user: jane',
      status: 409,
    });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(body, { status: 409 }))));

    const err = await makeClient()
      .customPost('users', { username: 'jane' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(FhirError);
    expect((err as FhirError).status).toBe(409);
    expect((err as FhirError).message).toBe(
      'Failed to create user in IAM provider: IAM provider returned status 409 creating user: jane',
    );
  });

  it('falls back to HTTP {status} when the error body has no recognised message', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 502 }))));
    const err = (await makeClient()
      .customPost('users', {})
      .catch((e: unknown) => e)) as FhirError;
    expect(err.message).toBe('HTTP 502');
  });

  it('uses a FHIR OperationOutcome diagnostics message when present', async () => {
    const oo = JSON.stringify({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'processing', diagnostics: 'Bad reference' }],
    });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(oo, { status: 400 }))));
    const err = (await makeClient()
      .customPost('users', {})
      .catch((e: unknown) => e)) as FhirError;
    expect(err.message).toBe('Bad reference');
  });
});
