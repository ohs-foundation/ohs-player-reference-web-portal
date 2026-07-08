import { useQuery } from '@tanstack/react-query';
import { FhirError, useFhirClient } from 'ohs-player-web-core';
import {
  isValidRootId,
  normalizeHierarchy,
  type LocationHierarchy,
  type RawHierarchyResponse,
} from './hierarchy';

/** HTTP status extracted from a failed hierarchy fetch; drives the page's state selection. */
export type HierarchyErrorStatus = 400 | 401 | 403 | 404 | 500 | 502 | 0;

/** Error carrying the HTTP status + OperationOutcome so the page can pick the right state. */
export class HierarchyError extends Error {
  readonly status: HierarchyErrorStatus;
  readonly outcome?: unknown;
  constructor(status: HierarchyErrorStatus, message: string, outcome?: unknown) {
    super(message);
    this.name = 'HierarchyError';
    this.status = status;
    this.outcome = outcome;
  }
}

function toHierarchyError(err: unknown): HierarchyError {
  if (err instanceof HierarchyError) return err;
  if (err instanceof FhirError) {
    return new HierarchyError(err.status as HierarchyErrorStatus, err.message, err.outcome);
  }
  let message = 'Request failed';
  if (err instanceof Error) message = err.message;
  else if (typeof err === 'string') message = err;
  return new HierarchyError(0, message);
}

/**
 * Fetch `GET /api/location-hierarchy/{rootId}` (gateway) and return the normalized tree. Role required:
 * `location-hierarchy.view`. Retries are disabled so real error codes (401/403/404/500/502) reach the UI
 * for state selection rather than being retried away.
 *
 * OPEN DEPENDENCY (dev): the gateway container can't read Locations created directly against host HAPI, so
 * e2e fetches may 404 in dev even for roots that exist on host. Verify against data the gateway's own HAPI holds.
 */
export function useLocationHierarchy(rootId: string | undefined) {
  const client = useFhirClient();
  const enabled = Boolean(rootId && isValidRootId(rootId));

  return useQuery<LocationHierarchy, HierarchyError>({
    queryKey: ['location-hierarchy', rootId],
    enabled,
    retry: false,
    throwOnError: false,
    queryFn: async () => {
      try {
        const raw = (await client.customGet(
          'locationHierarchy',
          undefined,
          rootId,
        )) as RawHierarchyResponse;
        if (!raw?.root) throw new HierarchyError(500, 'Malformed hierarchy response');
        return normalizeHierarchy(raw);
      } catch (err) {
        // Normalize every failure to HierarchyError so `query.error.status` drives state selection.
        throw toHierarchyError(err);
      }
    },
  });
}

export { toHierarchyError };
