import type { CareTeam, Location, PractitionerRole } from '@medplum/fhirtypes';
import { describe, expect, it } from 'vitest';
import type { LocationHierarchy, LocationNode } from '../locations/hierarchy';
import type { PractitionerRoleDetails } from '../users/usePractitionerDetails';
import {
  careTeamInScope,
  descendantIds,
  districtsFrom,
  idOf,
  organizationInScope,
  resolveScopeIds,
  scopedOptions,
  type ScopeIds,
} from './scope';

function role(id: string, fields: Partial<PractitionerRole> = {}): PractitionerRole {
  return { resourceType: 'PractitionerRole', id, ...fields };
}

function details(
  practitionerRole: PractitionerRole,
  locations: Location[] = [],
): PractitionerRoleDetails {
  return { practitionerRole, organization: null, locations, careTeams: [] };
}

function node(id: string, children: LocationNode[] = [], hasMoreChildren = false): LocationNode {
  return {
    id,
    name: id,
    status: 'active',
    partOf: null,
    partOfLabel: null,
    physicalType: null,
    type: [],
    children,
    hasMoreChildren,
  };
}

function tree(root: LocationNode, truncated = false): LocationHierarchy {
  return { root, meta: { nodeCount: 0, depth: 0, truncated, builtAt: null } };
}

function scope(fields: Partial<Record<keyof ScopeIds, string[]>> = {}): ScopeIds {
  return {
    locationIds: new Set(fields.locationIds ?? []),
    practitionerIds: new Set(fields.practitionerIds ?? []),
    roleIds: new Set(fields.roleIds ?? []),
    organizationIds: new Set(fields.organizationIds ?? []),
  };
}

describe('idOf', () => {
  it('reads typed, bare, absolute and versioned references', () => {
    expect(idOf('Location/l1', 'Location')).toBe('l1');
    expect(idOf('l1', 'Location')).toBe('l1');
    expect(idOf('http://fhir.test/fhir/Location/l1', 'Location')).toBe('l1');
    expect(idOf('Location/l1/_history/3', 'Location')).toBe('l1');
  });

  it('rejects a reference to another type and an empty one', () => {
    expect(idOf('Organization/o1', 'Location')).toBeUndefined();
    expect(idOf('', 'Location')).toBeUndefined();
    expect(idOf(undefined, 'Location')).toBeUndefined();
  });
});

describe('districtsFrom', () => {
  it('takes inlined locations and falls back to the role reference when none was inlined', () => {
    const districts = districtsFrom([
      details(role('r1', { location: [{ reference: 'Location/d1' }] }), [
        { resourceType: 'Location', id: 'd1', name: 'Kisumu East' },
      ]),
      details(role('r2', { location: [{ reference: 'd2', display: 'Kisumu West' }] })),
    ]);

    expect(districts).toEqual([
      { id: 'd1', name: 'Kisumu East' },
      { id: 'd2', name: 'Kisumu West' },
    ]);
  });

  it('gives one district for two roles at the same location', () => {
    const districts = districtsFrom([
      details(role('r1', { location: [{ reference: 'Location/d1' }] })),
      details(role('r2', { location: [{ reference: 'd1' }] })),
    ]);

    expect(districts).toEqual([{ id: 'd1', name: 'd1' }]);
  });

  it('is empty when no role carries a location', () => {
    expect(districtsFrom([details(role('r1')), details(role('r2', { location: [] }))])).toEqual([]);
  });

  it('sorts by name so the default district does not depend on server order', () => {
    const districts = districtsFrom([
      details(role('r1'), [{ resourceType: 'Location', id: 'z', name: 'Zeta' }]),
      details(role('r2'), [{ resourceType: 'Location', id: 'a', name: 'alpha' }]),
    ]);

    expect(districts.map((d) => d.id)).toEqual(['a', 'z']);
  });
});

describe('descendantIds', () => {
  it('collects the root and every descendant', () => {
    const result = descendantIds(tree(node('d1', [node('f1', [node('c1')]), node('f2')])));

    expect([...result.ids].sort()).toEqual(['c1', 'd1', 'f1', 'f2']);
    expect(result.truncated).toBe(false);
  });

  it('reports a truncated tree from the gateway meta or a node with more children', () => {
    expect(descendantIds(tree(node('d1'), true)).truncated).toBe(true);
    expect(descendantIds(tree(node('d1', [node('f1', [], true)]))).truncated).toBe(true);
  });
});

describe('resolveScopeIds', () => {
  const locationIds = new Set(['d1', 'f1']);
  const roles = [
    role('r1', {
      practitioner: { reference: 'Practitioner/p1' },
      organization: { reference: 'Organization/o1' },
      location: [{ reference: 'Location/f1' }],
    }),
    role('r2', { practitioner: { reference: 'p2' }, location: [{ reference: 'd1' }] }),
    role('r3', {
      practitioner: { reference: 'Practitioner/p3' },
      organization: { reference: 'Organization/o3' },
      location: [{ reference: 'Location/elsewhere' }],
    }),
    role('r4', { practitioner: { reference: 'Practitioner/p4' } }),
  ];
  const locations: Location[] = [
    { resourceType: 'Location', id: 'f1', managingOrganization: { reference: 'o2' } },
    {
      resourceType: 'Location',
      id: 'elsewhere',
      managingOrganization: { reference: 'Organization/o4' },
    },
  ];

  it('keeps the practitioners, roles and organisations of roles at an in scope location', () => {
    const ids = resolveScopeIds(locationIds, roles, locations);

    expect([...ids.practitionerIds].sort()).toEqual(['p1', 'p2']);
    expect([...ids.roleIds].sort()).toEqual(['r1', 'r2']);
  });

  it('adds the managing organisation of every in scope location', () => {
    const ids = resolveScopeIds(locationIds, roles, locations);

    expect([...ids.organizationIds].sort()).toEqual(['o1', 'o2']);
  });
});

describe('organizationInScope', () => {
  const ids = scope({ locationIds: ['f1'], organizationIds: ['o1'] });

  it('matches by organisation id or by a managed location in scope', () => {
    expect(organizationInScope({ id: 'o1' }, ids)).toBe(true);
    expect(organizationInScope({ id: 'o9', managedLocations: [{ id: 'f1' }] }, ids)).toBe(true);
  });

  it('leaves out an organisation that manages nothing in scope and is named by no role', () => {
    expect(organizationInScope({ id: 'o9', managedLocations: [{ id: 'x' }] }, ids)).toBe(false);
    expect(organizationInScope({ id: 'o8' }, ids)).toBe(false);
    expect(organizationInScope({}, ids)).toBe(false);
  });
});

describe('careTeamInScope', () => {
  const ids = scope({ practitionerIds: ['p1'], roleIds: ['r1'], organizationIds: ['o1'] });
  const team = (fields: Partial<CareTeam>): CareTeam => ({ resourceType: 'CareTeam', ...fields });

  it('matches a managing organisation in scope', () => {
    expect(careTeamInScope(team({ managingOrganization: [{ reference: 'o1' }] }), ids)).toBe(true);
  });

  it('matches a member as a practitioner, a bare practitioner id, a role or an organisation', () => {
    const member = (reference: string) => team({ participant: [{ member: { reference } }] });

    expect(careTeamInScope(member('Practitioner/p1'), ids)).toBe(true);
    expect(careTeamInScope(member('p1'), ids)).toBe(true);
    expect(careTeamInScope(member('PractitionerRole/r1'), ids)).toBe(true);
    expect(careTeamInScope(member('Organization/o1'), ids)).toBe(true);
  });

  it('leaves out a team with no organisation and no member in scope', () => {
    expect(careTeamInScope(team({}), ids)).toBe(false);
    expect(
      careTeamInScope(
        team({
          managingOrganization: [{ reference: 'Organization/o9' }],
          participant: [
            { member: { reference: 'Practitioner/p9' } },
            { member: { reference: 'r1' } },
          ],
        }),
        ids,
      ),
    ).toBe(false);
  });
});

describe('scopedOptions', () => {
  const options = [
    { value: '__root__', label: 'Root' },
    { value: 'Location/d1', label: 'District' },
    { value: 'Location/f1', label: 'Facility' },
    { value: 'Location/x', label: 'Elsewhere' },
  ];

  it('returns every option when unscoped', () => {
    expect(scopedOptions(options, null)).toEqual(options);
  });

  it('keeps only in scope options when scoped', () => {
    expect(scopedOptions(options, new Set(['d1', 'f1'])).map((o) => o.value)).toEqual([
      'Location/d1',
      'Location/f1',
    ]);
  });

  it('matches a selected value stored as a bare id', () => {
    expect(scopedOptions(options, new Set(['d1']), ['x']).map((o) => o.value)).toEqual([
      'Location/d1',
      'Location/x',
    ]);
  });

  it('keeps a selected out of scope value so an existing link stays removable', () => {
    expect(scopedOptions(options, new Set(['d1']), ['Location/x']).map((o) => o.value)).toEqual([
      'Location/d1',
      'Location/x',
    ]);
  });
});
