import { afterEach, describe, expect, it, vi } from 'vitest';
import { FhirClient, rebaseFhirUrl } from './FhirClient';

function makeClient(base = 'http://localhost:5173/fhir'): FhirClient {
  return new FhirClient(base, {}, () => Promise.resolve('tok'));
}

function bundle(ids: string[], next?: string): string {
  return JSON.stringify({
    resourceType: 'Bundle',
    type: 'searchset',
    entry: ids.map((id) => ({ resource: { resourceType: 'Location', id, name: id } })),
    link: next
      ? [
          { relation: 'self', url: 'http://localhost:5173/fhir/Location' },
          { relation: 'next', url: next },
        ]
      : [{ relation: 'self', url: 'http://localhost:5173/fhir/Location' }],
  });
}

describe('rebaseFhirUrl', () => {
  it('rewrites docker-internal HAPI next links onto the client base', () => {
    expect(
      rebaseFhirUrl(
        'http://hapi-fhir:8080/fhir?_getpages=abc&_getpagesoffset=500&_count=500',
        'http://localhost:5173/fhir',
      ),
    ).toBe('http://localhost:5173/fhir?_getpages=abc&_getpagesoffset=500&_count=500');
  });

  it('preserves a path segment after /fhir', () => {
    expect(
      rebaseFhirUrl('http://localhost:8080/fhir/Location?_offset=500', 'http://localhost:5173/fhir'),
    ).toBe('http://localhost:5173/fhir/Location?_offset=500');
  });
});

describe('FhirClient.searchAll', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('follows next links and returns every resource across pages', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          bundle(
            ['a', 'b'],
            'http://hapi-fhir:8080/fhir?_getpages=p1&_getpagesoffset=2&_count=2',
          ),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(bundle(['c']), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const resources = await makeClient().searchAll('Location', { _elements: 'id,name' }, { pageSize: 2 });
    expect(resources.map((r) => (r as { id: string }).id)).toEqual(['a', 'b', 'c']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondUrl = fetchMock.mock.calls[1]?.[0] as string;
    expect(secondUrl).toBe(
      'http://localhost:5173/fhir?_getpages=p1&_getpagesoffset=2&_count=2',
    );
  });

  it('stops when a page adds no new ids (defends against broken offset paging)', async () => {
    const page = bundle(
      ['a'],
      'http://localhost:5173/fhir?_getpages=stuck&_getpagesoffset=0',
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(page, { status: 200 }))
      .mockResolvedValueOnce(new Response(page, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const resources = await makeClient().searchAll('Location', undefined, { pageSize: 1 });
    expect(resources).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('passes _count from pageSize and preserves other search params', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(bundle([]), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await makeClient().searchAll('Location', { _elements: 'id,name,partOf' }, { pageSize: 200 });
    const firstCall = fetchMock.mock.calls.at(0) as unknown as [string, RequestInit] | undefined;
    const url = firstCall?.[0] ?? '';
    expect(url).toContain('_count=200');
    expect(url).toContain('_elements=id%2Cname%2CpartOf');
  });
});
