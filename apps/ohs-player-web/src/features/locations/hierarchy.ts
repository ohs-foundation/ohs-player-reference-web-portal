import type { CodeableConcept } from '@medplum/fhirtypes';

/**
 * Types + normalizers for the OHS gateway `GET /api/location-hierarchy/{rootId}` response.
 *
 * VERIFIED against the LIVE gateway — the adapter smooths over contract quirks so components consume a clean
 * normalized `LocationNode`, never raw API JSON:
 *   1. `id` is FHIR-prefixed (`"Location/1001"`); the request path wants the bare id (`1001`) — a slash in the
 *      path 400s. `bareId` strips the prefix. (Pending backend fix.)
 *   2. `partOf` is an object `{ reference, display }` (or null on the root), NOT a bare id string.
 *   3. `type` (administrative-level) and `physicalType` are INLINE on every node — badges need no extra fetch.
 *   4. `meta.builtAt` is Unix-epoch seconds (fractional), NOT ISO-8601. (Pending backend fix.)
 *
 * OPEN DEPENDENCY (backend): no pagination/continuation param. When `hasMoreChildren` / `meta.truncated` is
 * true, the only "load more" path is re-rooting: fetch `/api/location-hierarchy/{childId}` (bare id). In-place
 * paging is pending backend work.
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
  /** Unix epoch seconds (may be fractional) OR an ISO-8601 string, depending on gateway build. */
  builtAt: number | string;
}

export interface RawHierarchyResponse {
  root: RawLocationNode;
  meta: RawHierarchyMeta;
}

/** Normalized node: bare ids, a resolved parent label, and inline CodeableConcepts for badges. */
export interface LocationNode {
  id: string;
  name: string | null;
  status: string | null;
  description: string | null;
  /** Bare parent id (prefix stripped), or null on the root. */
  partOf: string | null;
  /** Parent display label from `partOf.display`, for the "Part of" link. */
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

/** Strip a leading `Location/` (or any `{Type}/`) so a bare FHIR id remains. */
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
    description: n.description ?? null,
    partOf: bareId(n.partOf?.reference),
    partOfLabel: n.partOf?.display ?? null,
    physicalType: n.physicalType ?? null,
    type: Array.isArray(n.type) ? n.type : [],
    children: Array.isArray(n.children) ? n.children.map(normalizeNode) : [],
    hasMoreChildren: Boolean(n.hasMoreChildren),
  };
}

/** Parse `builtAt` (epoch seconds OR ISO string) to a Date; null if unparseable. */
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

/** A rootId is a valid FHIR id: 1–64 chars of [A-Za-z0-9-.], and not `.`/`..`. */
export function isValidRootId(id: string): boolean {
  if (id === '.' || id === '..') return false;
  return /^[A-Za-z0-9.-]{1,64}$/.test(id);
}

/** Root-first chain of nodes from the tree root down to `targetId` (for breadcrumbs). */
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

/** Find a node by id anywhere in the tree. */
export function findNode(root: LocationNode, id: string): LocationNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return undefined;
}
