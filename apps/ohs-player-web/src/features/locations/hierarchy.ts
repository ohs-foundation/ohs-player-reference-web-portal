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
