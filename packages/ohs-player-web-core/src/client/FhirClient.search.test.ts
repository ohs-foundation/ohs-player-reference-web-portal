import { afterEach, describe, expect, it, vi } from 'vitest';
import { FhirClient } from './FhirClient';

function makeClient(): FhirClient {
  return new FhirClient('http://localhost:5173/fhir', {}, () => Promise.resolve('tok'));
}

describe('FhirClient.search', () => {
  afterEach(() => vi.unstubAllGlobals());

  // Regression: HAPI reuses identical cached searches for 60 s, so a refetch right after a mutation
  // (e.g. 2nd bulk import → root-location dropdown) returned pre-mutation results without this header.
  it('bypasses HTTP + HAPI search caches (no-store, Cache-Control, Pragma)', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response('{"resourceType":"Bundle"}', { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await makeClient().search('Location', { _count: '200' });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:5173/fhir/Location?_count=200');
    const headers = init.headers as Headers;
    expect(headers.get('Cache-Control')).toBe('no-cache');
    expect(headers.get('Pragma')).toBe('no-cache');
    expect(init.cache).toBe('no-store');
    expect(headers.get('Authorization')).toBe('Bearer tok');
  });
});
