import { renderHook } from '@testing-library/react';
import { FhirError } from 'ohs-player-web-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseCustomResource = vi.fn();
const mockUseResource = vi.fn();
const mockUseSearch = vi.fn();

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useCustomResource: (...args: unknown[]) => mockUseCustomResource(...args) as unknown,
    useResource: (...args: unknown[]) => mockUseResource(...args) as unknown,
    useSearch: (...args: unknown[]) => mockUseSearch(...args) as unknown,
  };
});

const { usePractitionerDetails, useMyPractitionerDetails } = await import(
  './usePractitionerDetails'
);

const idle = { data: undefined, isLoading: false, error: undefined };

const careTeamA = { resourceType: 'CareTeam', id: 'ct1', name: 'Team A' };
const practitioner = { resourceType: 'Practitioner', id: 'p1', name: [{ family: 'Smith' }] };

function roleDetail(overrides: Record<string, unknown> = {}) {
  return {
    practitionerRole: { resourceType: 'PractitionerRole', id: 'pr1' },
    organization: { resourceType: 'Organization', id: 'o1', name: 'Org One' },
    locations: [{ resourceType: 'Location', id: 'l1', name: 'Loc One' }],
    careTeams: [careTeamA],
    ...overrides,
  };
}

describe('usePractitionerDetails', () => {
  beforeEach(() => {
    mockUseCustomResource.mockReset().mockReturnValue(idle);
    mockUseResource.mockReset().mockReturnValue(idle);
    mockUseSearch.mockReset().mockReturnValue(idle);
  });

  it('requests the alias with the practitioner-id param', () => {
    renderHook(() => usePractitionerDetails('p1'));

    expect(mockUseCustomResource).toHaveBeenCalledWith(
      'practitionerDetails',
      { 'practitioner-id': 'p1' },
      { enabled: true },
    );
  });

  it('stays disabled without a practitioner id', () => {
    renderHook(() => usePractitionerDetails(undefined));

    expect(mockUseCustomResource).toHaveBeenCalledWith(
      'practitionerDetails',
      { 'practitioner-id': undefined },
      { enabled: false },
    );
  });

  it('exposes the practitioner, roles, organisation, locations and care teams inline', () => {
    mockUseCustomResource.mockReturnValue({
      ...idle,
      data: { practitioner, practitionerRoles: [roleDetail()] },
    });

    const { result } = renderHook(() => usePractitionerDetails('p1'));

    expect(result.current.practitioner).toEqual(practitioner);
    expect(result.current.roles).toEqual([{ resourceType: 'PractitionerRole', id: 'pr1' }]);
    expect(result.current.roleDetails[0].organization?.name).toBe('Org One');
    expect(result.current.roleDetails[0].locations).toHaveLength(1);
    expect(result.current.careTeams).toEqual([careTeamA]);
    // Care teams came inline, so no FHIR search was enabled.
    expect(mockUseSearch).toHaveBeenCalledWith(undefined, expect.anything());
  });

  it('dedupes a care team attached to more than one role', () => {
    mockUseCustomResource.mockReturnValue({
      ...idle,
      data: {
        practitioner,
        practitionerRoles: [
          roleDetail(),
          roleDetail({ practitionerRole: { resourceType: 'PractitionerRole', id: 'pr2' } }),
        ],
      },
    });

    const { result } = renderHook(() => usePractitionerDetails('p1'));

    expect(result.current.careTeams).toEqual([careTeamA]);
    expect(result.current.roles).toHaveLength(2);
  });

  it('searches CareTeam by practitioner when the endpoint attaches none', () => {
    mockUseCustomResource.mockReturnValue({
      ...idle,
      data: { practitioner, practitionerRoles: [roleDetail({ careTeams: [] })] },
    });
    mockUseSearch.mockReturnValue({ ...idle, data: { entry: [{ resource: careTeamA }] } });

    const { result } = renderHook(() => usePractitionerDetails('p1'));

    expect(mockUseSearch).toHaveBeenCalledWith('CareTeam', {
      participant: 'Practitioner/p1',
      _count: '100',
    });
    expect(result.current.careTeams).toEqual([careTeamA]);
  });

  it('reads the practitioner directly when the endpoint 404s for a role-less user', () => {
    mockUseCustomResource.mockReturnValue({
      ...idle,
      error: new FhirError('not found', 404, undefined),
    });
    mockUseResource.mockReturnValue({ ...idle, data: practitioner });

    const { result } = renderHook(() => usePractitionerDetails('p1'));

    expect(mockUseResource).toHaveBeenCalledWith('Practitioner', 'p1');
    expect(result.current.practitioner).toEqual(practitioner);
    expect(result.current.roles).toEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it('surfaces a non-404 failure and skips the practitioner read', () => {
    const failure = new FhirError('gateway down', 502, undefined);
    mockUseCustomResource.mockReturnValue({ ...idle, error: failure });

    const { result } = renderHook(() => usePractitionerDetails('p1'));

    expect(result.current.error).toBe(failure);
    expect(mockUseResource).toHaveBeenCalledWith('Practitioner', undefined);
  });

  it('reports loading while any of the three reads is in flight', () => {
    mockUseCustomResource.mockReturnValue({ ...idle, isLoading: true });

    const { result } = renderHook(() => usePractitionerDetails('p1'));

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useMyPractitionerDetails', () => {
  beforeEach(() => {
    mockUseCustomResource.mockReset().mockReturnValue(idle);
    mockUseResource.mockReset().mockReturnValue(idle);
    mockUseSearch.mockReset().mockReturnValue(idle);
  });

  it('calls the endpoint with no params so the gateway resolves the caller', () => {
    renderHook(() => useMyPractitionerDetails());

    expect(mockUseCustomResource).toHaveBeenCalledWith('practitionerDetails', undefined, {
      enabled: true,
    });
  });
});
