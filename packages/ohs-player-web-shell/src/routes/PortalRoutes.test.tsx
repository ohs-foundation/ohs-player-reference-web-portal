import { act, render, screen } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PortalRoute } from './types';

let authStatus: 'authenticated' | 'unauthenticated' = 'authenticated';
let flagsOff = new Set<string>();
let deniedPermissions = new Set<string>();

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useAuth: () => ({
      status: authStatus,
      user: { sub: 'u1', preferred_username: 'admin' },
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    }),
    useFlag: (flag: string) => !flagsOff.has(flag),
    usePermission: (permission: string) => ({ can: !deniedPermissions.has(permission) }),
    useSearch: () => ({ data: undefined, isLoading: false, error: null }),
    FeatureGuard: ({ flag, children }: { flag: string; children: ReactNode }) =>
      flagsOff.has(flag) ? null : children,
    PermissionGuard: ({
      permission,
      fallback,
      children,
    }: {
      permission: string;
      fallback?: ReactNode;
      children: ReactNode;
    }) => (deniedPermissions.has(permission) ? (fallback ?? null) : children),
  };
});

const { CorePlatformProvider } = await import('ohs-player-web-core');
const { testPlatformConfig, testPortalDefaults } = await import('../test/testPlatformConfig');
const { PortalConfigContext } = await import('../config/portalConfigContext');
const { resolvePortalConfig } = await import('../config/resolvePortalConfig');
const { PortalRoutes } = await import('./PortalRoutes');

function GuardedPage(): React.ReactElement {
  return <h1>Guarded page</h1>;
}

const guardedRoute: PortalRoute = {
  id: 'guarded',
  path: '/guarded',
  load: () => Promise.resolve({ default: GuardedPage }),
  requires: { flag: 'guardedFlag', permission: 'guarded.view' },
  permissionFallback: <p>No access to the guarded page</p>,
};

function renderAt(path: string, routes: readonly PortalRoute[]) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CorePlatformProvider config={testPlatformConfig}>
        <PortalConfigContext.Provider value={resolvePortalConfig(testPortalDefaults)}>
          <PortalRoutes routes={routes} />
        </PortalConfigContext.Provider>
      </CorePlatformProvider>
    </MemoryRouter>,
  );
}

describe('PortalRoutes', () => {
  beforeEach(() => {
    authStatus = 'authenticated';
    flagsOff = new Set();
    deniedPermissions = new Set();
  });

  it('shows the loading fallback while a lazy page loads, then the page', async () => {
    let finishLoading: (module: { default: ComponentType }) => void = () => undefined;
    const pending = new Promise<{ default: ComponentType }>((resolve) => {
      finishLoading = resolve;
    });
    renderAt('/slow', [{ id: 'slow', path: '/slow', load: () => pending }]);

    expect(await screen.findByRole('status', { name: 'Loading…' })).toBeInTheDocument();
    expect(screen.queryByText('Slow page')).not.toBeInTheDocument();

    await act(async () => {
      finishLoading({ default: () => <h1>Slow page</h1> });
      await pending;
    });

    expect(await screen.findByText('Slow page')).toBeInTheDocument();
  });

  it('renders a permitted page under the portal frame', async () => {
    renderAt('/guarded', [guardedRoute]);

    expect(await screen.findByRole('heading', { name: 'Guarded page' })).toBeInTheDocument();
    expect(screen.getByLabelText('Primary navigation')).toBeInTheDocument();
  });

  it('renders nothing for a page whose flag is off', async () => {
    flagsOff = new Set(['guardedFlag']);
    renderAt('/guarded', [guardedRoute]);

    await screen.findByLabelText('Primary navigation');
    expect(screen.queryByText('Guarded page')).not.toBeInTheDocument();
    expect(screen.queryByText('No access to the guarded page')).not.toBeInTheDocument();
  });

  it("renders the route's fallback when its permission is denied", async () => {
    deniedPermissions = new Set(['guarded.view']);
    renderAt('/guarded', [guardedRoute]);

    expect(await screen.findByText('No access to the guarded page')).toBeInTheDocument();
    expect(screen.queryByText('Guarded page')).not.toBeInTheDocument();
  });

  it('sends a signed-out visitor to the sign-in page', async () => {
    authStatus = 'unauthenticated';
    renderAt('/guarded', [guardedRoute]);

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('Guarded page')).not.toBeInTheDocument();
  });
});
