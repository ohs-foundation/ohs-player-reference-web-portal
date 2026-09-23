import { fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const practitioners = {
  resourceType: 'Bundle',
  entry: [
    {
      resource: {
        resourceType: 'Practitioner',
        id: 'p1',
        name: [{ given: ['Jane'], family: 'Smith' }],
      },
    },
  ],
};

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
    useSearch: (resourceType: string | undefined, params?: Record<string, string>) => {
      if (params?._summary === 'count') {
        return { data: { total: 3 }, isLoading: false, error: null };
      }
      const data = resourceType === 'Practitioner' ? practitioners : { entry: [] };
      return { data, isLoading: false, error: null };
    },
  };
});

const { createPortalHost, PortalHost } = await import('ohs-player-web-shell');
const { appRoutes } = await import('./AppRoutes');
const { validatePortalConfig } = await import('./config/portalConfigSchema');
const { portalDefaults } = await import('./config/platform');
const { extensions } = await import('./extensions');

function exampleDocument() {
  const result = validatePortalConfig(
    JSON.parse(readFileSync('public/portal-config.json', 'utf8')) as unknown,
  );
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// Pages load through the real lazy route table; a cold CI runner can take over a second to import one.
const LAZY_PAGE = { timeout: 5000 };

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  const host = createPortalHost({
    defaults: portalDefaults,
    document: exampleDocument(),
    extensions,
    routes: appRoutes,
    development: true,
  });
  return render(<PortalHost host={host} />);
}

describe('the example portal with the schedules extension', () => {
  beforeEach(() => {
    window.localStorage.setItem('ohs-theme', 'light');
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('places the schedules entry between the users and dashboard entries by its order', async () => {
    renderAt('/users');

    const sidebar = await screen.findByLabelText('Primary navigation');
    const links = within(sidebar).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/users', '/schedules', '/']);
    expect(links.map((link) => link.textContent)).toEqual(['Users', 'Schedules', 'Dashboard']);
  });

  it('renders the active schedules widget in the KPI strip', async () => {
    renderAt('/');

    const kpiStrip = await screen.findByRole('region', { name: 'Dashboard' }, LAZY_PAGE);
    expect(await within(kpiStrip).findByText('Active Schedules')).toBeInTheDocument();
    expect(within(kpiStrip).getByText('Total Users')).toBeInTheDocument();
    expect(within(kpiStrip).queryByText('Total Locations')).not.toBeInTheDocument();
    expect(within(kpiStrip).getAllByText('3')).toHaveLength(2);
  });

  it("adds the schedules action to a users row's menu", async () => {
    renderAt('/users');

    const [trigger] = await screen.findAllByRole('button', { name: 'Row actions' }, LAZY_PAGE);
    fireEvent.keyDown(trigger, { key: 'Enter' });

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'View schedules' })).toBeInTheDocument();
  });
});
