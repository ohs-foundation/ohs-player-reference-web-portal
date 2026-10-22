import { act, render, waitFor } from '@testing-library/react';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useAuth: () => ({ status: 'authenticated', user: { sub: 'admin-sub' } }),
  };
});

const { CorePlatformProvider } = await import('ohs-player-web-core');
const { platformConfig } = await import('../../config/platform');
const { ScopeProvider } = await import('./ScopeProvider');
const { useAdminScope } = await import('./useAdminScope');

const seen: { status: string; loadFailed: boolean }[] = [];

function Probe(): null {
  const { status, loadFailed } = useAdminScope();
  seen.push({ status, loadFailed });
  return null;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

let selfStatus = 404;
const fetchMock = vi.fn((input: RequestInfo | URL) => {
  if (urlOf(input).includes('practitioner-details')) {
    return new Promise<Response>((resolve) =>
      setTimeout(() => resolve(json({ error: 'No practitioner found' }, selfStatus)), 30),
    );
  }
  return Promise.resolve(json({ resourceType: 'Bundle', entry: [] }, 200));
});

const selfCalls = (): number =>
  fetchMock.mock.calls.filter(([input]) => urlOf(input).includes('practitioner-details')).length;

function renderProvider() {
  const onError = vi.fn();
  render(
    <CorePlatformProvider config={{ ...platformConfig, onError }}>
      <ScopeProvider>
        <Probe />
      </ScopeProvider>
    </CorePlatformProvider>,
  );
  return onError;
}

beforeEach(() => {
  seen.length = 0;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe('ScopeProvider against a gateway', () => {
  it('settles a user with no practitioner once and keeps the lists through focus and reconnect', async () => {
    selfStatus = 404;
    const onError = renderProvider();
    await waitFor(() => expect(seen.at(-1)?.status).toBe('unscoped'));
    const settled = seen.length;

    act(() => focusManager.setFocused(false));
    act(() => focusManager.setFocused(true));
    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)));

    expect(selfCalls()).toBe(1);
    expect(seen.slice(settled).map((s) => s.status)).not.toContain('loading');
    expect(seen.at(-1)).toEqual({ status: 'unscoped', loadFailed: false });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reports any other failure after one retry instead of holding the lists for seconds', async () => {
    selfStatus = 502;
    renderProvider();

    await waitFor(() => expect(seen.at(-1)).toEqual({ status: 'unscoped', loadFailed: true }), {
      timeout: 2500,
    });
    expect(selfCalls()).toBe(2);
  });
});
