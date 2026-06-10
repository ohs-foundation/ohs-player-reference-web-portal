import { afterEach, describe, expect, it, vi } from 'vitest';
import { FhirClient } from './FhirClient';

function makeClient(): FhirClient {
  return new FhirClient('http://localhost:5173/fhir', { users: '/api/users' }, () =>
    Promise.resolve('tok'),
  );
}

describe('FhirClient.customPut', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('PUTs JSON to the gateway path with the id segment and auth header', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{"id":"p1"}', { status: 200 })));
    vi.stubGlobal('fetch', fetchMock);

    const res = await makeClient().customPut('users', { firstName: 'Jane' }, 'p1');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:5173/api/users/p1');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ firstName: 'Jane' }));
    const headers = init.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer tok');
    expect(res).toEqual({ id: 'p1' });
  });

  it('omits the id segment when none is given', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })));
    vi.stubGlobal('fetch', fetchMock);

    await makeClient().customPut('users', {});

    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('http://localhost:5173/api/users');
  });
});
