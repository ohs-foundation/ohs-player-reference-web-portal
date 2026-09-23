import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let sub = 'u1';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return { ...actual, useAuth: () => ({ status: 'authenticated', user: { sub } }) };
});

const { KPI_STORAGE_PREFIX, useDashboardKpis } = await import('./useDashboardKpis');

describe('useDashboardKpis', () => {
  beforeEach(() => {
    sub = 'u1';
    window.localStorage.clear();
  });

  it('selects every catalogue KPI when nothing is stored', () => {
    const { result } = renderHook(() => useDashboardKpis());

    expect(result.current.selected).toEqual(['users', 'locations', 'organizations', 'careTeams']);
    expect(result.current.max).toBe(4);
  });

  it('persists a saved selection per user and reads it back after a reload', () => {
    const first = renderHook(() => useDashboardKpis());
    act(() => first.result.current.save(['careTeams']));

    expect(first.result.current.selected).toEqual(['careTeams']);
    expect(window.localStorage.getItem(`${KPI_STORAGE_PREFIX}u1`)).toBe('["careTeams"]');

    first.unmount();
    expect(renderHook(() => useDashboardKpis()).result.current.selected).toEqual(['careTeams']);
  });

  it('keeps a saved empty selection empty', () => {
    const { result } = renderHook(() => useDashboardKpis());
    act(() => result.current.save([]));

    expect(renderHook(() => useDashboardKpis()).result.current.selected).toEqual([]);
  });

  it('keeps each user separate', () => {
    window.localStorage.setItem(`${KPI_STORAGE_PREFIX}u1`, '["users"]');
    sub = 'u2';

    expect(renderHook(() => useDashboardKpis()).result.current.selected).toHaveLength(4);
  });

  it('trims tampered storage to the first four valid ids', () => {
    window.localStorage.setItem(
      `${KPI_STORAGE_PREFIX}u1`,
      JSON.stringify(['x', 'careTeams', 'users', 'locations', 'organizations', 'users']),
    );

    expect(renderHook(() => useDashboardKpis()).result.current.selected).toEqual([
      'careTeams',
      'users',
      'locations',
      'organizations',
    ]);
  });

  it('falls back to the default when storage holds invalid JSON', () => {
    window.localStorage.setItem(`${KPI_STORAGE_PREFIX}u1`, '{not json');

    expect(renderHook(() => useDashboardKpis()).result.current.selected).toHaveLength(4);
  });
});
