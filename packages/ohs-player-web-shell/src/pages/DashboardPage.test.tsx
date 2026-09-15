import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
