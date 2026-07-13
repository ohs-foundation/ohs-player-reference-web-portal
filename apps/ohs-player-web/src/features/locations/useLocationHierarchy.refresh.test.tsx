import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const customGet = vi.fn().mockResolvedValue({
  root: { id: 'Location/ke', name: 'Kenya', status: 'active', partOf: null, children: [], hasMoreChildren: false },
  meta: { nodeCount: 1, depth: 0, truncated: false, builtAt: 0 },
});

vi.mock('ohs-player-web-core', () => ({
  useFhirClient: () => ({ customGet }),
  FhirError: class extends Error {},
}));

const { useApplyHierarchyEdit, useRefreshHierarchy } = await import('./useLocationHierarchy');

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

function clientWrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

/** Normalized cache seed: Kenya with Nairobi and Mombasa as sibling children. */
function seededKenyaTree() {
  const child = (id: string, name: string) => ({
    id,
    name,
    status: 'active',
    partOf: 'ke',
    partOfLabel: 'Kenya',
    physicalType: null,
    type: [],
    children: [],
    hasMoreChildren: false,
  });
  return {
    root: {
      id: 'ke',
      name: 'Kenya',
      status: 'active',
      partOf: null,
      partOfLabel: null,
      physicalType: null,
      type: [],
      children: [child('nrb', 'Nairobi'), child('msa', 'Mombasa')],
      hasMoreChildren: false,
    },
    meta: { nodeCount: 3, depth: 1, truncated: false, builtAt: null },
  };
}

/** Raw gateway response: Kenya with only Nairobi — a rebuild that lost Mombasa entirely. */
function poisonedKenyaResponse() {
  return {
    root: {
      id: 'Location/ke',
      name: 'Kenya',
      status: 'active',
      partOf: null,
      children: [
        {
          id: 'Location/nrb',
          name: 'Nairobi',
          status: 'active',
          partOf: { reference: 'Location/ke', display: 'Kenya' },
          children: [],
          hasMoreChildren: false,
        },
      ],
      hasMoreChildren: false,
    },
    meta: { nodeCount: 2, depth: 1, truncated: false, builtAt: 0 },
  };
}

type TreeShape = { root: { children: { id: string; children: { id: string }[] }[] } };
const KEY = ['location-hierarchy', 'ke'];

describe('authoritative hierarchy refresh', () => {
  it('useRefreshHierarchy re-reads the tree with refresh=true (cache eviction)', async () => {
    customGet.mockClear();
    const { result } = renderHook(() => useRefreshHierarchy('ke'), { wrapper: wrapper() });
    await result.current();
    expect(customGet).toHaveBeenCalledWith('locationHierarchy', { refresh: 'true' }, 'ke');
  });

  it('useApplyHierarchyEdit follows the optimistic patch with a refresh=true read and re-applies the patch', async () => {
    customGet.mockClear();
    customGet.mockResolvedValue({
      root: {
        id: 'Location/ke',
        name: 'Kenya',
        status: 'active',
        partOf: null,
        children: [
          {
            id: 'Location/nrb',
            name: 'Nairobi',
            status: 'active',
            partOf: { reference: 'Location/ke', display: 'Kenya' },
            children: [],
            hasMoreChildren: false,
          },
          {
            id: 'Location/msa',
            name: 'Mombasa',
            status: 'active',
            partOf: { reference: 'Location/ke', display: 'Kenya' },
            children: [],
            hasMoreChildren: false,
          },
        ],
        hasMoreChildren: false,
      },
      meta: { nodeCount: 3, depth: 1, truncated: false, builtAt: 0 },
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useApplyHierarchyEdit('ke'), { wrapper: clientWrapper(qc) });
    // Seed cache so the optimistic path has a tree to restructure.
    qc.setQueryData(KEY, seededKenyaTree());

    result.current({ id: 'msa', name: 'Mombasa', status: 'active', parentId: 'nrb' });

    await waitFor(() =>
      expect(customGet).toHaveBeenCalledWith('locationHierarchy', { refresh: 'true' }, 'ke'),
    );
    await waitFor(() => {
      const tree = qc.getQueryData<TreeShape>(KEY);
      // Gateway still returns the pre-edit sibling layout; re-applied patch must nest msa under nrb.
      expect(tree?.root.children.map((c) => c.id)).toEqual(['nrb']);
      expect(tree?.root.children[0]?.children.map((c) => c.id)).toEqual(['msa']);
    });
  });

  it('grafts the moved node back when a mid-edit rebuild dropped it, then heals past the cache window', async () => {
    vi.useFakeTimers();
    try {
      customGet.mockClear();
      customGet.mockResolvedValue(poisonedKenyaResponse());
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { result } = renderHook(() => useApplyHierarchyEdit('ke'), { wrapper: clientWrapper(qc) });
      qc.setQueryData(KEY, seededKenyaTree());

      result.current({ id: 'msa', name: 'Mombasa', status: 'active', parentId: 'nrb' });
      await vi.advanceTimersByTimeAsync(0);

      expect(customGet).toHaveBeenCalledTimes(1);
      let tree = qc.getQueryData<TreeShape>(KEY);
      expect(tree?.root.children.map((c) => c.id)).toEqual(['nrb']);
      expect(tree?.root.children[0]?.children.map((c) => c.id)).toEqual(['msa']);

      // The gateway cached the broken tree; a healing refresh must fire after HAPI's 60 s window.
      await vi.advanceTimersByTimeAsync(65_000);
      expect(customGet).toHaveBeenCalledTimes(2);
      tree = qc.getQueryData<TreeShape>(KEY);
      expect(tree?.root.children[0]?.children.map((c) => c.id)).toEqual(['msa']);
    } finally {
      vi.useRealTimers();
    }
  });
});
