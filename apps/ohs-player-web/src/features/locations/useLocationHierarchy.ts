import { useCallback } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { FhirError, useFhirClient, type FhirClient } from 'ohs-player-web-core';
import {
  applyLocationEdit,
  findNode,
  hierarchyReflectsEdit,
  isValidRootId,
  normalizeHierarchy,
  type LocationEditPatch,
  type LocationHierarchy,
  type RawHierarchyResponse,
} from './hierarchy';

/** Past HAPI's 60 s search-result cache, after which a gateway rebuild is guaranteed post-edit. */
const GATEWAY_HEAL_DELAY_MS = 65_000;

export type HierarchyErrorStatus = 400 | 401 | 403 | 404 | 500 | 502 | 0;

export class HierarchyError extends Error {
  readonly status: HierarchyErrorStatus;
  constructor(status: HierarchyErrorStatus, message: string) {
    super(message);
    this.name = 'HierarchyError';
    this.status = status;
  }
}

/** Gateway `/api/*` errors are plain `{ error }` JSON, not a FHIR OperationOutcome. */
function messageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') {
    return (body as { error: string }).error;
  }
  return fallback;
}

function toHierarchyError(err: unknown): HierarchyError {
  if (err instanceof HierarchyError) return err;
  if (err instanceof FhirError) {
    return new HierarchyError(err.status as HierarchyErrorStatus, messageFromBody(err.outcome, err.message));
  }
  let message = 'Request failed';
  if (err instanceof Error) message = err.message;
  else if (typeof err === 'string') message = err;
  return new HierarchyError(0, message);
}

/** `refresh=true` evicts the gateway's cached tree so the rebuild reflects recent FHIR writes. */
async function fetchHierarchy(
  client: FhirClient,
  rootId: string,
  refresh: boolean,
): Promise<LocationHierarchy> {
  try {
    const raw = (await client.customGet(
      'locationHierarchy',
      refresh ? { refresh: 'true' } : undefined,
      rootId,
    )) as RawHierarchyResponse;
    if (!raw?.root) throw new HierarchyError(500, 'Malformed hierarchy response');
    return normalizeHierarchy(raw);
  } catch (err) {
    throw toHierarchyError(err);
  }
}

/**
 * The gateway intermittently 401s valid tokens on this path (gateway bug), so retry once with a re-minted
 * token before surfacing no-access; every other status surfaces immediately.
 */
export function useLocationHierarchy(rootId: string | undefined) {
  const client = useFhirClient();
  const enabled = Boolean(rootId && isValidRootId(rootId));

  return useQuery<LocationHierarchy, HierarchyError>({
    queryKey: ['location-hierarchy', rootId],
    enabled,
    throwOnError: false,
    // Background refetches would resurrect the gateway's stale cache over locally patched edits;
    // authoritative refresh goes through useRefreshHierarchy (which passes refresh=true).
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    // Retry once only on the intermittent 401; do not retry real 403/404/5xx.
    retry: (failureCount, error) => error.status === 401 && failureCount < 1,
    retryDelay: 300,
    queryFn: () => fetchHierarchy(client, rootId as string, false),
  });
}

async function refreshInto(
  qc: QueryClient,
  client: FhirClient,
  rootId: string,
): Promise<LocationHierarchy> {
  const fresh = await fetchHierarchy(client, rootId, true);
  qc.setQueryData<LocationHierarchy>(['location-hierarchy', rootId], fresh);
  return fresh;
}

/** Authoritative refresh: re-reads the tree with cache eviction so it survives a reload. */
export function useRefreshHierarchy(rootId: string | undefined): () => Promise<void> {
  const client = useFhirClient();
  const qc = useQueryClient();
  return useCallback(async () => {
    if (!rootId) return;
    await refreshInto(qc, client, rootId);
  }, [qc, client, rootId]);
}

/**
 * Mirrors a confirmed FHIR write into the cached tree for an instant update (see applyLocationEdit),
 * then re-reads with cache eviction, re-applying the patch so a stale gateway tree cannot clobber it.
 * A rebuild inside HAPI's search-cache window can even lose the moved node entirely (and the gateway
 * caches that tree), so the placed node is snapshotted for grafting and a delayed refresh heals the
 * gateway cache once the window has passed.
 */
export function useApplyHierarchyEdit(rootId: string | undefined): (patch: LocationEditPatch) => void {
  const client = useFhirClient();
  const qc = useQueryClient();
  return useCallback(
    (patch: LocationEditPatch) => {
      if (!rootId) return;
      const key = ['location-hierarchy', rootId] as const;
      qc.setQueryData<LocationHierarchy>(key, (old) => (old ? applyLocationEdit(old, patch) : old));
      const patched = qc.getQueryData<LocationHierarchy>(key);
      const snapshot = patched ? findNode(patched.root, patch.id) : undefined;
      const refreshAndReapply = async (): Promise<LocationHierarchy> => {
        const fresh = await fetchHierarchy(client, rootId, true);
        qc.setQueryData<LocationHierarchy>(key, applyLocationEdit(fresh, patch, snapshot));
        return fresh;
      };
      void (async () => {
        try {
          const fresh = await refreshAndReapply();
          if (!hierarchyReflectsEdit(fresh, patch)) {
            setTimeout(() => void refreshAndReapply().catch(() => {}), GATEWAY_HEAL_DELAY_MS);
          }
        } catch {
          // Optimistic patch already shows the change; a failed refresh reverts only on full reload.
        }
      })();
    },
    [qc, client, rootId],
  );
}

export { toHierarchyError };
