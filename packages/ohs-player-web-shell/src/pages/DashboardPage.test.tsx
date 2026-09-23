import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ExtensionWidget } from 'ohs-player-web-core';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardRegion } from '../host/types';

let flagsOff = new Set<string>();
let failingCounts = new Set<string>();
let loadingCounts = new Set<string>();
const notify = vi.fn();

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
    useAuth: () => ({ status: 'authenticated', user: { sub: 'u1' } }),
    useFlag: (flag: string) => !flagsOff.has(flag),
    usePermission: () => ({ can: true }),
    useStatusBar: () => ({ notify, saving: vi.fn() }),
    PermissionGuard: ({ children }: { children: React.ReactNode }) => children,
    useSearch: (resourceType: string, params?: Record<string, string>) => {
      const isCount = params?._summary === 'count';
      if (isCount && failingCounts.has(resourceType)) {
        return { data: undefined, isLoading: false, error: new Error('down'), refetch: vi.fn() };
      }
      if (isCount && loadingCounts.has(resourceType)) {
        return { data: undefined, isLoading: true, error: null, refetch: vi.fn() };
      }
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
const { testPlatformConfig, testPortalDefaults } = await import('../test/testPlatformConfig');
const { PortalConfigContext } = await import('../config/portalConfigContext');
const { resolvePortalConfig } = await import('../config/resolvePortalConfig');
const { KPI_STORAGE_PREFIX } = await import('../features/dashboard/useDashboardKpis');
const { DashboardPage } = await import('./DashboardPage');

const portalConfig = resolvePortalConfig(testPortalDefaults, {});
const KPI_LABELS = ['kpiTotalUsers', 'kpiTotalLocations', 'kpiTotalOrganizations', 'kpiTotalCareTeams'];

function storeKpis(ids: string[]): void {
  window.localStorage.setItem(`${KPI_STORAGE_PREFIX}u1`, JSON.stringify(ids));
}

function kpiLabels(container: HTMLElement): (string | null)[] {
  return [...container.querySelectorAll('.ohs-kpi__label')].map((label) => label.textContent);
}

async function openPicker(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole('button', { name: 'kpiCustomize' }));
  return screen.findByRole('dialog');
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PortalConfigContext.Provider value={portalConfig}>
        <DashboardPage />
      </PortalConfigContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  flagsOff = new Set();
  failingCounts = new Set();
  loadingCounts = new Set();
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

describe('DashboardPage KPI selection', () => {
  it('shows all four KPIs in catalogue order when nothing is stored', () => {
    const { container } = renderPage();

    expect(kpiLabels(container)).toEqual(KPI_LABELS);
  });

  it.each([
    [['careTeams'], ['kpiTotalCareTeams']],
    [['organizations', 'users'], ['kpiTotalUsers', 'kpiTotalOrganizations']],
    [['careTeams', 'locations', 'users'], ['kpiTotalUsers', 'kpiTotalLocations', 'kpiTotalCareTeams']],
    [['careTeams', 'organizations', 'locations', 'users'], KPI_LABELS],
  ])('renders the stored selection %j in catalogue order', (stored, expected) => {
    storeKpis(stored);
    const { container } = renderPage();

    expect(kpiLabels(container)).toEqual(expected);
    expect(container.querySelectorAll('.ohs-kpi-grid > .ohs-kpi')).toHaveLength(expected.length);
  });

  it('hides the KPI row when nothing is selected, and keeps the rest of the dashboard', () => {
    storeKpis([]);
    const { container } = renderPage();

    expect(container.querySelector('.ohs-kpi-grid')).toBeNull();
    expect(screen.getByText('recentUsersTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'kpiCustomize' })).toBeInTheDocument();
  });

  it('trims an over-limit stored selection to four cards', () => {
    storeKpis(['users', 'locations', 'organizations', 'careTeams', 'users', 'bogus']);
    const { container } = renderPage();

    expect(container.querySelectorAll('.ohs-kpi-grid > .ohs-kpi')).toHaveLength(4);
  });

  it('hides a KPI from the row and the picker when its screen flag is off', async () => {
    flagsOff = new Set(['careTeams']);
    const { container } = renderPage();

    expect(kpiLabels(container)).not.toContain('kpiTotalCareTeams');
    const panel = await openPicker();
    expect(within(panel).queryByText('navCareTeams')).not.toBeInTheDocument();
    expect(within(panel).queryByText('kpiPickerLimit')).not.toBeInTheDocument();
  });

  it('applies a saved selection, persists it across a reload and reports success', async () => {
    const first = renderPage();
    const panel = await openPicker();

    fireEvent.click(within(panel).getByRole('checkbox', { name: 'navUsers' }));
    fireEvent.click(within(panel).getByRole('checkbox', { name: 'navLocations' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'save' }));

    expect(notify).toHaveBeenCalledWith({ tone: 'success', title: 'kpiSaved' });
    expect(kpiLabels(first.container)).toEqual(['kpiTotalOrganizations', 'kpiTotalCareTeams']);

    first.unmount();
    const { container } = renderPage();
    expect(kpiLabels(container)).toEqual(['kpiTotalOrganizations', 'kpiTotalCareTeams']);
  });

  it('keeps a gated KPI selected through a save, so it returns with its flag', async () => {
    flagsOff = new Set(['careTeams']);
    const first = renderPage();
    const panel = await openPicker();

    fireEvent.click(within(panel).getByRole('checkbox', { name: 'navUsers' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'save' }));
    first.unmount();

    flagsOff = new Set();
    const { container } = renderPage();
    expect(kpiLabels(container)).toEqual([
      'kpiTotalLocations',
      'kpiTotalOrganizations',
      'kpiTotalCareTeams',
    ]);
  });

  it('keeps the row unchanged when the picker is cancelled', async () => {
    const { container } = renderPage();
    const panel = await openPicker();

    fireEvent.click(within(panel).getByRole('checkbox', { name: 'navUsers' }));
    fireEvent.click(within(panel).getByRole('button', { name: 'cancel' }));

    expect(kpiLabels(container)).toEqual(KPI_LABELS);
    expect(notify).not.toHaveBeenCalled();
  });

  it('shows a spinner while a count loads and a dash when it fails', () => {
    loadingCounts = new Set(['Practitioner']);
    failingCounts = new Set(['Location']);
    renderPage();

    const users = screen.getByText('kpiTotalUsers').closest('.ohs-kpi') as HTMLElement;
    const locations = screen.getByText('kpiTotalLocations').closest('.ohs-kpi') as HTMLElement;
    expect(within(users).getByRole('status')).toBeInTheDocument();
    expect(within(locations).getByText('—')).toBeInTheDocument();
  });

  it('has no critical a11y violations with the picker open', async () => {
    renderPage();
    await screen.findByText('Jane Smith');
    await openPicker();

    const result = await axe(document.body, { rules: { 'color-contrast': { enabled: false } } });
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
        <PortalConfigContext.Provider value={portalConfig}>
          <ExtensionsContext.Provider
            value={{ nav: [], routes: [], slots: [], questionnaires: {}, widgets }}
          >
            <DashboardPage />
          </ExtensionsContext.Provider>
        </PortalConfigContext.Provider>
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
