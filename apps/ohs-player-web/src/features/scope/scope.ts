import type { CareTeam, Location, PractitionerRole } from '@medplum/fhirtypes';
import { bareId, type LocationHierarchy, type LocationNode } from '../locations/hierarchy';
import type { PractitionerRoleDetails } from '../users/usePractitionerDetails';

export interface District {
  id: string;
  name: string;
}

export interface ScopeIds {
  locationIds: ReadonlySet<string>;
  practitionerIds: ReadonlySet<string>;
  roleIds: ReadonlySet<string>;
  organizationIds: ReadonlySet<string>;
}

export interface DescendantIds {
  ids: Set<string>;
  truncated: boolean;
}

function unversioned(reference: string): string {
  return reference.replace(/\/_history\/.*$/, '');
}

export function idOf(reference: string | undefined, resourceType: string): string | undefined {
  if (!reference) return undefined;
  const parts = unversioned(reference).split('/');
  if (parts.length === 1) return parts[0] || undefined;
  const [type, id] = parts.slice(-2);
  return type === resourceType && id ? id : undefined;
}

function has(ids: ReadonlySet<string>, id: string | undefined): boolean {
  return id !== undefined && ids.has(id);
}

function nameOr(name: string | undefined, id: string): string {
  return name?.trim() ? name.trim() : id;
}

export function districtsFrom(roleDetails: readonly PractitionerRoleDetails[]): District[] {
  const names = new Map<string, string>();
  for (const { practitionerRole, locations } of roleDetails) {
    for (const location of locations ?? []) {
      if (location.id) names.set(location.id, nameOr(location.name, location.id));
    }
    for (const ref of practitionerRole?.location ?? []) {
      const id = idOf(ref.reference, 'Location');
      if (id && !names.has(id)) names.set(id, nameOr(ref.display, id));
    }
  }
  return [...names]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function collect(node: LocationNode, ids: Set<string>): boolean {
  ids.add(node.id);
  let more = node.hasMoreChildren;
  for (const child of node.children) more = collect(child, ids) || more;
  return more;
}

export function descendantIds(hierarchy: LocationHierarchy): DescendantIds {
  const ids = new Set<string>();
  const more = collect(hierarchy.root, ids);
  return { ids, truncated: hierarchy.meta.truncated || more };
}

function hasLocationIn(role: PractitionerRole, locationIds: ReadonlySet<string>): boolean {
  return (role.location ?? []).some((ref) => has(locationIds, idOf(ref.reference, 'Location')));
}

function addId(ids: Set<string>, id: string | undefined): void {
  if (id) ids.add(id);
}

export function resolveScopeIds(
  locationIds: ReadonlySet<string>,
  roles: readonly PractitionerRole[],
  locations: readonly Location[],
): ScopeIds {
  const practitionerIds = new Set<string>();
  const roleIds = new Set<string>();
  const organizationIds = new Set<string>();
  for (const role of roles) {
    if (!hasLocationIn(role, locationIds)) continue;
    addId(roleIds, role.id);
    addId(practitionerIds, idOf(role.practitioner?.reference, 'Practitioner'));
    addId(organizationIds, idOf(role.organization?.reference, 'Organization'));
  }
  for (const location of locations) {
    if (has(locationIds, location.id)) {
      addId(organizationIds, idOf(location.managingOrganization?.reference, 'Organization'));
    }
  }
  return { locationIds, practitionerIds, roleIds, organizationIds };
}

export function organizationInScope(
  org: { id?: string; managedLocations?: readonly { id: string }[] },
  scope: ScopeIds,
): boolean {
  if (!org.id) return false;
  if (scope.organizationIds.has(org.id)) return true;
  return (org.managedLocations ?? []).some((location) => scope.locationIds.has(location.id));
}

function memberInScope(reference: string | undefined, scope: ScopeIds): boolean {
  if (!reference) return false;
  if (!reference.includes('/')) return scope.practitionerIds.has(reference);
  return (
    has(scope.practitionerIds, idOf(reference, 'Practitioner')) ||
    has(scope.roleIds, idOf(reference, 'PractitionerRole')) ||
    has(scope.organizationIds, idOf(reference, 'Organization'))
  );
}

export function careTeamInScope(
  team: Pick<CareTeam, 'managingOrganization' | 'participant'>,
  scope: ScopeIds,
): boolean {
  const managed = (team.managingOrganization ?? []).some((ref) =>
    has(scope.organizationIds, idOf(ref.reference, 'Organization')),
  );
  return managed || (team.participant ?? []).some((p) => memberInScope(p.member?.reference, scope));
}

export function scopedOptions<T extends { value: string }>(
  options: readonly T[],
  inScopeIds: ReadonlySet<string> | null,
  selected: readonly string[] = [],
): T[] {
  if (!inScopeIds) return [...options];
  const idFrom = (value: string): string => bareId(unversioned(value)) ?? value;
  const kept = new Set(selected.map(idFrom));
  return options.filter((option) => {
    const id = idFrom(option.value);
    return kept.has(id) || inScopeIds.has(id);
  });
}
