import { useMemo } from 'react';
import type {
  Bundle,
  CareTeam,
  Location,
  Organization,
  Practitioner,
  PractitionerRole,
} from '@medplum/fhirtypes';
import { FhirError, useCustomResource, useResource, useSearch } from 'ohs-player-web-core';

const PRACTITIONER_DETAILS_ALIAS = 'practitionerDetails';

export interface PractitionerRoleDetails {
  practitionerRole: PractitionerRole;
  organization: Organization | null;
  locations: Location[];
  careTeams: CareTeam[];
}

export interface PractitionerDetailsResponse {
  practitioner: Practitioner;
  practitionerRoles: PractitionerRoleDetails[];
}

export interface PractitionerContext {
  practitioner: Practitioner | undefined;
  roleDetails: PractitionerRoleDetails[];
  roles: PractitionerRole[];
  careTeams: CareTeam[];
  isLoading: boolean;
  error: unknown;
}

function isNotFound(error: unknown): boolean {
  return error instanceof FhirError && error.status === 404;
}

function careTeamsFromBundle(bundle: unknown): CareTeam[] {
  return ((bundle as Bundle<CareTeam> | undefined)?.entry ?? [])
    .map((entry) => entry.resource)
    .filter((resource): resource is CareTeam => Boolean(resource));
}

function dedupeById(careTeams: CareTeam[]): CareTeam[] {
  const byId = new Map<string, CareTeam>();
  for (const careTeam of careTeams) {
    if (careTeam.id) byId.set(careTeam.id, careTeam);
  }
  return [...byId.values()];
}

function usePractitionerContext(
  practitionerId: string | undefined,
  isSelfLookup: boolean,
): PractitionerContext {
  const enabled = isSelfLookup || Boolean(practitionerId);
  const query = useCustomResource(
    PRACTITIONER_DETAILS_ALIAS,
    isSelfLookup ? undefined : { 'practitioner-id': practitionerId },
    { enabled },
  );
  const response = query.data as PractitionerDetailsResponse | undefined;
  const roleDetails = useMemo(() => response?.practitionerRoles ?? [], [response]);

  // The endpoint reads the Practitioner through a PractitionerRole search, so a practitioner holding
  // no role 404s; read the resource directly in that case.
  const missing = isNotFound(query.error) && Boolean(practitionerId);
  const fallbackRead = useResource('Practitioner', missing ? practitionerId : undefined);
  const practitioner = response?.practitioner ?? (fallbackRead.data as Practitioner | undefined);

  const endpointCareTeams = useMemo(
    () => dedupeById(roleDetails.flatMap((detail) => detail.careTeams ?? [])),
    [roleDetails],
  );
  const roles = useMemo(() => roleDetails.map((detail) => detail.practitionerRole), [roleDetails]);

  // The endpoint attaches a CareTeam only when participant.member references PractitionerRole/{id},
  // while this portal writes Practitioner/{id} members; search when it reports none.
  const needsCareTeamSearch = Boolean(practitioner?.id) && endpointCareTeams.length === 0;
  const careTeamSearch = useSearch(needsCareTeamSearch ? 'CareTeam' : undefined, {
    participant: `Practitioner/${practitioner?.id ?? ''}`,
    _count: '100',
  });

  const careTeams = useMemo(
    () =>
      endpointCareTeams.length > 0 ? endpointCareTeams : careTeamsFromBundle(careTeamSearch.data),
    [endpointCareTeams, careTeamSearch.data],
  );

  return {
    practitioner,
    roleDetails,
    roles,
    careTeams,
    isLoading: query.isLoading || fallbackRead.isLoading || careTeamSearch.isLoading,
    error: missing ? fallbackRead.error : query.error,
  };
}

/** Full practitioner context (roles, organisation, locations, care teams) for one practitioner id. */
export function usePractitionerDetails(practitionerId: string | undefined): PractitionerContext {
  return usePractitionerContext(practitionerId, false);
}

/** Full practitioner context for the signed-in user; the gateway resolves them from the JWT. */
export function useMyPractitionerDetails(): PractitionerContext {
  return usePractitionerContext(undefined, true);
}
