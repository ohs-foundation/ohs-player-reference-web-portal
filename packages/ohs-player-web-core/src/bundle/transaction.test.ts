import { describe, expect, it, vi } from 'vitest';
import {
  bundleEntry,
  commitBundle,
  committedId,
  committedReference,
  newUrnUuid,
} from './transaction';
import type { FhirClient } from '../client/FhirClient';

describe('bundleEntry', () => {
  it('builds a POST entry with a urn:uuid fullUrl for cross-referencing', () => {
    const urn = newUrnUuid();
    const e = bundleEntry({ method: 'POST', url: 'Organization' }, { resourceType: 'Organization' }, urn);
    expect(e).toEqual({
      fullUrl: urn,
      resource: { resourceType: 'Organization' },
      request: { method: 'POST', url: 'Organization' },
    });
  });

  it('omits resource for a DELETE entry and omits fullUrl when not given', () => {
    const e = bundleEntry({ method: 'DELETE', url: 'PractitionerRole/r1' });
    expect(e).toEqual({ request: { method: 'DELETE', url: 'PractitionerRole/r1' } });
    expect(e).not.toHaveProperty('resource');
    expect(e).not.toHaveProperty('fullUrl');
  });
});

describe('newUrnUuid', () => {
  it('produces a valid RFC 4122 urn:uuid placeholder', () => {
    expect(newUrnUuid()).toMatch(
      /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

describe('commitBundle', () => {
  it('wraps entries in a transaction Bundle and submits via client.transaction', async () => {
    const transaction = vi.fn().mockResolvedValue({ resourceType: 'Bundle', type: 'transaction-response' });
    const client = { transaction } as unknown as FhirClient;
    const urn = newUrnUuid();
    const entries = [
      bundleEntry({ method: 'POST', url: 'Organization' }, { resourceType: 'Organization' }, urn),
      bundleEntry({ method: 'PATCH', url: 'Location/l1' }, { resourceType: 'Parameters' }),
    ];
    await commitBundle(client, entries);
    const submitted = transaction.mock.calls[0][0] as { resourceType: string; type: string; entry: unknown[] };
    expect(submitted.resourceType).toBe('Bundle');
    expect(submitted.type).toBe('transaction');
    expect(submitted.entry).toHaveLength(2);
    // the urn placeholder is preserved so the server can resolve the cross-reference on commit
    expect((submitted.entry[0] as { fullUrl?: string }).fullUrl).toBe(urn);
  });
});

describe('committedReference / committedId', () => {
  const response = {
    resourceType: 'Bundle' as const,
    type: 'transaction-response',
    entry: [
      { response: { status: '201 Created', location: 'Organization/1010/_history/1' } },
      { response: { status: '200 OK', location: 'Location/l1/_history/2' } },
    ],
  };

  it('parses the typed reference from response.location (strips _history)', () => {
    expect(committedReference(response, 0)).toBe('Organization/1010');
    expect(committedReference(response, 1)).toBe('Location/l1');
  });

  it('parses the bare id and defaults to the first entry', () => {
    expect(committedId(response)).toBe('1010');
  });

  it('returns undefined when the entry or location is absent', () => {
    expect(committedReference(response, 9)).toBeUndefined();
    expect(committedReference({ resourceType: 'Bundle', type: 't' })).toBeUndefined();
  });
});
