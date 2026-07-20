import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

const { search } = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock('../providers/FhirClientProvider', () => ({
  useFhirClient: () => ({ search }),
}));

import { usePagedSearch, type PagedSearchParams } from './useFhirData';

function bundle(entries: number, extra: Record<string, unknown> = {}) {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: Array.from({ length: entries }, (_, i) => ({ resource: { id: `r${i}` } })),
    ...extra,
  };
}

function renderPaged(resourceType: string, params: PagedSearchParams) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
  return renderHook(() => usePagedSearch(resourceType, params), { wrapper });
}

afterEach(() => search.mockReset());

describe('usePagedSearch', () => {
  it('sends _count/_offset/_total as strings and merges extra params', async () => {
    search.mockResolvedValue(bundle(10, { total: 25 }));
    const { result } = renderPaged('Patient', { page: 2, pageSize: 10, params: { name: 'jane' } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(search).toHaveBeenCalledWith('Patient', {
      name: 'jane',
      _count: '10',
      _offset: '20',
      _total: 'accurate',
    });
  });

  it('numbered mode: accurate total drives page math', async () => {
    search.mockResolvedValue(bundle(10, { total: 25 }));
    const { result } = renderPaged('Patient', { page: 0, pageSize: 10 });
    await waitFor(() => expect(result.current.rows).toHaveLength(10));

    expect(result.current.total).toBe(25);
    expect(result.current.paginationMode).toBe('numbered');
    expect(result.current.hasNext).toBe(true); // 10 < 25
    expect(result.current.hasPrev).toBe(false);
  });

  it('numbered mode: last page has no next', async () => {
    search.mockResolvedValue(bundle(5, { total: 25 }));
    const { result } = renderPaged('Patient', { page: 2, pageSize: 10 });
    await waitFor(() => expect(result.current.rows).toHaveLength(5));

    expect(result.current.hasNext).toBe(false); // 30 !< 25
    expect(result.current.hasPrev).toBe(true);
  });

  it('links mode: no total → degrades to next-link / full-page heuristic', async () => {
    search.mockResolvedValue(bundle(10, { link: [{ relation: 'next', url: 'x' }] }));
    const { result } = renderPaged('Observation', { page: 0, pageSize: 10 });
    await waitFor(() => expect(result.current.rows).toHaveLength(10));

    expect(result.current.total).toBeUndefined();
    expect(result.current.paginationMode).toBe('links');
    expect(result.current.hasNext).toBe(true);
  });

  it('empty searchset (total:0) → no rows, no navigation', async () => {
    search.mockResolvedValue(bundle(0, { total: 0 }));
    const { result } = renderPaged('Encounter', { page: 0, pageSize: 10 });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrev).toBe(false);
  });

  it('does not fetch when resourceType is undefined', () => {
    renderPaged(undefined as unknown as string, { page: 0, pageSize: 10 });
    expect(search).not.toHaveBeenCalled();
  });
});
