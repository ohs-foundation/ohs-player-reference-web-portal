import { describe, expect, it, vi } from 'vitest';
import { FhirError } from 'ohs-player-web-core';
import {
  fetchLocationRoots,
  isRootLocation,
  locationRootsFromResources,
} from './locationRoots';

describe('isRootLocation', () => {
  it('treats missing partOf as root and a reference as non-root', () => {
    expect(isRootLocation({})).toBe(true);
    expect(isRootLocation({ partOf: { reference: 'Location/x' } })).toBe(false);
  });
});

describe('locationRootsFromResources', () => {
  it('keeps only roots, labels unnamed, and sorts by name', () => {
    const roots = locationRootsFromResources(
      [
        { resourceType: 'Location', id: 'et', name: 'Ethiopia' },
        { resourceType: 'Location', id: 'child', name: 'Addis', partOf: { reference: 'Location/et' } },
        { resourceType: 'Location', id: 'ng', name: 'Nigeria' },
        { resourceType: 'Location', id: 'tz', name: 'Tanzania' },
        { resourceType: 'Location', id: 'z1' },
      ],
      (id) => `Unnamed (${id})`,
    );
    expect(roots.map((r) => r.value)).toEqual(['et', 'ng', 'tz', 'z1']);
    expect(roots.map((r) => r.label)).toEqual(['Ethiopia', 'Nigeria', 'Tanzania', 'Unnamed (z1)']);
  });

  it('returns empty when a large child-only page has no roots (the old single-page failure mode)', () => {
    const children = Array.from({ length: 500 }, (_, i) => ({
      resourceType: 'Location',
      id: `c${i}`,
      name: `Child ${i}`,
      partOf: { reference: 'Location/et' },
    }));
    expect(locationRootsFromResources(children, (id) => id)).toEqual([]);
  });
});

describe('fetchLocationRoots', () => {
  it('uses partof:missing when the server accepts it', async () => {
    const searchAll = vi.fn().mockResolvedValue([
      { resourceType: 'Location', id: 'tz', name: 'Tanzania' },
      { resourceType: 'Location', id: 'ng', name: 'Nigeria' },
    ]);
    const client = { searchAll } as unknown as Parameters<typeof fetchLocationRoots>[0];
    const roots = await fetchLocationRoots(client, (id) => id);
    expect(searchAll).toHaveBeenCalledWith(
      'Location',
      expect.objectContaining({ 'partof:missing': 'true' }),
      expect.any(Object),
    );
    expect(roots.map((r) => r.value).sort()).toEqual(['ng', 'tz']);
  });

  it('falls back to a full paginated scan when partof:missing is rejected', async () => {
    const searchAll = vi
      .fn()
      .mockRejectedValueOnce(new FhirError('unknown search parameter', 400, {}))
      .mockResolvedValueOnce([
        { resourceType: 'Location', id: 'et', name: 'Ethiopia' },
        {
          resourceType: 'Location',
          id: 'leaf',
          name: 'Leaf',
          partOf: { reference: 'Location/et' },
        },
        { resourceType: 'Location', id: 'tz', name: 'Tanzania' },
      ]);
    const client = { searchAll } as unknown as Parameters<typeof fetchLocationRoots>[0];
    const roots = await fetchLocationRoots(client, (id) => id);
    expect(searchAll).toHaveBeenCalledTimes(2);
    expect(searchAll.mock.calls[1]?.[1]).not.toHaveProperty('partof:missing');
    expect(roots.map((r) => r.value)).toEqual(['et', 'tz']);
  });
});
