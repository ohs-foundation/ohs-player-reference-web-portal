import { useCallback } from 'react';
import {
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
 * await refresh('CareTeam');          // one type
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
