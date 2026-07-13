import { describe, expect, it } from 'vitest';
import {
  applyLocationEdit,
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

const raw: RawHierarchyResponse = {
    root: {
      id: 'Location/loc-country-ke',
      name: 'Kenya',
      status: 'active',
      description: null,
      partOf: null,
      physicalType: null,
      type: [{ coding: [{ system: 'http://ohs.dev/codes/administrative-level', code: 'country' }] }],
      hasMoreChildren: false,
      children: [
        {
          id: 'Location/loc-nairobi',
          name: 'Nairobi',
          status: 'active',
          description: null,
          partOf: { reference: 'Location/loc-country-ke', display: 'Kenya' },
          physicalType: null,
          type: [],
          hasMoreChildren: true,
          children: [],
        },
        {
          id: 'Location/loc-unnamed',
          name: null,
          status: 'active',
          description: null,
          partOf: { reference: 'Location/loc-country-ke', display: 'Kenya' },
          physicalType: null,
          type: [],
          hasMoreChildren: false,
          children: [],
        },
      ],
    },
    meta: { nodeCount: 3, depth: 1, truncated: true, builtAt: 1783494664.17 },
};

describe('normalizeHierarchy', () => {
  it('normalizes typed-ref ids to bare ids, partOf object to id + label, and epoch builtAt to a Date', () => {
    const h = normalizeHierarchy(raw);
    expect(h.root.id).toBe('loc-country-ke');
    expect(h.root.children[0].id).toBe('loc-nairobi');
    expect(h.root.children[0].partOf).toBe('loc-country-ke');
    expect(h.root.children[0].partOfLabel).toBe('Kenya');
    expect(h.root.type[0].coding?.[0].code).toBe('country');
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

describe('applyLocationEdit', () => {
  const h = () => normalizeHierarchy(raw);

  it('renames and restatuses a node in place', () => {
    const out = applyLocationEdit(h(), { id: 'loc-nairobi', name: 'Nairobi County', status: 'inactive', parentId: 'loc-country-ke' });
    const node = findNode(out.root, 'loc-nairobi');
    expect(node?.name).toBe('Nairobi County');
    expect(node?.status).toBe('inactive');
    expect(out.root.children).toHaveLength(2);
  });

  it('moves a node under a new parent within the tree', () => {
    const out = applyLocationEdit(h(), { id: 'loc-unnamed', name: 'Renamed', status: 'active', parentId: 'loc-nairobi' });
    expect(out.root.children.map((c) => c.id)).toEqual(['loc-nairobi']);
    const nairobi = findNode(out.root, 'loc-nairobi');
    expect(nairobi?.children.map((c) => c.id)).toEqual(['loc-unnamed']);
    expect(findNode(out.root, 'loc-unnamed')?.partOfLabel).toBe('Nairobi');
  });

  it('moves a direct child under a sibling (typical “change parent” edit)', () => {
    // Kenya → Nairobi, Mombasa; move Mombasa under Nairobi.
    const base = h();
    base.root.children.push({
      id: 'loc-mombasa',
      name: 'Mombasa',
      status: 'active',
      partOf: 'loc-country-ke',
      partOfLabel: 'Kenya',
      physicalType: null,
      type: [],
      children: [],
      hasMoreChildren: false,
    });
    const out = applyLocationEdit(base, {
      id: 'loc-mombasa',
      name: 'Mombasa',
      status: 'active',
      parentId: 'loc-nairobi',
    });
    expect(out.root.children.map((c) => c.id).sort()).toEqual(['loc-nairobi', 'loc-unnamed'].sort());
    expect(findNode(out.root, 'loc-nairobi')?.children.map((c) => c.id)).toContain('loc-mombasa');
    expect(findNode(out.root, 'loc-mombasa')?.partOf).toBe('loc-nairobi');
    expect(findNode(out.root, 'loc-mombasa')?.partOfLabel).toBe('Nairobi');
  });

  it('drops a node moved out of the tree and adjusts nodeCount', () => {
    const out = applyLocationEdit(h(), { id: 'loc-nairobi', name: 'Nairobi', status: 'active', parentId: null });
    expect(findNode(out.root, 'loc-nairobi')).toBeUndefined();
    expect(out.meta.nodeCount).toBe(2);
  });

  it('only updates metadata when the view root itself is edited, and no-ops on unknown ids', () => {
    const rootEdit = applyLocationEdit(h(), { id: 'loc-country-ke', name: 'Kenya', status: 'active', parentId: 'elsewhere' });
    expect(rootEdit.root.id).toBe('loc-country-ke');
    expect(rootEdit.root.partOf).toBe('elsewhere');
    const noop = applyLocationEdit(h(), { id: 'missing', name: 'X', status: 'active', parentId: null });
    expect(noop.root.children).toHaveLength(2);
  });

  it('re-applying the same parent patch is idempotent (safe after a stale hierarchy refresh)', () => {
    const moved = applyLocationEdit(h(), {
      id: 'loc-unnamed',
      name: 'Renamed',
      status: 'active',
      parentId: 'loc-nairobi',
    });
    const again = applyLocationEdit(moved, {
      id: 'loc-unnamed',
      name: 'Renamed',
      status: 'active',
      parentId: 'loc-nairobi',
    });
    expect(again.root.children.map((c) => c.id)).toEqual(['loc-nairobi']);
    expect(findNode(again.root, 'loc-nairobi')?.children.map((c) => c.id)).toEqual(['loc-unnamed']);
  });
});
