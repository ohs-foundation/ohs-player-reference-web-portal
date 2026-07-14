import { useQuery } from '@tanstack/react-query';
import { useFhirClient, useTranslation } from 'ohs-player-web-core';
import {
  fetchAllLocationsLean,
  fetchLocationRoots,
  type LocationRootOption,
} from './locationRoots';

/**
 * Query key sits under `['fhir', 'search', 'Location', …]` so `useRefreshResources('Location')`
 * (import complete, edit save) invalidates the roots list along with other Location searches.
 */
export const LOCATION_ROOTS_QUERY_KEY = ['fhir', 'search', 'Location', 'roots'] as const;
export const LOCATION_ALL_LEAN_QUERY_KEY = ['fhir', 'search', 'Location', 'all-lean'] as const;

/** All hierarchy roots for the root-location dropdown — paginated, not a single `_count` page. */
export function useLocationRoots() {
  const client = useFhirClient();
  const { t } = useTranslation();
  return useQuery<LocationRootOption[]>({
    queryKey: LOCATION_ROOTS_QUERY_KEY,
    queryFn: () => fetchLocationRoots(client, (id) => t('locationsUnnamed', { id })),
  });
}

/** Full lean Location list (id/name/partOf) for parent pickers when the store exceeds one page. */
export function useAllLocationsLean(enabled = true) {
  const client = useFhirClient();
  return useQuery({
    queryKey: LOCATION_ALL_LEAN_QUERY_KEY,
    enabled,
    queryFn: () => fetchAllLocationsLean(client),
  });
}
