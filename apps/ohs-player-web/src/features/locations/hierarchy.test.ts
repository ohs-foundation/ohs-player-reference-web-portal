import { describe, expect, it } from 'vitest';
import {
  bareId,
  findNode,
  isValidRootId,
  nodeChain,
  normalizeHierarchy,
  parseBuiltAt,
  type RawHierarchyResponse,
} from './hierarchy';

describe('bareId', () => {
  it('strips a Location/ (or any Type/) prefix and passes bare ids through', () => {
    expect(bareId('Location/1000')).toBe('1000');
    expect(bareId('loc-country-ke')).toBe('loc-country-ke');
    expect(bareId(null)).toBeNull();
  });
});

describe('parseBuiltAt', () => {
  it('parses epoch seconds (verified gateway shape) and ISO strings', () => {
    // 1783494664.17 → 2026-07-08T...; assert it round-trips to the same epoch ms.
    expect(parseBuiltAt(1783494664.17)?.getTime()).toBe(Math.round(1783494664.17 * 1000));
    expect(parseBuiltAt('2026-07-08T10:00:00Z')?.toISOString()).toBe('2026-07-08T10:00:00.000Z');
    expect(parseBuiltAt(null)).toBeNull();
    expect(parseBuiltAt('not-a-date')).toBeNull();
  });
});

describe('isValidRootId', () => {
  it('accepts FHIR ids and rejects . / .. / spaces / over-64', () => {
    expect(isValidRootId('loc-country-ke')).toBe(true);
    expect(isValidRootId('1000')).toBe(true);
    expect(isValidRootId('.')).toBe(false);
    expect(isValidRootId('..')).toBe(false);
    expect(isValidRootId('bad id')).toBe(false);
    expect(isValidRootId('x'.repeat(65))).toBe(false);
  });
});

describe('normalizeHierarchy', () => {
  const raw: RawHierarchyResponse = {
    root: {
      id: 'Location/loc-country-ke',
      name: 'Kenya',
      partOf: null,
      hasMoreChildren: false,
      children: [
        { id: 'Location/loc-nairobi', name: 'Nairobi', partOf: 'Location/loc-country-ke', hasMoreChildren: true, children: [] },
        { id: 'Location/loc-unnamed', name: null, partOf: 'Location/loc-country-ke', hasMoreChildren: false, children: [] },
      ],
    },
    meta: { nodeCount: 3, depth: 1, truncated: true, builtAt: 1783494664.17 },
  };

  it('normalizes typed-ref ids to bare ids and epoch builtAt to a Date', () => {
    const h = normalizeHierarchy(raw);
    expect(h.root.id).toBe('loc-country-ke');
    expect(h.root.children[0].id).toBe('loc-nairobi');
    expect(h.root.children[0].partOf).toBe('loc-country-ke');
    expect(h.root.children[1].name).toBeNull();
    expect(h.meta.truncated).toBe(true);
    expect(h.meta.builtAt).toBeInstanceOf(Date);
  });

  it('nodeChain returns the root-first path and findNode locates by id', () => {
    const h = normalizeHierarchy(raw);
    expect(nodeChain(h.root, 'loc-nairobi').map((n) => n.id)).toEqual(['loc-country-ke', 'loc-nairobi']);
    expect(findNode(h.root, 'loc-nairobi')?.hasMoreChildren).toBe(true);
    expect(findNode(h.root, 'missing')).toBeUndefined();
  });
});
