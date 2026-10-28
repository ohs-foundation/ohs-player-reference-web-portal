import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let denied = new Set<string>();

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useAuth: () => ({
      status: 'authenticated',
      user: { sub: 'u1', preferred_username: 'admin' },
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    }),
    usePermission: (permission: string) => ({ can: !denied.has(permission) }),
    PermissionGuard: ({
      permission,
      fallback = null,
      children,
    }: {
      permission: string;
      fallback?: ReactNode;
      children: ReactNode;
    }) => (denied.has(permission) ? fallback : children),
    useSearch: () => ({ data: undefined, isLoading: false, error: null }),
  };
});

vi.mock('./ConfigurationPage', () => ({
  ConfigurationPage: () => <h1>Configuration page</h1>,
}));

const { createPortalHost, PortalHost } = await import('ohs-player-web-shell');
const { appRoutes } = await import('../../AppRoutes');
const { portalDefaults } = await import('../../config/platform');

function renderAt(path: string, flags: Record<string, boolean> = {}) {
  window.history.pushState({}, '', path);
  const host = createPortalHost({
    defaults: portalDefaults,
    document: { flags },
    routes: appRoutes,
    development: true,
  });
  return render(<PortalHost host={host} />);
}

async function sidebarHrefs(): Promise<(string | null)[]> {
  const sidebar = await screen.findByLabelText('Primary navigation');
  return within(sidebar)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));
}

describe('the configuration route', () => {
  beforeEach(() => {
    denied = new Set();
    window.localStorage.setItem('ohs-theme', 'light');
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('opens the page and lists it last in the sidebar for an admin', async () => {
    renderAt('/configuration');

    expect(await screen.findByRole('heading', { name: 'Configuration page' })).toBeInTheDocument();
    expect((await sidebarHrefs()).at(-1)).toBe('/configuration');
  });

  it('reads as a missing page when the document turns configEditor off', async () => {
    renderAt('/configuration', { configEditor: false });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(await sidebarHrefs()).not.toContain('/configuration');
  });

  it('shows the no access page to a user without configuration.edit', async () => {
    denied = new Set(['configuration.edit']);
    renderAt('/configuration');

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeVisible();
    expect(screen.queryByText('Configuration page')).not.toBeInTheDocument();
    expect(await sidebarHrefs()).not.toContain('/configuration');
  });
});
