/**
 * Types + normalizers for the OHS gateway `GET /api/location-hierarchy/{rootId}` response.
 *
 * VERIFIED against the running gateway (branch feature/47-add-location-hierarchy-api) — two deltas from the
 * documented DTO are handled here:
 *   1. `id`/`partOf` come back as FHIR-typed references (e.g. "Location/1000"), NOT bare ids. Normalized to
 *      bare ids so they match the FHIR `{id}` used by useResource/routes.
 *   2. `meta.builtAt` is a Unix-epoch number (seconds, may be fractional), NOT an ISO-8601 string.
 *
 * OPEN DEPENDENCY (backend #47): there is currently no pagination/continuation param. When
 * `hasMoreChildren` or `meta.truncated` is true, the API gives no documented way to fetch the remainder in
 * place — the UI re-roots to `/api/location-hierarchy/{node.id}` instead. Revisit when the backend adds paging.
 */

export interface RawLocationNode {
  id: string;
  name: string | null;
  partOf: string | null;
  hasMoreChildren: boolean;
  children: RawLocationNode[];
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

/** Normalized node: `id`/`partOf` are bare FHIR ids. */
export interface LocationNode {
  id: string;
  name: string | null;
  partOf: string | null;
  hasMoreChildren: boolean;
  children: LocationNode[];
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
    partOf: bareId(n.partOf),
    hasMoreChildren: Boolean(n.hasMoreChildren),
    children: Array.isArray(n.children) ? n.children.map(normalizeNode) : [],
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
