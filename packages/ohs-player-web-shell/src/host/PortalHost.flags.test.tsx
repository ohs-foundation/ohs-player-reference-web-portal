import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PortalDocument } from '../config/resolvePortalConfig';
import type { PortalRoute } from '../routes/types';

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
    usePermission: () => ({ can: true }),
    PermissionGuard: ({ children }: { children: ReactNode }) => children,
    useSearch: () => ({ data: undefined, isLoading: false, error: null }),
  };
});

const { testPortalDefaults } = await import('../test/testPlatformConfig');
const { createPortalHost } = await import('./createPortalHost');
const { PortalHost } = await import('./PortalHost');

function OrganizationsPage(): React.ReactElement {
  return <h1>Organisations page</h1>;
}

const organizations: PortalRoute = {
  id: 'organizations',
  path: '/organizations',
  load: () => Promise.resolve({ default: OrganizationsPage }),
  requires: { flag: 'orgMgmt', permission: 'orgs.view' },
};

function renderHostAt(path: string, document?: PortalDocument) {
  window.history.pushState({}, '', path);
  const host = createPortalHost({
    defaults: testPortalDefaults,
    document,
    routes: [organizations],
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

describe('PortalHost with a flag from the configuration document', () => {
  beforeEach(() => {
    window.localStorage.setItem('ohs-theme', 'light');
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('shows a flagged page and its sidebar entry while the build turns the flag on', async () => {
    renderHostAt('/organizations');

    expect(await screen.findByRole('heading', { name: 'Organisations page' })).toBeInTheDocument();
    expect(await sidebarHrefs()).toEqual(['/users', '/organizations']);
  });

  it('removes the page and its sidebar entry when the document turns the flag off', async () => {
    renderHostAt('/organizations', { flags: { orgMgmt: false } });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.queryByText('Organisations page')).not.toBeInTheDocument();
    expect(await sidebarHrefs()).toEqual(['/users']);
  });
});
