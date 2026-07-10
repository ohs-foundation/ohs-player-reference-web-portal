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

describe('authoritative hierarchy refresh', () => {
  it('useRefreshHierarchy re-reads the tree with refresh=true (cache eviction)', async () => {
    customGet.mockClear();
    const { result } = renderHook(() => useRefreshHierarchy('ke'), { wrapper: wrapper() });
    await result.current();
    expect(customGet).toHaveBeenCalledWith('locationHierarchy', { refresh: 'true' }, 'ke');
  });

  it('useApplyHierarchyEdit follows the optimistic patch with a refresh=true read', async () => {
    customGet.mockClear();
    const { result } = renderHook(() => useApplyHierarchyEdit('ke'), { wrapper: wrapper() });
    result.current({ id: 'ke', name: 'Kenya', status: 'active', parentId: null });
    await waitFor(() =>
      expect(customGet).toHaveBeenCalledWith('locationHierarchy', { refresh: 'true' }, 'ke'),
    );
  });
});
