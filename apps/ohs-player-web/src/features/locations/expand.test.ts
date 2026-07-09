import { describe, expect, it } from 'vitest';
import type { LocationNode } from './hierarchy';
import { collectExpandableIds, filterTree } from './expand';

function node(partial: Partial<LocationNode> & { id: string }): LocationNode {
  return {
    name: partial.id,
    status: 'active',
    description: null,
    partOf: 'ke',
    partOfLabel: 'Kenya',
    physicalType: null,
    type: [],
    children: [],
    hasMoreChildren: false,
    ...partial,
  };
}

const tree: LocationNode = node({
  id: 'ke',
  name: 'Kenya',
  partOf: null,
  children: [
    node({ id: 'nrb', name: 'Nairobi', status: 'active' }),
    node({ id: 'msa', name: 'Mombasa', status: 'inactive' }),
  ],
});

describe('filterTree', () => {
  it('returns the original tree with no expansion when term is empty and status is all', () => {
    const { tree: out, expand } = filterTree(tree, '', 'all');
    expect(out).toBe(tree);
    expect(expand.size).toBe(0);
  });

  it('keeps only nodes matching the status filter (plus ancestors)', () => {
    const { tree: out, expand } = filterTree(tree, '', 'inactive');
    expect(out.children.map((c) => c.id)).toEqual(['msa']);
    expect(expand.has('ke')).toBe(true); // ancestor of the match is force-expanded
  });

  it('combines name and status filters (both must match on the node)', () => {
    // 'nairobi' matches by name but is active, so an inactive filter drops it → root has no children.
    expect(filterTree(tree, 'nairobi', 'inactive').tree.children).toHaveLength(0);
    expect(filterTree(tree, 'nairobi', 'active').tree.children.map((c) => c.id)).toEqual(['nrb']);
  });
});

describe('collectExpandableIds', () => {
  it('collects ids of nodes that have children', () => {
    expect(collectExpandableIds(tree).has('ke')).toBe(true);
    expect(collectExpandableIds(tree).has('nrb')).toBe(false);
  });
});
