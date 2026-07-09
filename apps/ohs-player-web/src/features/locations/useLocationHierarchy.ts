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

/** Error carrying the HTTP status + the gateway's error message so the page can pick the right state. */
export class HierarchyError extends Error {
  readonly status: HierarchyErrorStatus;
  constructor(status: HierarchyErrorStatus, message: string) {
    super(message);
    this.name = 'HierarchyError';
    this.status = status;
  }
}

/** Gateway `/api/*` errors are plain JSON `{ error, status, timestamp }` — NOT a FHIR OperationOutcome. */
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

/**
 * Fetch `GET /api/location-hierarchy/{rootId}` (gateway) and return the normalized tree. Role required:
 * `location-hierarchy.view`. `rootId` is the BARE FHIR id (the adapter strips the `Location/` prefix upstream).
 *
 * 401 IS RETRYABLE: the gateway intermittently returns 401 "Invalid or expired token" for FHIR-backed
 * `/api/{resource}/{id}` paths even with a valid token that works on `/api/users` in the same session — a
 * gateway-side bug, not the frontend. So we retry ONCE on 401 (each attempt re-mints the token via the client's
 * token accessor) before surfacing the no-access state, which itself offers Retry. Every other code
 * (400/403/404/500/502) is surfaced immediately for correct state selection.
 */
export function useLocationHierarchy(rootId: string | undefined) {
  const client = useFhirClient();
  const enabled = Boolean(rootId && isValidRootId(rootId));

  return useQuery<LocationHierarchy, HierarchyError>({
    queryKey: ['location-hierarchy', rootId],
    enabled,
    throwOnError: false,
    // Retry once only on the intermittent 401; do not retry real 403/404/5xx.
    retry: (failureCount, error) => error.status === 401 && failureCount < 1,
    retryDelay: 300,
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
