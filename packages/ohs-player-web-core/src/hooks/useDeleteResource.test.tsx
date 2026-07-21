import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

const { del } = vi.hoisted(() => ({ del: vi.fn() }));
vi.mock('../providers/FhirClientProvider', () => ({
  useFhirClient: () => ({ delete: del }),
}));

import { useDeleteResource } from './useFhirData';

function setup(resourceType: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
  const { result } = renderHook(() => useDeleteResource(resourceType), { wrapper });
  return { del: result, invalidate };
}

afterEach(() => del.mockReset());

describe('useDeleteResource', () => {
  it('calls client.delete(resourceType, id) and invalidates read + search caches', async () => {
    del.mockResolvedValue(undefined);
    const { del: result, invalidate } = setup('Organization');

    await result.current.mutateAsync('seed-org-1');

    expect(del).toHaveBeenCalledWith('Organization', 'seed-org-1');
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['fhir', 'read', 'Organization', 'seed-org-1'],
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['fhir', 'search', 'Organization'] });
  });

  it('rejects when the server errors (e.g. 409 referential conflict)', async () => {
    del.mockRejectedValue(new Error('resource in use'));
    const { del: result } = setup('Practitioner');

    await expect(result.current.mutateAsync('p1')).rejects.toThrow('resource in use');
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
