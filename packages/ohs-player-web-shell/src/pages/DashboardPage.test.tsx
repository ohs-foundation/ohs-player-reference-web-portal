import { render, screen, within } from '@testing-library/react';
import type { ExtensionWidget } from 'ohs-player-web-core';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardRegion } from '../host/types';

const counts: Record<string, { total: number; active: number }> = {
  Practitioner: { total: 10, active: 7 },
  Location: { total: 4, active: 3 },
  Organization: { total: 6, active: 6 },
  CareTeam: { total: 0, active: 0 },
};

const recent: Record<string, { entry: { resource: Record<string, unknown> }[] }> = {
  Practitioner: {
    entry: [
      {
        resource: {
          resourceType: 'Practitioner',
          id: 'p1',
          active: true,
          name: [{ family: 'Smith', given: ['Jane'] }],
          telecom: [{ system: 'email', value: 'jane@example.com' }],
        },
      },
    ],
  },
  Location: { entry: [{ resource: { resourceType: 'Location', id: 'l1', name: 'Clinic A', status: 'active' } }] },
  Organization: { entry: [{ resource: { resourceType: 'Organization', id: 'o1', name: 'Ministry of Health', active: true } }] },
  CareTeam: { entry: [] },
};

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
    PermissionGuard: ({ children }: { children: React.ReactNode }) => children,
    useSearch: (resourceType: string, params?: Record<string, string>) => {
      const isCount = params?._summary === 'count';
      let data: unknown;
      if (isCount) {
        const c = counts[resourceType];
        const isActive = params?.active === 'true' || params?.status === 'active';
        data = { total: isActive ? c.active : c.total };
      } else {
        data = recent[resourceType] ?? { entry: [] };
      }
      return { data, isLoading: false, error: null, refetch: vi.fn() };
    },
  };
});

const { CorePlatformProvider } = await import('ohs-player-web-core');
const { ExtensionsContext } = await import('../host/extensionsContext');
const { testPlatformConfig } = await import('../test/testPlatformConfig');
const { DashboardPage } = await import('./DashboardPage');

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DashboardPage', () => {
  it('renders KPI totals from FHIR counts', async () => {
    renderPage();
    const usersKpi = (await screen.findByText('kpiTotalUsers')).closest('.ohs-kpi') as HTMLElement;
    expect(within(usersKpi).getByText('10')).toBeInTheDocument();
    expect(screen.getByText('kpiTotalLocations')).toBeInTheDocument();
    expect(screen.getByText('kpiTotalOrganizations')).toBeInTheDocument();
    expect(screen.getByText('kpiTotalCareTeams')).toBeInTheDocument();
  });

  it('renders a recent user row with name and email', async () => {
    renderPage();
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('shows the empty distribution state when a population is zero', async () => {
    renderPage();
    // CareTeam total is 0 → its donut card renders the empty message instead of a chart.
    expect((await screen.findAllByText('distributionEmpty')).length).toBeGreaterThan(0);
  });

  it('has no critical a11y violations', async () => {
    const { container } = renderPage();
    await screen.findByText('Jane Smith');
    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });
});

function Broken(): React.ReactElement {
  throw new Error('widget exploded');
}

const loads = (component: ComponentType) => () => Promise.resolve({ default: component });

const widgets: ExtensionWidget<DashboardRegion>[] = [
  { id: 'reports.count', region: 'kpi', order: 50, load: loads(() => <p>Reports KPI</p>) },
  { id: 'reports.broken', region: 'main', order: 15, load: loads(Broken) },
  { id: 'reports.trend', region: 'side', order: 15, load: loads(() => <p>Reports trend</p>) },
];

function renderWithWidgets() {
  return render(
    <MemoryRouter>
      <CorePlatformProvider config={testPlatformConfig}>
        <ExtensionsContext.Provider
          value={{ nav: [], routes: [], slots: [], questionnaires: {}, widgets }}
        >
          <DashboardPage />
        </ExtensionsContext.Provider>
      </CorePlatformProvider>
    </MemoryRouter>,
  );
}

describe('DashboardPage regions', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders contributed widgets in their declared region, sorted by order', async () => {
    const { container } = renderWithWidgets();

    const kpi = container.querySelector('.ohs-kpi-grid') as HTMLElement;
    expect(await within(kpi).findByText('Reports KPI')).toBeInTheDocument();
    expect(kpi.lastElementChild).toHaveTextContent('Reports KPI');

    const rows = container.querySelectorAll<HTMLElement>('.ohs-dash-row');
    expect(rows).toHaveLength(5);
    expect(await within(rows[1]).findByText('Reports trend')).toBeInTheDocument();
    expect(within(rows[0]).getByText('recentUsersTitle')).toBeInTheDocument();
    expect(within(rows[2]).getByText('recentLocationsTitle')).toBeInTheDocument();
  });

  it('shows a failed tile for a widget that throws while the rest of the dashboard renders', async () => {
    renderWithWidgets();

    expect(await screen.findByRole('alert')).toHaveTextContent('errorTitle');
    expect(screen.getByText('kpiTotalUsers')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(await screen.findByText('Reports trend')).toBeInTheDocument();
  });
});
