import type { CodeableConcept } from '@medplum/fhirtypes';

/**
 * Adapter for the gateway's non-FHIR `GET /api/location-hierarchy/{rootId}`. Verified quirks: ids arrive
 * FHIR-prefixed but the request path wants bare ids; `meta.builtAt` is epoch seconds; there is no pagination —
 * `hasMoreChildren`/`truncated` are only resolvable by re-rooting on the child.
 */

interface RawPartOf {
  reference: string;
  display: string | null;
}

export interface RawLocationNode {
  id: string;
  name: string | null;
  status?: string | null;
  description?: string | null;
  partOf: RawPartOf | null;
  physicalType?: CodeableConcept | null;
  type?: CodeableConcept[] | null;
  children: RawLocationNode[];
  hasMoreChildren: boolean;
}

export interface RawHierarchyMeta {
  nodeCount: number;
  depth: number;
  truncated: boolean;
  /** Epoch seconds or ISO-8601, depending on gateway build. */
  builtAt: number | string;
}

export interface RawHierarchyResponse {
  root: RawLocationNode;
  meta: RawHierarchyMeta;
}

/** Raw `description` is dropped — nothing consumes it and no write path populates it. */
export interface LocationNode {
  id: string;
  name: string | null;
  status: string | null;
  /** Bare parent id (prefix stripped), or null on the root. */
  partOf: string | null;
  partOfLabel: string | null;
  physicalType: CodeableConcept | null;
  type: CodeableConcept[];
  children: LocationNode[];
  hasMoreChildren: boolean;
}

export interface HierarchyMeta {
  nodeCount: number;
  depth: number;
  truncated: boolean;
  builtAt: Date | null;
}

export interface LocationHierarchy {
  root: LocationNode;
  meta: HierarchyMeta;
}

export function bareId(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const slash = ref.lastIndexOf('/');
  return slash >= 0 ? ref.slice(slash + 1) : ref;
}

function normalizeNode(n: RawLocationNode): LocationNode {
  return {
    id: bareId(n.id) ?? n.id,
    name: n.name,
    status: n.status ?? null,
    partOf: bareId(n.partOf?.reference),
    partOfLabel: n.partOf?.display ?? null,
    physicalType: n.physicalType ?? null,
    type: Array.isArray(n.type) ? n.type : [],
    children: Array.isArray(n.children) ? n.children.map(normalizeNode) : [],
    hasMoreChildren: Boolean(n.hasMoreChildren),
  };
}

export function parseBuiltAt(value: number | string | null | undefined): Date | null {
  if (value == null) return null;
  if (typeof value === 'number') {
    const d = new Date(value * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeHierarchy(raw: RawHierarchyResponse): LocationHierarchy {
  return {
    root: normalizeNode(raw.root),
    meta: {
      nodeCount: raw.meta?.nodeCount ?? 0,
      depth: raw.meta?.depth ?? 0,
      truncated: Boolean(raw.meta?.truncated),
      builtAt: parseBuiltAt(raw.meta?.builtAt),
    },
  };
}

export function isValidRootId(id: string): boolean {
  if (id === '.' || id === '..') return false;
  return /^[A-Za-z0-9.-]{1,64}$/.test(id);
}

export function nodeChain(root: LocationNode, targetId: string): LocationNode[] {
  const path: LocationNode[] = [];
  const walk = (node: LocationNode): boolean => {
    path.push(node);
    if (node.id === targetId) return true;
    for (const child of node.children) {
      if (walk(child)) return true;
    }
    path.pop();
    return false;
  };
  return walk(root) ? path : [];
}

export function findNode(root: LocationNode, id: string): LocationNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return undefined;
}

export interface LocationEditPatch {
  id: string;
  name: string;
  status: string;
  /** Bare parent id, or null when moved to the top level. */
  parentId: string | null;
}

function countNodes(node: LocationNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

/**
 * Mirrors a confirmed FHIR Location write into the cached tree — the gateway hierarchy cache can lag
 * FHIR by up to its TTL, so the UI applies the write locally (and re-applies after a refresh).
 */
export function applyLocationEdit(hierarchy: LocationHierarchy, patch: LocationEditPatch): LocationHierarchy {
  const clone = (n: LocationNode): LocationNode => ({ ...n, children: n.children.map(clone) });
  const root = clone(hierarchy.root);
  const node = findNode(root, patch.id);
  if (!node) return hierarchy;

  node.name = patch.name;
  node.status = patch.status;

  // The view root cannot be re-parented inside this tree; only its labels change here.
  if (patch.id === root.id) {
    node.partOf = patch.parentId;
    node.partOfLabel = null;
    return { ...hierarchy, root };
  }

  const nextParentId = patch.parentId ?? null;
  const prevParentId = node.partOf ?? null;
  if (nextParentId === prevParentId) {
    return { ...hierarchy, root };
  }

  const detach = (n: LocationNode): boolean => {
    const i = n.children.findIndex((c) => c.id === patch.id);
    if (i >= 0) {
      n.children = n.children.filter((c) => c.id !== patch.id);
      return true;
    }
    for (const child of n.children) {
      if (detach(child)) return true;
    }
    return false;
  };
  detach(root);

  // Top-level (or parent outside this tree) → drop from the current root view; roots dropdown owns it.
  if (!nextParentId) {
    const removed = countNodes(node);
    return {
      root,
      meta: { ...hierarchy.meta, nodeCount: Math.max(0, hierarchy.meta.nodeCount - removed) },
    };
  }

  const newParent = findNode(root, nextParentId);
  if (!newParent) {
    const removed = countNodes(node);
    return {
      root,
      meta: { ...hierarchy.meta, nodeCount: Math.max(0, hierarchy.meta.nodeCount - removed) },
    };
  }

  // Refuse to attach under a descendant of the moved node (cycle) — write path also guards this.
  if (findNode(node, nextParentId)) {
    // Re-attach under the previous parent so the tree stays consistent with the last good shape.
    const oldParent = prevParentId ? findNode(root, prevParentId) : undefined;
    if (oldParent) {
      node.partOf = oldParent.id;
      node.partOfLabel = oldParent.name;
      oldParent.children = [...oldParent.children, node];
    } else {
      // Was a direct child of the view root before detach.
      node.partOf = root.id;
      node.partOfLabel = root.name;
      root.children = [...root.children, node];
    }
    return { ...hierarchy, root };
  }

  node.partOf = newParent.id;
  node.partOfLabel = newParent.name;
  newParent.children = [...newParent.children, node];
  return { ...hierarchy, root };
}
