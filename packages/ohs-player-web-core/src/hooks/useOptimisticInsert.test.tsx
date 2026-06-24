import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useOptimisticInsert } from './useFhirData';

interface Bundle {
  resourceType: 'Bundle';
  entry?: { resource?: { id?: string } }[];
  total?: number;
}

function setup() {
  const qc = new QueryClient();
  // Stub the background reconcile so tests assert the synchronous cache behavior deterministically.
  const refetchSpy = vi.spyOn(qc, 'refetchQueries').mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
  const { result } = renderHook(() => useOptimisticInsert(), { wrapper });
  return { qc, insert: result.current, refetchSpy };
}

const key = (params: Record<string, string>) => ['fhir', 'search', 'Organization', params];

describe('useOptimisticInsert', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('prepends the resource and bumps total across all param variants of the search cache', () => {
    const { qc, insert } = setup();
    qc.setQueryData<Bundle>(key({ _count: '200' }), {
      resourceType: 'Bundle',
      entry: [{ resource: { id: 'o1' } }],
      total: 1,
    });
    qc.setQueryData<Bundle>(key({ _count: '200', active: 'true' }), {
      resourceType: 'Bundle',
      entry: [{ resource: { id: 'o1' } }],
      total: 1,
    });

    insert('Organization', { id: 'new', name: 'New Org' });

    const variants: Record<string, string>[] = [{ _count: '200' }, { _count: '200', active: 'true' }];
    for (const params of variants) {
      const b = qc.getQueryData<Bundle>(key(params));
      expect(b?.entry?.[0].resource?.id).toBe('new'); // prepended
      expect(b?.total).toBe(2);
    }
  });

  it('does not duplicate when an entry with the same id is already present', () => {
    const { qc, insert } = setup();
    qc.setQueryData<Bundle>(key({ _count: '200' }), {
      resourceType: 'Bundle',
      entry: [{ resource: { id: 'new' } }],
      total: 1,
    });

    insert('Organization', { id: 'new', name: 'New Org' });

    const b = qc.getQueryData<Bundle>(key({ _count: '200' }));
    expect(b?.entry).toHaveLength(1);
    expect(b?.total).toBe(1);
  });

  it('rollback removes the inserted entry and decrements total', () => {
    const { qc, insert } = setup();
    qc.setQueryData<Bundle>(key({ _count: '200' }), {
      resourceType: 'Bundle',
      entry: [{ resource: { id: 'o1' } }],
      total: 1,
    });

    const rollback = insert('Organization', { id: 'new' });
    expect(qc.getQueryData<Bundle>(key({ _count: '200' }))?.entry).toHaveLength(2);

    rollback();
    const b = qc.getQueryData<Bundle>(key({ _count: '200' }));
    expect(b?.entry).toHaveLength(1);
    expect(b?.entry?.[0].resource?.id).toBe('o1');
    expect(b?.total).toBe(1);
  });

  it('re-applies the optimistic row if the background refetch returns without it (eventual consistency)', async () => {
    vi.useRealTimers();
    const { qc, insert, refetchSpy } = setup();
    qc.setQueryData<Bundle>(key({ _count: '200' }), { resourceType: 'Bundle', entry: [], total: 0 });
    // Simulate a refetch that lands a server list STILL missing the new row.
    refetchSpy.mockImplementation(() => {
      qc.setQueryData<Bundle>(key({ _count: '200' }), { resourceType: 'Bundle', entry: [], total: 0 });
      return Promise.resolve();
    });

    insert('Organization', { id: 'new' }, { reconcileDelayMs: 0 });
    expect(qc.getQueryData<Bundle>(key({ _count: '200' }))?.entry).toHaveLength(1); // optimistic

    await vi.waitFor(() => {
      // The refetch wiped it, but reconcile detected the absence and put it back.
      expect(qc.getQueryData<Bundle>(key({ _count: '200' }))?.entry?.[0].resource?.id).toBe('new');
    });
  });

  it('keeps re-applying across consecutive stale refetches, then stops once the server has the row', async () => {
    vi.useRealTimers();
    const { qc, insert, refetchSpy } = setup();
    qc.setQueryData<Bundle>(key({ _count: '200' }), { resourceType: 'Bundle', entry: [], total: 0 });
    // First 2 refetches return WITHOUT the row (lag); the 3rd returns WITH it (server now consistent).
    let calls = 0;
    refetchSpy.mockImplementation(() => {
      calls += 1;
      const entry = calls >= 3 ? [{ resource: { id: 'new' } }] : [];
      qc.setQueryData<Bundle>(key({ _count: '200' }), { resourceType: 'Bundle', entry, total: entry.length });
      return Promise.resolve();
    });

    insert('Organization', { id: 'new' }, { reconcileDelayMs: 5, reconcileMaxAttempts: 8 });

    await vi.waitFor(() => expect(calls).toBeGreaterThanOrEqual(3));
    // The row is present (from the server on attempt 3) and never vanished during attempts 1–2.
    await vi.waitFor(() =>
      expect(qc.getQueryData<Bundle>(key({ _count: '200' }))?.entry?.[0].resource?.id).toBe('new'),
    );
    // Polling stopped once present — give it room and confirm it doesn't keep hammering refetch.
    const after = calls;
    await new Promise((r) => setTimeout(r, 30));
    expect(calls).toBe(after);
  });

  it('gives up after reconcileMaxAttempts, leaving the optimistic row in place', async () => {
    vi.useRealTimers();
    const { qc, insert, refetchSpy } = setup();
    qc.setQueryData<Bundle>(key({ _count: '200' }), { resourceType: 'Bundle', entry: [], total: 0 });
    refetchSpy.mockImplementation(() => {
      qc.setQueryData<Bundle>(key({ _count: '200' }), { resourceType: 'Bundle', entry: [], total: 0 });
      return Promise.resolve();
    });

    insert('Organization', { id: 'new' }, { reconcileDelayMs: 2, reconcileMaxAttempts: 3 });

    await vi.waitFor(() => expect(refetchSpy).toHaveBeenCalledTimes(3));
    await new Promise((r) => setTimeout(r, 20));
    expect(refetchSpy).toHaveBeenCalledTimes(3); // capped
    // Row still visible despite the server never returning it.
    expect(qc.getQueryData<Bundle>(key({ _count: '200' }))?.entry?.[0].resource?.id).toBe('new');
  });

  it('rollback cancels the pending reconcile (no refetch after rollback)', async () => {
    vi.useRealTimers();
    const { qc, insert, refetchSpy } = setup();
    qc.setQueryData<Bundle>(key({ _count: '200' }), { resourceType: 'Bundle', entry: [], total: 0 });

    const rollback = insert('Organization', { id: 'new' }, { reconcileDelayMs: 10 });
    rollback();
    await new Promise((r) => setTimeout(r, 30));

    expect(refetchSpy).not.toHaveBeenCalled();
    expect(qc.getQueryData<Bundle>(key({ _count: '200' }))?.entry).toHaveLength(0);
  });

  it('is a no-op when the resource has no id', () => {
    const { qc, insert } = setup();
    qc.setQueryData<Bundle>(key({ _count: '200' }), { resourceType: 'Bundle', entry: [], total: 0 });
    const rollback = insert('Organization', {});
    rollback();
    expect(qc.getQueryData<Bundle>(key({ _count: '200' }))?.entry).toHaveLength(0);
  });
});
