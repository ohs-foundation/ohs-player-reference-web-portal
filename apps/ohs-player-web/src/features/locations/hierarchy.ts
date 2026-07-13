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

/** All non-root nodes with this id — a mid-edit gateway rebuild can yield zero or duplicate copies. */
function collectNodes(root: LocationNode, id: string): LocationNode[] {
  const hits: LocationNode[] = [];
  const walk = (n: LocationNode): void => {
    for (const child of n.children) {
      if (child.id === id) hits.push(child);
      walk(child);
    }
  };
  walk(root);
  return hits;
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
 * `fallback` restores the node when a mid-edit gateway rebuild dropped it from the tree entirely.
 */
export function applyLocationEdit(
  hierarchy: LocationHierarchy,
  patch: LocationEditPatch,
  fallback?: LocationNode,
): LocationHierarchy {
  const clone = (n: LocationNode): LocationNode => ({ ...n, children: n.children.map(clone) });
  const root = clone(hierarchy.root);

  // The view root cannot be re-parented inside this tree; only its labels change here.
  if (patch.id === root.id) {
    root.name = patch.name;
    root.status = patch.status;
    root.partOf = patch.parentId;
    root.partOfLabel = null;
    return { ...hierarchy, root };
  }

  const copies = collectNodes(root, patch.id);

  if (copies.length === 1 && (copies[0].partOf ?? null) === (patch.parentId ?? null)) {
    copies[0].name = patch.name;
    copies[0].status = patch.status;
    return { ...hierarchy, root };
  }

  // A gateway rebuild racing HAPI's 60 s search cache can return the node under both parents or
  // under neither — remove every copy (falling back to the caller's snapshot), then attach one.
  const prune = (n: LocationNode): void => {
    n.children = n.children.filter((c) => c.id !== patch.id);
    for (const child of n.children) prune(child);
  };
  prune(root);

  const node = copies[0] ?? (fallback ? clone(fallback) : undefined);
  if (!node) return hierarchy;
  node.name = patch.name;
  node.status = patch.status;

  const removed = copies.reduce((sum, c) => sum + countNodes(c), 0);
  const done = (attached: boolean): LocationHierarchy => ({
    root,
    meta: {
      ...hierarchy.meta,
      nodeCount: Math.max(0, hierarchy.meta.nodeCount - removed + (attached ? countNodes(node) : 0)),
    },
  });

  // Top-level (or parent outside this tree) → drop from the current root view; roots dropdown owns it.
  const newParent = patch.parentId ? findNode(root, patch.parentId) : undefined;
  if (!newParent) return done(false);

  node.partOf = newParent.id;
  node.partOfLabel = newParent.name;
  newParent.children = [...newParent.children, node];
  return done(true);
}

/** Whether the tree already places the edited node exactly as the patch says (used to decide healing). */
export function hierarchyReflectsEdit(hierarchy: LocationHierarchy, patch: LocationEditPatch): boolean {
  const copies = collectNodes(hierarchy.root, patch.id);
  if (!patch.parentId || !findNode(hierarchy.root, patch.parentId)) return copies.length === 0;
  return copies.length === 1 && copies[0].partOf === patch.parentId;
}
