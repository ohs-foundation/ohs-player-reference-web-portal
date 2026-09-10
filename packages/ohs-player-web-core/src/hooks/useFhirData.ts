import { useCallback } from 'react';
import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useFhirClient } from '../providers/FhirClientProvider';

export function useResource(resourceType: string | undefined, id: string | undefined) {
  const client = useFhirClient();
  return useQuery({
    queryKey: ['fhir', 'read', resourceType, id],
    enabled: Boolean(resourceType && id),
    queryFn: async () => {
      if (!resourceType || !id) return undefined;
      return client.read(resourceType, id);
    },
  });
}

export function useSearch(resourceType: string | undefined, params?: Record<string, string>) {
  const client = useFhirClient();
  return useQuery({
    queryKey: ['fhir', 'search', resourceType, params],
    enabled: Boolean(resourceType),
    queryFn: async () => {
      if (!resourceType) return undefined;
      return client.search(resourceType, params);
    },
  });
}

/** Params for {@link usePagedSearch}. */
export interface PagedSearchParams {
  /** 0-indexed page to fetch. Default `0`. */
  page?: number;
  /** Resources per page (`_count`). Default `10`. */
  pageSize?: number;
  /** Extra FHIR search params (e.g. `{ name: 'jane' }`). Reserved paging keys are set by the hook. */
  params?: Record<string, string>;
}

/** Result of {@link usePagedSearch}. */
export interface PagedSearchResult<T = unknown> {
  /** Resources on the current page. */
  rows: T[];
  /** Accurate grand total when the server reports one (`Bundle.total`), else `undefined`. */
  total: number | undefined;
  /** Current 0-indexed page. */
  page: number;
  /** Page size in effect (`_count`). */
  pageSize: number;
  /** Whether a later page exists. */
  hasNext: boolean;
  /** Whether an earlier page exists. */
  hasPrev: boolean;
  /**
   * `'numbered'` when the server returns an accurate `total` (a page count is meaningful, so the UI
   * may render numbered pages); `'links'` when it doesn't (degrade to prev/next only).
   */
  paginationMode: 'numbered' | 'links';
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
}

interface PagedBundleShape {
  entry?: { resource?: unknown }[];
  total?: number;
  link?: { relation?: string }[];
}

/**
 * Offset-paged FHIR search for browsing a resource collection page-by-page. Requests
 * `_count`/`_offset`/`_total=accurate` and derives a `paginationMode`: servers that return an
 * accurate `Bundle.total` (HAPI 8.8 does) get `'numbered'`; servers that omit it degrade to
 * `'links'` (prev/next). Shares the `['fhir','search',type,params]` cache namespace, so
 * {@link useDeleteResource}, {@link useUpdateResource}, and {@link useRefreshResources} invalidate it
 * automatically. Previous-page rows stay visible while the next page loads (no empty flash).
 *
 * @example
 * const { rows, total, hasNext, paginationMode } = usePagedSearch('Patient', { page, pageSize: 10 });
 */
export function usePagedSearch<T = unknown>(
  resourceType: string | undefined,
  { page = 0, pageSize = 10, params }: PagedSearchParams = {},
): PagedSearchResult<T> {
  const client = useFhirClient();
  const searchParams: Record<string, string> = {
    ...params,
    _count: String(pageSize),
    _offset: String(page * pageSize),
    _total: 'accurate',
  };
  const query = useQuery({
    queryKey: ['fhir', 'search', resourceType, searchParams],
    enabled: Boolean(resourceType),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!resourceType) return undefined;
      return client.search(resourceType, searchParams);
    },
  });

  const bundle = query.data as PagedBundleShape | undefined;
  const rows = (bundle?.entry ?? [])
    .map((e) => e.resource)
    .filter((r): r is T => r !== undefined && r !== null);
  const total = typeof bundle?.total === 'number' ? bundle.total : undefined;
  const paginationMode: 'numbered' | 'links' = typeof total === 'number' ? 'numbered' : 'links';
  const hasNextLink = Boolean(bundle?.link?.some((l) => l.relation === 'next'));
  const hasNext =
    paginationMode === 'numbered'
      ? (page + 1) * pageSize < (total ?? 0)
      : hasNextLink || rows.length === pageSize;

  return {
    rows,
    total,
    page,
    pageSize,
    hasNext,
    hasPrev: page > 0,
    paginationMode,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}

export function useFhirCapabilities() {
  const client = useFhirClient();
  return useQuery({
    queryKey: ['fhir', 'metadata', client.baseUrl],
    queryFn: async () => client.capabilities(),
  });
}

export function useCreateResource(resourceType: string) {
  const client = useFhirClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown) => client.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fhir', 'search', resourceType] });
    },
  });
}

export function useUpdateResource(resourceType: string) {
  const client = useFhirClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: unknown }) =>
      client.update(resourceType, id, body),
    onSuccess: (_, v) => {
      void qc.invalidateQueries({ queryKey: ['fhir', 'read', resourceType, v.id] });
      void qc.invalidateQueries({ queryKey: ['fhir', 'search', resourceType] });
    },
  });
}

/**
 * FHIR hard-delete mutation (`DELETE {resourceType}/{id}`). Invalidates the read and search caches
 * for the type on success (mirroring {@link useUpdateResource}), so open lists drop the row. The
 * mutation rejects with a {@link FhirError} on failure — surface `409`/`OperationOutcome`
 * referential-integrity errors to the user; do not swallow them.
 *
 * @example
 * const del = useDeleteResource('Organization');
 * await del.mutateAsync(id);
 */
export function useDeleteResource(resourceType: string) {
  const client = useFhirClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => client.delete(resourceType, id),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: ['fhir', 'read', resourceType, id] });
      void qc.invalidateQueries({ queryKey: ['fhir', 'search', resourceType] });
    },
  });
}

/**
 * Returns a function that invalidates and refetches the cached FHIR search list(s) for the given
 * resource type(s), so view tables re-render after a mutation. Use it after writes the standard
 * mutation hooks don't cover — custom-endpoint creates/updates, transaction Bundles, or any flow
 * where a list elsewhere must reflect the change. Targets queries by cache key (not a component-local
 * `refetch` handle) and resolves once the active refetches complete. Relies on React Query v5's default
 * `refetchType: 'active'` — mounted (subscribed) queries refetch immediately; inactive ones are only
 * marked stale and refetch on their next mount/focus.
 *
 * @example
 * const refresh = useRefreshResources();
 * await refresh('CareTeam');                           // one type
 * await refresh(['Practitioner', 'PractitionerRole']); // several
 */
export function useRefreshResources(): (resourceTypes: string | readonly string[]) => Promise<void> {
  const qc = useQueryClient();
  return useCallback(
    async (resourceTypes: string | readonly string[]) => {
      const types = typeof resourceTypes === 'string' ? [resourceTypes] : resourceTypes;
      await Promise.all(
        types.map((rt) => qc.invalidateQueries({ queryKey: ['fhir', 'search', rt] })),
      );
    },
    [qc],
  );
}

interface SearchBundleShape {
  resourceType?: string;
  entry?: { resource?: { id?: string } }[];
  total?: number;
}

/** Options for {@link useOptimisticInsert}. */
export interface OptimisticInsertOptions {
  /**
   * Additional resource-type search lists to refetch during reconcile (e.g. `['PractitionerRole']` so a
   * user's derived role/org columns fill in). The inserted type is always reconciled.
   */
  also?: readonly string[];
  /** Delay between background reconcile refetch attempts (ms). Default 1500. */
  reconcileDelayMs?: number;
  /** Max reconcile refetch attempts before giving up and leaving the optimistic row in place. Default 8. */
  reconcileMaxAttempts?: number;
}

const searchKeyMatcher =
  (type: string) =>
  (key: readonly unknown[]): boolean =>
    key[0] === 'fhir' && key[1] === 'search' && key[2] === type;

interface ReconcileSpec {
  qc: QueryClient;
  types: readonly string[];
  resourceType: string;
  id: string;
  reApply: () => void;
  delay: number;
  maxAttempts: number;
  isCancelled: () => boolean;
}

/**
 * Poll the server until the just-created resource appears in its search results, re-applying the optimistic
 * row after any refetch that still lacks it (staging search-index lag) so the row never visibly disappears.
 * Stops once the server returns the row, attempts are exhausted, or `isCancelled()` flips true.
 */
function scheduleReconcile(spec: ReconcileSpec): () => void {
  const { qc, types, resourceType, id, reApply, delay, maxAttempts, isCancelled } = spec;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const present = (): boolean =>
    qc
      .getQueriesData<SearchBundleShape>({ predicate: (q) => searchKeyMatcher(resourceType)(q.queryKey) })
      .some(([, bundle]) => bundle?.entry?.some((e) => e.resource?.id === id));

  const refetchAll = (): Promise<unknown> =>
    Promise.all(
      types.map((type) => qc.refetchQueries({ predicate: (q) => searchKeyMatcher(type)(q.queryKey) })),
    );

  const onRefetched = (n: number): void => {
    if (isCancelled() || present()) return; // cancelled, or server now has it → server data stands
    reApply();
    if (n + 1 < maxAttempts) run(n + 1);
  };

  function run(n: number): void {
    timer = setTimeout(() => {
      if (isCancelled()) return;
      void refetchAll().then(() => onRefetched(n));
    }, delay);
  }

  run(0);
  return () => {
    if (timer) clearTimeout(timer);
  };
}

/**
 * Optimistic-insert for create flows: shows the new row immediately, then reconciles with the server
 * **without the refetch ever wiping the optimistic row**.
 *
 * The naive "insert then immediately invalidate" pattern races: the invalidate refetches at once, and if
 * the server hasn't indexed the brand-new resource yet (latency / search-index lag), the response overwrites
 * the cache and the optimistic row vanishes until a later reload. This hook avoids that:
 *
 * 1. Inserts the resource into every mounted `['fhir', 'search', resourceType, …]` cache (all param variants,
 *    via predicate match), prepended as a Bundle entry, `total` bumped, de-duped by id. Row renders instantly.
 * 2. Does **not** invalidate immediately. It then **polls**: every `reconcileDelayMs` it refetches the list(s)
 *    in the background to pick up server-derived fields; while the server still lacks the row (staging
 *    search-index lag), it **re-applies the optimistic row** and tries again, up to `reconcileMaxAttempts`.
 *    Once the server returns the row, polling stops and the server's data stands. The row never disappears.
 *
 * Returns a `rollback` that removes the inserted row and cancels the pending reconcile — call it from the
 * mutation's error path so a failed follow-up doesn't leave a phantom row. Do **not** also call
 * `useRefreshResources` for this create; reconcile is built in.
 *
 * @example
 * const insert = useOptimisticInsert();
 * const created = await create.mutateAsync(body);
 * const rollback = insert('Practitioner', created, { also: ['PractitionerRole'] });
 * // on a later failure: rollback();
 */
export function useOptimisticInsert(): (
  resourceType: string,
  resource: { id?: string } & Record<string, unknown>,
  options?: OptimisticInsertOptions,
) => () => void {
  const qc = useQueryClient();
  return useCallback(
    (resourceType, resource, options) => {
      const id = typeof resource.id === 'string' ? resource.id : undefined;
      if (!id) return () => undefined;
      const matchType = (type: string) => searchKeyMatcher(type);

      const apply = (): void => {
        qc.setQueriesData<SearchBundleShape>(
          { predicate: (q) => matchType(resourceType)(q.queryKey) },
          (bundle) => {
            if (!bundle || typeof bundle !== 'object') return bundle;
            const entries = bundle.entry ?? [];
            if (entries.some((e) => e.resource?.id === id)) return bundle; // already present
            return {
              ...bundle,
              entry: [{ resource }, ...entries],
              ...(typeof bundle.total === 'number' ? { total: bundle.total + 1 } : {}),
            };
          },
        );
      };

      const remove = (): void => {
        qc.setQueriesData<SearchBundleShape>(
          { predicate: (q) => matchType(resourceType)(q.queryKey) },
          (bundle) => {
            if (!bundle?.entry) return bundle;
            const next = bundle.entry.filter((e) => e.resource?.id !== id);
            if (next.length === bundle.entry.length) return bundle;
            return {
              ...bundle,
              entry: next,
              ...(typeof bundle.total === 'number' ? { total: Math.max(0, bundle.total - 1) } : {}),
            };
          },
        );
      };

      apply();

      let cancelled = false;
      const cancelReconcile = scheduleReconcile({
        qc,
        types: [resourceType, ...(options?.also ?? [])],
        resourceType,
        id,
        reApply: apply,
        delay: options?.reconcileDelayMs ?? 1500,
        maxAttempts: options?.reconcileMaxAttempts ?? 8,
        isCancelled: () => cancelled,
      });

      return () => {
        cancelled = true;
        cancelReconcile();
        remove();
      };
    },
    [qc],
  );
}

/**
 * Declarative GET of a host-defined custom endpoint (`customEndpoints[alias]`), cached by TanStack
 * Query under `['custom', alias, params]`. Use this for read-only gateway routes a component needs
 * during render; `useCustomEndpoint(alias).get` stays the imperative (mutation) form for
 * event-driven reads. Params with an `undefined` value are dropped from the query string by
 * `FhirClient.customGet`, so an optional filter can be passed straight through.
 *
 * The resolved value is `unknown` — narrow it at the call site.
 *
 * @example
 * const q = useCustomResource('practitionerDetails', { 'practitioner-id': id }, { enabled: Boolean(id) });
 * const details = q.data as PractitionerDetails | undefined;
 *
 * @public
 */
export function useCustomResource(
  alias: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: { enabled?: boolean },
): UseQueryResult<unknown> {
  const client = useFhirClient();
  return useQuery({
    queryKey: ['custom', alias, params],
    enabled: options?.enabled ?? true,
    queryFn: async () => client.customGet(alias, params),
  });
}

export function useCustomEndpoint(alias: string) {
  const client = useFhirClient();
  const get = useMutation({
    mutationFn: async (params?: Record<string, string | number | boolean | undefined>) =>
      client.customGet(alias, params),
  });
  const post = useMutation({
    mutationFn: async (body: unknown) => client.customPost(alias, body),
  });
  const put = useMutation({
    mutationFn: async (vars: { id?: string; body: unknown }) =>
      client.customPut(alias, vars.body, vars.id),
  });
  return { get, post, put };
}
