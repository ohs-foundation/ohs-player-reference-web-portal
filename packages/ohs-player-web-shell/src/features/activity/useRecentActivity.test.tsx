import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useSearch } = vi.hoisted(() => ({ useSearch: vi.fn() }));

vi.mock(
  'ohs-player-web-core',
  async (): Promise<object> => ({
    ...(await vi.importActual<object>('ohs-player-web-core')),
    useSearch,
  }),
);

const { useRecentActivity } = await import('./useRecentActivity');

function portalEvent(
  id: string,
  action: string | undefined,
  recorded: string,
  entity?: { reference: string; description?: string },
  who = 'admin-user',
): Record<string, unknown> {
  return {
    resourceType: 'AuditEvent',
    id,
    ...(action ? { action } : {}),
    recorded,
    agent: [{ who: { display: who }, requestor: true }],
    source: { observer: { display: 'OHS Player Web' } },
    entity: entity
      ? [
          {
            what: { reference: entity.reference },
            ...(entity.description ? { description: entity.description } : {}),
          },
        ]
      : [],
  };
}

const TWELVE = [
  portalEvent('a12', 'C', '2026-09-22T12:00:00.000Z', { reference: 'Location/l1' }),
  portalEvent('a11', 'U', '2026-09-22T11:00:00.000Z', {
    reference: 'Location/l1',
    description: 'Linked to Organization/o1',
  }),
  portalEvent('a10', 'D', '2026-09-22T10:00:00.000Z', { reference: 'Practitioner/p1' }),
  portalEvent('a09', undefined, '2026-09-22T09:00:00.000Z', { reference: 'Organization/o1' }),
  portalEvent('a08', 'C', '2026-09-22T08:00:00.000Z', undefined),
  portalEvent('a07', 'U', '2026-09-22T07:00:00.000Z', { reference: 'CareTeam/ct1' }, 'Portal user'),
  portalEvent('a06', 'C', '2026-09-22T06:00:00.000Z', { reference: 'PractitionerRole/pr1' }),
  portalEvent('a05', 'U', '2026-09-22T05:00:00.000Z', { reference: 'Organization/o2' }),
  portalEvent('a04', 'D', '2026-09-22T04:00:00.000Z', { reference: 'CareTeam/ct2' }),
  portalEvent('a03', 'C', '2026-09-22T03:00:00.000Z', { reference: 'Location/l2' }),
  portalEvent('a02', 'U', '2026-09-22T02:00:00.000Z', { reference: 'Practitioner/p2' }),
  portalEvent('a01', 'C', '2026-09-22T01:00:00.000Z', { reference: 'Organization/o3' }),
];

// Captured from the hook before its normalisation moved to the library; must not change.
const EXPECTED = [
  {
    id: 'a12',
    action: 'C',
    resourceType: 'Location',
    resourceId: 'l1',
    description: undefined,
    who: 'admin-user',
    recorded: '2026-09-22T12:00:00.000Z',
  },
  {
    id: 'a11',
    action: 'U',
    resourceType: 'Location',
    resourceId: 'l1',
    description: 'Linked to Organization/o1',
    who: 'admin-user',
    recorded: '2026-09-22T11:00:00.000Z',
  },
  {
    id: 'a10',
    action: 'D',
    resourceType: 'Practitioner',
    resourceId: 'p1',
    description: undefined,
    who: 'admin-user',
    recorded: '2026-09-22T10:00:00.000Z',
  },
  {
    id: 'a09',
    action: undefined,
    resourceType: 'Organization',
    resourceId: 'o1',
    description: undefined,
    who: 'admin-user',
    recorded: '2026-09-22T09:00:00.000Z',
  },
  {
    id: 'a08',
    action: 'C',
    resourceType: '',
    resourceId: '',
    description: undefined,
    who: 'admin-user',
    recorded: '2026-09-22T08:00:00.000Z',
  },
  {
    id: 'a07',
    action: 'U',
    resourceType: 'CareTeam',
    resourceId: 'ct1',
    description: undefined,
    who: 'Portal user',
    recorded: '2026-09-22T07:00:00.000Z',
  },
  {
    id: 'a06',
    action: 'C',
    resourceType: 'PractitionerRole',
    resourceId: 'pr1',
    description: undefined,
    who: 'admin-user',
    recorded: '2026-09-22T06:00:00.000Z',
  },
  {
    id: 'a05',
    action: 'U',
    resourceType: 'Organization',
    resourceId: 'o2',
    description: undefined,
    who: 'admin-user',
    recorded: '2026-09-22T05:00:00.000Z',
  },
  {
    id: 'a04',
    action: 'D',
    resourceType: 'CareTeam',
    resourceId: 'ct2',
    description: undefined,
    who: 'admin-user',
    recorded: '2026-09-22T04:00:00.000Z',
  },
  {
    id: 'a03',
    action: 'C',
    resourceType: 'Location',
    resourceId: 'l2',
    description: undefined,
    who: 'admin-user',
    recorded: '2026-09-22T03:00:00.000Z',
  },
  {
    id: 'a02',
    action: 'U',
    resourceType: 'Practitioner',
    resourceId: 'p2',
    description: undefined,
    who: 'admin-user',
    recorded: '2026-09-22T02:00:00.000Z',
  },
  {
    id: 'a01',
    action: 'C',
    resourceType: 'Organization',
    resourceId: 'o3',
    description: undefined,
    who: 'admin-user',
    recorded: '2026-09-22T01:00:00.000Z',
  },
];

function searchResult(overrides: Record<string, unknown>): Record<string, unknown> {
  return { data: undefined, isLoading: false, error: null, ...overrides };
}

describe('useRecentActivity', () => {
  beforeEach(() => useSearch.mockReset());

  it('asks for the twelve newest AuditEvents', () => {
    useSearch.mockReturnValue(searchResult({}));
    renderHook(() => useRecentActivity());
    expect(useSearch).toHaveBeenCalledWith('AuditEvent', { _sort: '-date', _count: '12' });
  });

  it('normalises twelve portal-written events exactly as the bell always has', () => {
    useSearch.mockReturnValue(
      searchResult({
        data: { resourceType: 'Bundle', entry: TWELVE.map((resource) => ({ resource })) },
      }),
    );
    const { result } = renderHook(() => useRecentActivity());
    expect(result.current.items).toEqual(EXPECTED);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns no items for a bundle without entries', () => {
    useSearch.mockReturnValue(searchResult({ data: { resourceType: 'Bundle', total: 0 } }));
    const { result } = renderHook(() => useRecentActivity());
    expect(result.current.items).toEqual([]);
  });

  it('reports loading and maps errors to a message string', () => {
    useSearch.mockReturnValue(searchResult({ isLoading: true }));
    expect(renderHook(() => useRecentActivity()).result.current.loading).toBe(true);

    useSearch.mockReturnValue(searchResult({ error: new Error('HAPI down') }));
    expect(renderHook(() => useRecentActivity()).result.current.error).toBe('HAPI down');

    useSearch.mockReturnValue(searchResult({ error: 'offline' }));
    expect(renderHook(() => useRecentActivity()).result.current.error).toBe('offline');
  });
});
