import type { ReactNode } from 'react';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
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

  it('lets the caller override the client retry policy', async () => {
    mockCustomGet.mockReset().mockRejectedValue(new Error('not found'));
    const retrying = new QueryClient({ defaultOptions: { queries: { retry: 2, retryDelay: 0 } } });
    const withRetries = ({ children }: { children: ReactNode }): React.ReactElement => (
      <QueryClientProvider client={retrying}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useCustomResource('practitionerDetails', undefined, { retry: false }),
      { wrapper: withRetries },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockCustomGet).toHaveBeenCalledTimes(1);
  });

  it('keeps the client retry policy when the caller sets none', async () => {
    mockCustomGet.mockReset().mockRejectedValue(new Error('gateway down'));
    const retrying = new QueryClient({ defaultOptions: { queries: { retry: 2, retryDelay: 0 } } });
    const withRetries = ({ children }: { children: ReactNode }): React.ReactElement => (
      <QueryClientProvider client={retrying}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCustomResource('practitionerDetails'), {
      wrapper: withRetries,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockCustomGet).toHaveBeenCalledTimes(3);
  });

  it('stays put on window focus when the caller turns focus refetches off', async () => {
    const { result } = renderHook(
      () =>
        useCustomResource('practitionerDetails', undefined, {
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => focusManager.setFocused(false));
    act(() => focusManager.setFocused(true));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    focusManager.setFocused(undefined);

    expect(mockCustomGet).toHaveBeenCalledTimes(1);
  });

  it('surfaces a rejected request as the query error', async () => {
    const failure = new Error('gateway down');
    mockCustomGet.mockReset().mockRejectedValue(failure);

    const { result } = renderHook(() => useCustomResource('practitionerDetails'), { wrapper });

    await waitFor(() => expect(result.current.error).toBe(failure));
  });
});
