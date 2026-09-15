import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useRefreshResources } from './useFhirData';

function renderRefresh() {
  const qc = new QueryClient();
  const invalidate = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
  const { result } = renderHook(() => useRefreshResources(), { wrapper });
  return { refresh: result.current, invalidate };
}

describe('useRefreshResources', () => {
  it('invalidates the search query for each resource type', async () => {
    const { refresh, invalidate } = renderRefresh();
    await refresh(['Practitioner', 'PractitionerRole']);

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['fhir', 'search', 'Practitioner'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['fhir', 'search', 'PractitionerRole'] });
  });

  it('accepts a single resource type string', async () => {
    const { refresh, invalidate } = renderRefresh();
    await refresh('CareTeam');
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['fhir', 'search', 'CareTeam'] });
  });
});
