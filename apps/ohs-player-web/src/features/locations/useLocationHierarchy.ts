import { useQuery } from '@tanstack/react-query';
import { FhirError, useFhirClient } from 'ohs-player-web-core';
import {
  isValidRootId,
  normalizeHierarchy,
  type LocationHierarchy,
  type RawHierarchyResponse,
} from './hierarchy';

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
        throw toHierarchyError(err);
      }
    },
  });
}

export { toHierarchyError };
