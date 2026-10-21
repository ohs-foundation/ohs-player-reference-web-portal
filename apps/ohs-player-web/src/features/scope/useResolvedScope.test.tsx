import type { Location, PractitionerRole } from '@medplum/fhirtypes';
import { act, renderHook } from '@testing-library/react';
import { FhirError } from 'ohs-player-web-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationHierarchy, LocationNode } from '../locations/hierarchy';
import type { PractitionerContext, PractitionerRoleDetails } from '../users/usePractitionerDetails';

const mockSelf = vi.fn();
const mockHierarchy = vi.fn();
const mockSearch = vi.fn();
const onError = vi.fn();
let authStatus = 'authenticated';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useAuth: () => ({ status: authStatus, user: { sub: 'manager-sub' } }),
    useCoreConfig: () => ({ onError }),
    useSearch: (...args: unknown[]) => mockSearch(...args) as unknown,
  };
});

vi.mock('../users/usePractitionerDetails', async (): Promise<object> => {
  const actual = await vi.importActual<object>('../users/usePractitionerDetails');
  return {
    ...actual,
    useMyPractitionerDetails: (...args: unknown[]) => mockSelf(...args) as unknown,
  };
});

vi.mock('../locations/useLocationHierarchy', async (): Promise<object> => {
  const actual = await vi.importActual<object>('../locations/useLocationHierarchy');
  return { ...actual, useLocationHierarchy: (id: unknown) => mockHierarchy(id) as unknown };
});

const { HierarchyError } = await import('../locations/useLocationHierarchy');
const { useResolvedScope } = await import('./useResolvedScope');
const { districtStorageKey } = await import('./useCurrentDistrict');

const idle = { data: undefined, isLoading: false, error: null };

function node(id: string, children: LocationNode[] = []): LocationNode {
  return {
    id,
    name: id,
    status: 'active',
    partOf: null,
    partOfLabel: null,
    physicalType: null,
    type: [],
    children,
    hasMoreChildren: false,
  };
}

function tree(root: LocationNode, truncated = false): LocationHierarchy {
  return { root, meta: { nodeCount: 0, depth: 0, truncated, builtAt: null } };
}

function ownRole(districtId: string, name: string): PractitionerRoleDetails {
  return {
    practitionerRole: {
      resourceType: 'PractitionerRole',
      id: `own-${districtId}`,
      practitioner: { reference: 'Practitioner/me' },
      organization: { reference: 'Organization/own-org' },
      location: [{ reference: `Location/${districtId}` }],
    },
    organization: null,
    locations: [{ resourceType: 'Location', id: districtId, name }],
    careTeams: [],
  };
}

function self(
  roleDetails: PractitionerRoleDetails[],
  fields: Partial<PractitionerContext> = {},
): PractitionerContext {
  return {
    practitioner: { resourceType: 'Practitioner', id: 'me' },
    roleDetails,
    roles: roleDetails.map((d) => d.practitionerRole),
    careTeams: [],
    isLoading: false,
    error: undefined,
    ...fields,
  };
}

const roles: PractitionerRole[] = [
  {
    resourceType: 'PractitionerRole',
    id: 'r1',
    practitioner: { reference: 'Practitioner/p1' },
    organization: { reference: 'Organization/o1' },
    location: [{ reference: 'Location/f1' }],
  },
  {
    resourceType: 'PractitionerRole',
    id: 'r2',
    practitioner: { reference: 'Practitioner/p2' },
    location: [{ reference: 'Location/elsewhere' }],
  },
];

const locations: Location[] = [
  { resourceType: 'Location', id: 'c1', managingOrganization: { reference: 'Organization/o2' } },
];

function bundle(resources: unknown[]) {
  return { resourceType: 'Bundle', entry: resources.map((resource) => ({ resource })) };
}

const notFound = new FhirError('No practitioner found for iam-id: manager-sub', 404, {});

function hierarchyFor(trees: Record<string, LocationHierarchy>) {
  mockHierarchy.mockImplementation((id: string | undefined) =>
    id && trees[id] ? { data: trees[id], isLoading: false, error: null } : idle,
  );
}

beforeEach(() => {
  authStatus = 'authenticated';
  sessionStorage.clear();
  onError.mockReset();
  mockSelf.mockReset().mockReturnValue(self([], { error: notFound }));
  hierarchyFor({ d1: tree(node('d1', [node('f1', [node('c1')])])), d2: tree(node('d2')) });
  mockSearch.mockReset().mockImplementation((type: string | undefined) => {
    if (type === 'PractitionerRole') return { ...idle, data: bundle(roles) };
    if (type === 'Location') return { ...idle, data: bundle(locations) };
    return idle;
  });
});

describe('useResolvedScope', () => {
  it('stays unscoped and asks for nothing more when the user has no practitioner', () => {
    const { result } = renderHook(() => useResolvedScope());

    expect(result.current.status).toBe('unscoped');
    expect(result.current.loadFailed).toBe(false);
    expect(mockHierarchy.mock.calls.every(([id]) => id === undefined)).toBe(true);
    expect(mockSearch.mock.calls.every(([type]) => type === undefined)).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('waits for a session before looking the user up', () => {
    authStatus = 'unauthenticated';
    mockSelf.mockReturnValue(self([]));

    const { result } = renderHook(() => useResolvedScope());

    expect(mockSelf).toHaveBeenCalledWith(false);
    expect(result.current.status).toBe('unscoped');
  });

  it('is loading while the self lookup runs', () => {
    mockSelf.mockReturnValue(self([], { isLoading: true }));

    const { result } = renderHook(() => useResolvedScope());

    expect(result.current.status).toBe('loading');
  });

  it('is unscoped when no role carries a location', () => {
    const roleWithoutLocation = { ...ownRole('d1', 'Kisumu'), locations: [] };
    roleWithoutLocation.practitionerRole = { resourceType: 'PractitionerRole', id: 'bare' };
    mockSelf.mockReturnValue(self([roleWithoutLocation]));

    const { result } = renderHook(() => useResolvedScope());

    expect(result.current.status).toBe('unscoped');
  });

  it('scopes to the district and its descendants, with the people and organisations there', () => {
    mockSelf.mockReturnValue(self([ownRole('d1', 'Kisumu')]));

    const { result } = renderHook(() => useResolvedScope());

    expect(result.current.status).toBe('scoped');
    expect(result.current.current).toEqual({ id: 'd1', name: 'Kisumu' });
    expect([...result.current.locationIds].sort()).toEqual(['c1', 'd1', 'f1']);
    expect([...result.current.practitionerIds].sort()).toEqual(['me', 'p1']);
    expect([...result.current.organizationIds].sort()).toEqual(['o1', 'o2', 'own-org']);
    expect(result.current.incomplete).toBe(false);
  });

  it('stays loading until the tree has arrived', () => {
    mockSelf.mockReturnValue(self([ownRole('d1', 'Kisumu')]));
    mockHierarchy.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { result } = renderHook(() => useResolvedScope());

    expect(result.current.status).toBe('loading');
  });

  it('marks the scope incomplete when the gateway truncated the tree', () => {
    mockSelf.mockReturnValue(self([ownRole('d1', 'Kisumu')]));
    hierarchyFor({ d1: tree(node('d1'), true) });

    const { result } = renderHook(() => useResolvedScope());

    expect(result.current.incomplete).toBe(true);
  });

  it('keeps a scoped user to the district alone when the tree cannot be read', () => {
    mockSelf.mockReturnValue(self([ownRole('d1', 'Kisumu')]));
    const forbidden = new FhirError('Forbidden', 403, {});
    mockHierarchy.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new HierarchyError(403, 'Forbidden', forbidden),
    });

    const { result } = renderHook(() => useResolvedScope());

    expect(result.current.status).toBe('scoped');
    expect([...result.current.locationIds]).toEqual(['d1']);
    expect(result.current.incomplete).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports a tree failure that never reached the client', () => {
    mockSelf.mockReturnValue(self([ownRole('d1', 'Kisumu')]));
    const offline = new HierarchyError(0, 'Failed to fetch', new TypeError('Failed to fetch'));
    mockHierarchy.mockReturnValue({ data: undefined, isLoading: false, error: offline });

    renderHook(() => useResolvedScope());

    expect(onError).toHaveBeenCalledWith(offline);
  });

  it('treats any other lookup failure as unscoped with a notice', () => {
    mockSelf.mockReturnValue(self([], { error: new FhirError('Bad gateway', 502, {}) }));

    const { result } = renderHook(() => useResolvedScope());

    expect(result.current.status).toBe('unscoped');
    expect(result.current.loadFailed).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports a lookup failure that never reached the client', () => {
    const offline = new TypeError('Failed to fetch');
    mockSelf.mockReturnValue(self([], { error: offline }));

    const { result } = renderHook(() => useResolvedScope());

    expect(result.current.loadFailed).toBe(true);
    expect(onError).toHaveBeenCalledWith(offline);
  });

  it('shows one district at a time and remembers the choice for this tab', () => {
    mockSelf.mockReturnValue(self([ownRole('d2', 'Beta'), ownRole('d1', 'Alpha')]));
    const first = renderHook(() => useResolvedScope());

    expect(first.result.current.districts.map((d) => d.id)).toEqual(['d1', 'd2']);
    expect(first.result.current.current?.id).toBe('d1');

    act(() => first.result.current.setCurrent('d2'));

    expect(first.result.current.current?.id).toBe('d2');
    expect([...first.result.current.locationIds]).toEqual(['d2']);
    expect(sessionStorage.getItem(districtStorageKey('manager-sub'))).toBe('d2');
    first.unmount();

    const second = renderHook(() => useResolvedScope());
    expect(second.result.current.current?.id).toBe('d2');
  });

  it('falls back to the first district and clears a stored choice that no longer matches', () => {
    sessionStorage.setItem(districtStorageKey('manager-sub'), 'gone');
    mockSelf.mockReturnValue(self([ownRole('d1', 'Kisumu')]));

    const { result } = renderHook(() => useResolvedScope());

    expect(result.current.current?.id).toBe('d1');
    expect(sessionStorage.getItem(districtStorageKey('manager-sub'))).toBeNull();
  });

  it('calls the same hooks whatever the role list holds between renders', () => {
    mockSelf.mockReturnValue(self([ownRole('d1', 'Kisumu')]));
    const { result, rerender } = renderHook(() => useResolvedScope());
    expect(result.current.status).toBe('scoped');

    mockSelf.mockReturnValue(self([ownRole('d1', 'Kisumu'), ownRole('d2', 'Nakuru')]));
    rerender();
    expect(result.current.districts).toHaveLength(2);

    mockSelf.mockReturnValue(self([], { error: notFound }));
    rerender();
    expect(result.current.status).toBe('unscoped');
  });
});
