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

const auditEvents = {
  resourceType: 'Bundle',
  entry: [
    {
      resource: {
        resourceType: 'AuditEvent',
        id: 'ae1',
        action: 'C',
        recorded: '2026-09-30T08:00:00.000Z',
        agent: [{ requestor: true, who: { display: 'admin' } }],
        entity: [{ what: { reference: 'Practitioner/p1' } }],
      },
    },
  ],
};

const searchResults: Record<string, unknown> = {
  Practitioner: practitioners,
  AuditEvent: auditEvents,
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
      const data = (resourceType && searchResults[resourceType]) ?? { entry: [] };
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
    window.localStorage.clear();
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

  it('renders the curated KPI strip from the document, schedules first', async () => {
    renderAt('/');

    const kpiStrip = await screen.findByRole('region', { name: 'Dashboard' }, LAZY_PAGE);
    expect(await within(kpiStrip).findByText('Active Schedules')).toBeInTheDocument();
    expect(within(kpiStrip).getByText('Total Users')).toBeInTheDocument();
    expect(within(kpiStrip).queryByText('Total Locations')).not.toBeInTheDocument();
    expect(within(kpiStrip).getAllByText('3')).toHaveLength(2);
    expect(kpiStrip.firstElementChild).toHaveTextContent('Active Schedules');
  });

  it('shows only the users table and the users donut below the strip', async () => {
    const { container } = renderAt('/');

    expect(await screen.findByText('Recently Added Users', {}, LAZY_PAGE)).toBeInTheDocument();
    expect(screen.getByText('User Distribution')).toBeInTheDocument();
    expect(screen.queryByText('Recently Added Locations')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.ohs-dash-row')).toHaveLength(1);
  });

  it('removes the schedules tile and adds it back from its own group in the picker', async () => {
    renderAt('/');
    const kpiStrip = await screen.findByRole('region', { name: 'Dashboard' }, LAZY_PAGE);
    await within(kpiStrip).findByText('Active Schedules');

    fireEvent.click(screen.getByRole('button', { name: 'Configure dashboard' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Active Schedules' }));
    expect(within(kpiStrip).queryByText('Active Schedules')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByRole('heading', { name: 'Schedules' })).toBeInTheDocument();
    expect(within(drawer).queryByText('Recently Added Locations')).not.toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add Active Schedules' }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await within(kpiStrip).findByText('Active Schedules')).toBeInTheDocument();
    expect(kpiStrip.lastElementChild).toHaveTextContent('Active Schedules');
  });

  it("adds the schedules action to a users row's menu", async () => {
    renderAt('/users');

    const [trigger] = await screen.findAllByRole('button', { name: 'Row actions' }, LAZY_PAGE);
    fireEvent.keyDown(trigger, { key: 'Enter' });

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'View schedules' })).toBeInTheDocument();
  });

  it('describes an activity in the notifications panel through the catalogue, with no raw key', async () => {
    renderAt('/users');

    fireEvent.keyDown(await screen.findByRole('button', { name: 'Notifications' }), {
      key: 'Enter',
    });

    const panel = await screen.findByRole('menu');
    expect(within(panel).getByText('Created User p1')).toBeInTheDocument();
    expect(within(panel).queryAllByText(/\b(activity|resourceType)[A-Z]/)).toEqual([]);
  });
});
