import type { Bundle, Location, PractitionerRole, Resource } from '@medplum/fhirtypes';
import { FhirError, useAuth, useCoreConfig, useSearch } from 'ohs-player-web-core';
import { useEffect, useMemo } from 'react';
import { HierarchyError, useLocationHierarchy } from '../locations/useLocationHierarchy';
import { isNotFound, useMyPractitionerDetails } from '../users/usePractitionerDetails';
import { descendantIds, districtsFrom, resolveScopeIds } from './scope';
import { UNSCOPED, type AdminScope } from './useAdminScope';
import { useCurrentDistrict } from './useCurrentDistrict';

const ROLE_SEARCH = { _count: '500' };
const LOCATION_SEARCH = { _count: '500', status: 'active' };

function resourcesOf<T extends Resource>(data: unknown, resourceType: T['resourceType']): T[] {
  return ((data as Bundle<T> | undefined)?.entry ?? [])
    .map((entry) => entry.resource)
    .filter((resource): resource is T => resource?.resourceType === resourceType);
}

function reportedByClient(error: unknown): boolean {
  if (error instanceof FhirError) return true;
  return error instanceof HierarchyError && error.source instanceof FhirError;
}

export function useResolvedScope(): AdminScope {
  const { status: authStatus, user } = useAuth();
  const { onError } = useCoreConfig();
  const signedIn = authStatus === 'authenticated';
  const self = useMyPractitionerDetails(signedIn);
  const districts = useMemo(() => districtsFrom(self.roleDetails), [self.roleDetails]);
  const [current, setCurrent] = useCurrentDistrict(user?.sub, districts);
  const tree = useLocationHierarchy(current?.id);
  const roleSearch = useSearch(current ? 'PractitionerRole' : undefined, ROLE_SEARCH);
  const locationSearch = useSearch(current ? 'Location' : undefined, LOCATION_SEARCH);

  const lookupError = signedIn && self.error && !isNotFound(self.error) ? self.error : null;
  const failure = lookupError ?? tree.error ?? null;
  useEffect(() => {
    if (failure && !reportedByClient(failure)) onError?.(failure);
  }, [failure, onError]);

  const lookupPending = signedIn && self.isLoading && self.roleDetails.length === 0;

  return useMemo((): AdminScope => {
    if (!current) {
      return {
        ...UNSCOPED,
        status: lookupPending ? 'loading' : 'unscoped',
        loadFailed: Boolean(lookupError),
      };
    }
    const expansion = tree.data ? descendantIds(tree.data) : null;
    const locationIds = expansion?.ids ?? new Set([current.id]);
    const roles = [
      ...self.roles,
      ...resourcesOf<PractitionerRole>(roleSearch.data, 'PractitionerRole'),
    ];
    const locations = resourcesOf<Location>(locationSearch.data, 'Location');
    const loading = tree.isLoading || roleSearch.isLoading || locationSearch.isLoading;
    return {
      ...resolveScopeIds(locationIds, roles, locations),
      status: loading ? 'loading' : 'scoped',
      districts,
      current,
      setCurrent,
      incomplete:
        Boolean(tree.error || roleSearch.error || locationSearch.error) ||
        Boolean(expansion?.truncated),
      loadFailed: false,
    };
  }, [
    current,
    districts,
    setCurrent,
    lookupPending,
    lookupError,
    self.roles,
    tree.data,
    tree.isLoading,
    tree.error,
    roleSearch.data,
    roleSearch.isLoading,
    roleSearch.error,
    locationSearch.data,
    locationSearch.isLoading,
    locationSearch.error,
  ]);
}
