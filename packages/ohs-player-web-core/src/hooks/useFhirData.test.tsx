import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCustomGet = vi.fn();

vi.mock('../providers/FhirClientProvider', () => ({
  useFhirClient: () => ({ customGet: mockCustomGet }),
}));

const { useCustomResource } = await import('./useFhirData');

function wrapper({ children }: { children: ReactNode }): React.ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCustomResource', () => {
  beforeEach(() => {
    mockCustomGet.mockReset().mockResolvedValue({ ok: true });
  });

  it('GETs the alias with the given params and resolves the body', async () => {
    const { result } = renderHook(
      () => useCustomResource('practitionerDetails', { 'practitioner-id': 'p1' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toEqual({ ok: true }));
    expect(mockCustomGet).toHaveBeenCalledTimes(1);
    expect(mockCustomGet).toHaveBeenCalledWith('practitionerDetails', { 'practitioner-id': 'p1' });
  });

  it('calls the alias with no params for the self-lookup form', async () => {
    const { result } = renderHook(() => useCustomResource('practitionerDetails'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCustomGet).toHaveBeenCalledWith('practitionerDetails', undefined);
  });

  it('does not fetch while disabled', () => {
    const { result } = renderHook(
      () => useCustomResource('practitionerDetails', undefined, { enabled: false }),
      { wrapper },
    );

    expect(mockCustomGet).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('surfaces a rejected request as the query error', async () => {
    const failure = new Error('gateway down');
    mockCustomGet.mockReset().mockRejectedValue(failure);

    const { result } = renderHook(() => useCustomResource('practitionerDetails'), { wrapper });

    await waitFor(() => expect(result.current.error).toBe(failure));
  });
});
