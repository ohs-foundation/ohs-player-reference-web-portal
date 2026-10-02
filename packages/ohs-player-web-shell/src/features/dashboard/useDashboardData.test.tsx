import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Params = Record<string, string | readonly string[]>;

let calls: Params[] = [];
let failing = '';
let loading = '';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useSearch: (resourceType: string | undefined, params: Params) => {
      if (!resourceType) return { data: undefined, isLoading: false, error: null };
      calls.push(params);
      const [ge] = params._lastUpdated as string[];
      if (ge === failing) return { data: undefined, isLoading: false, error: new Error('down') };
      if (ge === loading) return { data: undefined, isLoading: true, error: null };
      return { data: { total: Number(ge.slice(7, 9)) }, isLoading: false, error: null };
    },
  };
});

const { useMonthlyCounts } = await import('./useDashboardData');

describe('useMonthlyCounts', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 20));
    calls = [];
    failing = '';
    loading = '';
  });

  it('counts each of the last six months with a _lastUpdated range', () => {
    const { result } = renderHook(() => useMonthlyCounts('Practitioner', 6));

    expect(calls.slice(0, 6)).toEqual([
      { _summary: 'count', _lastUpdated: ['ge2025-08-01', 'lt2025-09-01'] },
      { _summary: 'count', _lastUpdated: ['ge2025-09-01', 'lt2025-10-01'] },
      { _summary: 'count', _lastUpdated: ['ge2025-10-01', 'lt2025-11-01'] },
      { _summary: 'count', _lastUpdated: ['ge2025-11-01', 'lt2025-12-01'] },
      { _summary: 'count', _lastUpdated: ['ge2025-12-01', 'lt2026-01-01'] },
      { _summary: 'count', _lastUpdated: ['ge2026-01-01', 'lt2026-02-01'] },
    ]);
    expect(result.current.points.map((point) => point.value)).toEqual([8, 9, 10, 11, 12, 1]);
    expect(result.current).toMatchObject({ loading: false, error: null });
  });

  it('reports the error of a month that fails', () => {
    failing = 'ge2025-10-01';

    expect(renderHook(() => useMonthlyCounts('Location', 6)).result.current.error).toBe('down');
  });

  it('is loading while any month loads', () => {
    loading = 'ge2026-01-01';

    expect(renderHook(() => useMonthlyCounts('Location', 6)).result.current.loading).toBe(true);
  });

  it('reserves twelve searches and leaves the ones outside the window idle', () => {
    const { result } = renderHook(() => useMonthlyCounts('Practitioner', 3));

    expect(calls.map((params) => (params._lastUpdated as string[])[0])).toEqual([
      'ge2025-11-01',
      'ge2025-12-01',
      'ge2026-01-01',
    ]);
    expect(result.current.points).toHaveLength(3);
  });

  it('counts a full year when asked for twelve months', () => {
    expect(
      renderHook(() => useMonthlyCounts('Practitioner', 12)).result.current.points,
    ).toHaveLength(12);
    expect(calls[0]._lastUpdated).toEqual(['ge2025-02-01', 'lt2025-03-01']);
  });
});
