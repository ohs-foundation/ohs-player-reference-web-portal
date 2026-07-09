import type { LocationNode } from './hierarchy';

/** All node ids in the tree that can be expanded (have children or more to load) — for "Expand all". */
export function collectExpandableIds(root: LocationNode): Set<string> {
  const ids = new Set<string>();
  const walk = (node: LocationNode) => {
    if (node.children.length > 0 || node.hasMoreChildren) ids.add(node.id);
    node.children.forEach(walk);
  };
  walk(root);
  return ids;
}

/**
 * Client-side filter: keep a node when it (or any descendant) matches the name `term` AND the `status` filter
 * (`'all'` matches any). Returns the pruned tree and the set of ancestor ids to auto-expand so matches are
 * visible. No term and status `'all'` → original tree, no forced expansion. Filters only what's already
 * loaded (the API returns no search endpoint).
 */
export function filterTree(
  root: LocationNode,
  term: string,
  status: string = 'all',
): { tree: LocationNode; expand: Set<string> } {
  const q = term.trim().toLowerCase();
  if (!q && status === 'all') return { tree: root, expand: new Set() };
  const expand = new Set<string>();

  const prune = (node: LocationNode): LocationNode | null => {
    const nameMatch = !q || (node.name ?? '').toLowerCase().includes(q);
    const statusMatch = status === 'all' || node.status === status;
    const selfMatch = nameMatch && statusMatch;
    const children = node.children.map(prune).filter((c): c is LocationNode => c !== null);
    if (children.length > 0) expand.add(node.id);
    if (selfMatch || children.length > 0) return { ...node, children };
    return null;
  };

  return { tree: prune(root) ?? { ...root, children: [] }, expand };
}
