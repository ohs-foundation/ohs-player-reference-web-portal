import type { LocationNode } from './hierarchy';

export function collectExpandableIds(root: LocationNode): Set<string> {
  const ids = new Set<string>();
  const walk = (node: LocationNode) => {
    if (node.children.length > 0 || node.hasMoreChildren) ids.add(node.id);
    node.children.forEach(walk);
  };
  walk(root);
  return ids;
}

/** Keeps nodes matching name+status (ancestors retained) and returns the ancestor ids to force-expand. */
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
