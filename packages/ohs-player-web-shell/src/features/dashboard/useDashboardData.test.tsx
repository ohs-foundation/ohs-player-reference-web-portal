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
    useSearch: (_resourceType: string, params: Params) => {
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
    const { result } = renderHook(() => useMonthlyCounts('Practitioner'));

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

    expect(renderHook(() => useMonthlyCounts('Location')).result.current.error).toBe('down');
  });

  it('is loading while any month loads', () => {
    loading = 'ge2026-01-01';

    expect(renderHook(() => useMonthlyCounts('Location')).result.current.loading).toBe(true);
  });
});
