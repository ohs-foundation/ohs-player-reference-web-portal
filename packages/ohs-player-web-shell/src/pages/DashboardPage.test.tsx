import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ExtensionWidget, PortalDashboardConfig } from 'ohs-player-web-core';
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
  Location: {
    entry: [
      { resource: { resourceType: 'Location', id: 'l1', name: 'Clinic A', status: 'active' } },
    ],
  },
  Organization: {
    entry: [
      {
        resource: {
          resourceType: 'Organization',
          id: 'o1',
          name: 'Ministry of Health',
          active: true,
        },
      },
    ],
  },
  CareTeam: { entry: [] },
};

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars?: Record<string, string | number>) =>
        vars ? [key, ...Object.values(vars)].join(' ') : key,
      dir: 'ltr',
      locale: 'en',
      formatNumber: (n: number) => String(n),
    }),
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
const { LAYOUT_STORAGE_PREFIX, LEGACY_KPI_STORAGE_PREFIX } =
  await import('../features/dashboard/useDashboardLayout');
const { DashboardPage } = await import('./DashboardPage');

const portalConfig = resolvePortalConfig(testPortalDefaults, {});
const KPI_LABELS = [
  'kpiTotalUsers',
  'kpiTotalLocations',
  'kpiTotalOrganizations',
  'kpiTotalCareTeams',
];

const LISTS = [
  'recentUsersTitle',
  'recentLocationsTitle',
  'recentOrganizationsTitle',
  'recentCareTeamsTitle',
];

function storeLayout(layout: { kpi?: string[]; main?: string[]; side?: string[] }): void {
  window.localStorage.setItem(
    `${LAYOUT_STORAGE_PREFIX}u1`,
    JSON.stringify({ version: 1, layout: { kpi: [], main: [], side: [], ...layout } }),
  );
}

function kpiLabels(container: HTMLElement): (string | null)[] {
  return [...container.querySelectorAll('.ohs-kpi__label')].map((label) => label.textContent);
}

function listTitles(container: HTMLElement): (string | null)[] {
  return [...container.querySelectorAll('.ohs-dash-card .ohs-card-header__title')].map(
    (title) => title.textContent,
  );
}

function renderPage(config = portalConfig) {
  return render(
    <MemoryRouter>
      <PortalConfigContext.Provider value={config}>
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

  it('opens with one level one heading and never skips a level below it', () => {
    renderPage();
    const levels = screen
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName.slice(1)));

    expect(levels[0]).toBe(1);
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels.every((level, i) => i === 0 || level <= levels[i - 1] + 1)).toBe(true);
  });

  it('has no critical a11y violations', async () => {
    const { container } = renderPage();
    await screen.findByText('Jane Smith');
    const result = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });
});

describe('DashboardPage layout', () => {
  it('shows four KPIs, four lists and four charts in catalogue order when nothing is stored', () => {
    const { container } = renderPage();

    expect(kpiLabels(container)).toEqual(KPI_LABELS);
    expect(listTitles(container)).toEqual(LISTS);
    expect(container.querySelectorAll('.ohs-dist-card')).toHaveLength(4);
    expect(container.querySelectorAll('.ohs-dash-row[data-side-only]')).toHaveLength(0);
  });

  it.each([
    [['kpi.careTeams'], ['kpiTotalCareTeams']],
    [
      ['kpi.organizations', 'kpi.users'],
      ['kpiTotalOrganizations', 'kpiTotalUsers'],
    ],
    [
      ['kpi.careTeams', 'kpi.locations', 'kpi.users'],
      ['kpiTotalCareTeams', 'kpiTotalLocations', 'kpiTotalUsers'],
    ],
  ])('renders the stored KPIs %j in stored order', (kpi, expected) => {
    storeLayout({ kpi });
    const { container } = renderPage();

    expect(kpiLabels(container)).toEqual(expected);
    expect(container.querySelectorAll('.ohs-kpi-grid > .ohs-kpi')).toHaveLength(expected.length);
  });

  it('renders stored lists and charts in stored order and drops the ones the user removed', () => {
    storeLayout({ main: ['recent.careTeams', 'recent.users'], side: ['chart.locationsByStatus'] });
    const { container } = renderPage();

    expect(listTitles(container)).toEqual(['recentCareTeamsTitle', 'recentUsersTitle']);
    expect(screen.getByText('distributionLocations')).toBeInTheDocument();
    expect(screen.queryByText('distributionUsers')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.ohs-dash-row')).toHaveLength(2);
  });

  it('hides the KPI row when the layout has no KPI, and keeps the rest of the dashboard', () => {
    storeLayout({ main: ['recent.users'] });
    const { container } = renderPage();

    expect(container.querySelector('.ohs-kpi-grid')).toBeNull();
    expect(screen.getByText('recentUsersTitle')).toBeInTheDocument();
  });

  it('trims an over-limit stored KPI list to four cards', () => {
    storeLayout({
      kpi: [
        'kpi.users',
        'kpi.locations',
        'kpi.organizations',
        'kpi.careTeams',
        'kpi.users',
        'bogus',
      ],
    });
    const { container } = renderPage();

    expect(container.querySelectorAll('.ohs-kpi-grid > .ohs-kpi')).toHaveLength(4);
  });

  it('hides every card of a screen whose flag is off', () => {
    flagsOff = new Set(['careTeams']);
    const { container } = renderPage();

    expect(kpiLabels(container)).not.toContain('kpiTotalCareTeams');
    expect(listTitles(container)).not.toContain('recentCareTeamsTitle');
    expect(screen.queryByText('distributionCareTeams')).not.toBeInTheDocument();
  });

  it('keeps a gated card in the stored layout, so it returns with its flag', () => {
    storeLayout({ kpi: ['kpi.careTeams', 'kpi.users'] });
    flagsOff = new Set(['careTeams']);
    const first = renderPage();
    expect(kpiLabels(first.container)).toEqual(['kpiTotalUsers']);
    first.unmount();

    flagsOff = new Set();
    const { container } = renderPage();
    expect(kpiLabels(container)).toEqual(['kpiTotalCareTeams', 'kpiTotalUsers']);
  });

  it('moves the old KPI selection into the layout and keeps the lists and charts', () => {
    window.localStorage.setItem(`${LEGACY_KPI_STORAGE_PREFIX}u1`, '["organizations","users"]');
    const { container } = renderPage();

    expect(kpiLabels(container)).toEqual(['kpiTotalOrganizations', 'kpiTotalUsers']);
    expect(listTitles(container)).toEqual(LISTS);
    expect(window.localStorage.getItem(`${LEGACY_KPI_STORAGE_PREFIX}u1`)).toBeNull();
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
});

function configure(): void {
  fireEvent.click(screen.getByRole('button', { name: 'dashboardConfigure' }));
}

async function openAddDrawer(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole('button', { name: 'dashboardAddWidget' }));
  return screen.findByRole('dialog');
}

function storedLayout(): unknown {
  const raw = window.localStorage.getItem(`${LAYOUT_STORAGE_PREFIX}u1`);
  return raw === null ? null : (JSON.parse(raw) as { layout: unknown }).layout;
}

describe('DashboardPage editor', () => {
  it('removes a card in configure mode and discards the change on Cancel', () => {
    const { container } = renderPage();
    configure();

    fireEvent.click(screen.getByRole('button', { name: 'widgetRemove recentUsersTitle' }));
    expect(listTitles(container)).toEqual(LISTS.slice(1));
    expect(screen.getByText('widgetRemoved recentUsersTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'dashboardAddWidget' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    expect(listTitles(container)).toEqual(LISTS);
    expect(screen.queryByRole('button', { name: /^widgetRemove/ })).not.toBeInTheDocument();
    expect(storedLayout()).toBeNull();
    expect(notify).not.toHaveBeenCalled();
  });

  it('moves focus into the edit bar on Configure and back to Configure on Save or Cancel', () => {
    renderPage();

    configure();
    expect(screen.getByRole('button', { name: 'dashboardAddWidget' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    expect(screen.getByRole('button', { name: 'dashboardConfigure' })).toHaveFocus();

    configure();
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(screen.getByRole('button', { name: 'dashboardConfigure' })).toHaveFocus();
  });

  it('moves a card with the keyboard, keeps focus on it and announces the new position', () => {
    const { container } = renderPage();
    configure();

    expect(screen.getByRole('button', { name: 'widgetMoveUp kpiTotalUsers' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'widgetMoveDown kpiTotalCareTeams' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'widgetMoveDown kpiTotalUsers' }));

    expect(kpiLabels(container)).toEqual([
      'kpiTotalLocations',
      'kpiTotalUsers',
      'kpiTotalOrganizations',
      'kpiTotalCareTeams',
    ]);
    expect(screen.getByRole('button', { name: 'widgetMoveDown kpiTotalUsers' })).toHaveFocus();
    expect(screen.getByText('widgetMoved kpiTotalUsers 2')).toBeInTheDocument();
  });

  it('moves a list into the next row and keeps focus on its control', () => {
    const { container } = renderPage();
    configure();

    fireEvent.click(screen.getByRole('button', { name: 'widgetMoveDown recentUsersTitle' }));

    expect(listTitles(container).slice(0, 2)).toEqual(['recentLocationsTitle', 'recentUsersTitle']);
    expect(screen.getByRole('button', { name: 'widgetMoveDown recentUsersTitle' })).toHaveFocus();
  });

  it('adds a removed card back from the drawer, saves it and keeps it after a reload', async () => {
    const first = renderPage();
    configure();
    fireEvent.click(screen.getByRole('button', { name: 'widgetRemove distributionUsers' }));
    fireEvent.click(screen.getByRole('button', { name: 'widgetRemove recentCareTeamsTitle' }));

    const drawer = await openAddDrawer();
    const option = within(drawer).getByRole('button', {
      name: 'widgetAddNamed recentCareTeamsTitle',
    });
    fireEvent.click(option);
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(
      within(drawer).getByText('widgetAddedAnnouncement recentCareTeamsTitle'),
    ).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'close' }));
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(notify).toHaveBeenCalledWith({ tone: 'success', title: 'dashboardSaved' });
    expect(storedLayout()).toMatchObject({
      main: ['recent.users', 'recent.locations', 'recent.organizations', 'recent.careTeams'],
      side: ['chart.locationsByStatus', 'chart.organizationsByStatus', 'chart.careTeamsByStatus'],
    });
    first.unmount();

    renderPage();
    expect(screen.queryByText('distributionUsers')).not.toBeInTheDocument();
    expect(screen.getByText('recentCareTeamsTitle')).toBeInTheDocument();
  });

  it('groups the drawer by category, marks starting and placed cards, and blocks a fifth KPI', async () => {
    renderPage();
    configure();
    fireEvent.click(screen.getByRole('button', { name: 'widgetRemove recentUsersTitle' }));

    const drawer = await openAddDrawer();
    expect(
      within(drawer)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['widgetCategoryKpi', 'widgetCategoryLists', 'widgetCategoryCharts']);
    expect(within(drawer).getAllByText('widgetStartingCard')).toHaveLength(12);
    expect(within(drawer).getAllByText('widgetAdded')).toHaveLength(11);
    expect(within(drawer).getByText('kpiPickerLimit 4')).toBeInTheDocument();

    const kpi = within(drawer).getByRole('button', { name: 'widgetAddNamed kpiTotalUsers' });
    expect(kpi).toHaveAttribute('aria-disabled', 'true');
    expect(
      within(drawer).getByRole('button', { name: 'widgetAddNamed recentUsersTitle' }),
    ).not.toHaveAttribute('aria-disabled');
  });

  it('frees a KPI place once a KPI is removed, and refuses a fifth card', async () => {
    const { container } = renderPage();
    configure();
    fireEvent.click(screen.getByRole('button', { name: 'widgetRemove kpiTotalLocations' }));

    const drawer = await openAddDrawer();
    expect(within(drawer).queryByText('kpiPickerLimit 4')).not.toBeInTheDocument();
    fireEvent.click(
      within(drawer).getByRole('button', { name: 'widgetAddNamed kpiTotalLocations' }),
    );
    fireEvent.click(
      within(drawer).getByRole('button', { name: 'widgetAddNamed kpiTotalLocations' }),
    );

    expect(within(drawer).getByText('kpiPickerLimit 4')).toBeInTheDocument();
    expect(container.querySelectorAll('.ohs-kpi-grid .ohs-kpi')).toHaveLength(4);
  });

  it('resets the draft to the default layout without saving', () => {
    storeLayout({ main: ['recent.users'] });
    const { container } = renderPage();
    configure();

    fireEvent.click(screen.getByRole('button', { name: 'dashboardReset' }));
    expect(kpiLabels(container)).toEqual(KPI_LABELS);
    expect(storedLayout()).toEqual({ kpi: [], main: ['recent.users'], side: [] });

    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(storedLayout()).toBeNull();
    expect(listTitles(container)).toEqual(LISTS);
  });

  it('shows an empty dashboard with an Add widget action when the layout is empty', async () => {
    storeLayout({});
    renderPage();

    expect(screen.getByText('dashboardEmptyTitle')).toBeInTheDocument();
    const drawer = await openAddDrawer();
    fireEvent.click(within(drawer).getByRole('button', { name: 'widgetAddNamed kpiTotalUsers' }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'close' }));

    expect(screen.queryByText('dashboardEmptyTitle')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'save' })).toBeInTheDocument();
  });

  it('has no critical a11y violations in configure mode, with the drawer open', async () => {
    renderPage();
    await screen.findByText('Jane Smith');
    configure();
    await openAddDrawer();

    const result = await axe(document.body, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });
});

function withDashboard(dashboard: PortalDashboardConfig) {
  return resolvePortalConfig(testPortalDefaults, { dashboard });
}

describe('DashboardPage document layout', () => {
  const curated = withDashboard({
    layout: {
      kpi: ['kpi.careTeams', 'kpi.users'],
      main: ['recent.organizations'],
      side: ['chart.usersByStatus'],
    },
  });

  it('renders the document layout in the listed order', () => {
    const { container } = renderPage(curated);

    expect(kpiLabels(container)).toEqual(['kpiTotalCareTeams', 'kpiTotalUsers']);
    expect(listTitles(container)).toEqual(['recentOrganizationsTitle']);
    expect(container.querySelectorAll('.ohs-dash-row')).toHaveLength(1);
    expect(screen.getByText('distributionUsers')).toBeInTheDocument();
  });

  it('skips a document card the session cannot see and shows it again with its flag', () => {
    flagsOff = new Set(['careTeams']);
    const first = renderPage(curated);
    expect(kpiLabels(first.container)).toEqual(['kpiTotalUsers']);
    first.unmount();

    flagsOff = new Set();
    expect(kpiLabels(renderPage(curated).container)).toEqual([
      'kpiTotalCareTeams',
      'kpiTotalUsers',
    ]);
  });

  it('marks the document cards as starting cards and resets to them', async () => {
    const { container } = renderPage(curated);
    configure();
    fireEvent.click(screen.getByRole('button', { name: 'widgetRemove kpiTotalUsers' }));

    const drawer = await openAddDrawer();
    expect(within(drawer).getAllByText('widgetStartingCard')).toHaveLength(4);
    fireEvent.click(within(drawer).getByRole('button', { name: 'close' }));

    fireEvent.click(screen.getByRole('button', { name: 'dashboardReset' }));
    expect(kpiLabels(container)).toEqual(['kpiTotalCareTeams', 'kpiTotalUsers']);
  });

  it('starts from a clean slate with an empty state and an Add widget action', async () => {
    const { container } = renderPage(withDashboard({ layout: {} }));

    expect(screen.getByText('dashboardEmptyTitle')).toBeInTheDocument();
    expect(screen.getByText('dashboardEmptyDescription')).toBeInTheDocument();
    expect(container.querySelector('.ohs-kpi-grid')).toBeNull();
    expect(container.querySelectorAll('.ohs-dash-row')).toHaveLength(0);

    const drawer = await openAddDrawer();
    expect(within(drawer).queryByText('widgetStartingCard')).not.toBeInTheDocument();
    fireEvent.click(
      within(drawer).getByRole('button', { name: 'widgetAddNamed recentUsersTitle' }),
    );
    fireEvent.click(within(drawer).getByRole('button', { name: 'close' }));
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(storedLayout()).toEqual({ kpi: [], main: ['recent.users'], side: [] });
    expect(listTitles(container)).toEqual(['recentUsersTitle']);
  });

  it('offers only the available cards, while a layout card outside them still renders', async () => {
    renderPage(
      withDashboard({
        layout: { kpi: ['kpi.users'], main: ['recent.users'] },
        available: ['chart.*', 'recent.locations'],
      }),
    );
    expect(screen.getByText('kpiTotalUsers')).toBeInTheDocument();

    configure();
    const drawer = await openAddDrawer();
    expect(
      within(drawer)
        .getAllByRole('button', { name: /^widgetAddNamed/ })
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      'widgetAddNamed recentLocationsTitle',
      'widgetAddNamed distributionUsers',
      'widgetAddNamed distributionLocations',
      'widgetAddNamed distributionOrganizations',
      'widgetAddNamed distributionCareTeams',
    ]);
  });

  it('trims a stored card the deployment no longer allows', () => {
    storeLayout({ kpi: ['kpi.locations'], main: ['recent.users', 'recent.careTeams'] });
    const { container } = renderPage(
      withDashboard({ layout: { main: ['recent.users'] }, available: ['chart.*'] }),
    );

    expect(kpiLabels(container)).toEqual([]);
    expect(listTitles(container)).toEqual(['recentUsersTitle']);
  });

  it('hides the editing controls and ignores a stored layout when customization is off', () => {
    storeLayout({ kpi: ['kpi.locations'] });
    const { container } = renderPage(
      withDashboard({ layout: { kpi: ['kpi.users'] }, userCustomization: false }),
    );

    expect(kpiLabels(container)).toEqual(['kpiTotalUsers']);
    expect(screen.queryByRole('button', { name: 'dashboardConfigure' })).not.toBeInTheDocument();
  });

  it('says the deployment set up an empty dashboard, with no action, when customization is off', () => {
    renderPage(withDashboard({ layout: {}, userCustomization: false }));

    expect(screen.getByText('dashboardEmptyLocked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'dashboardAddWidget' })).not.toBeInTheDocument();
  });

  it('has no critical a11y violations on a clean slate', async () => {
    const { container } = renderPage(withDashboard({ layout: {} }));

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

function renderWithWidgets(contributed: ExtensionWidget<DashboardRegion>[] = widgets) {
  return render(
    <MemoryRouter>
      <CorePlatformProvider config={testPlatformConfig}>
        <PortalConfigContext.Provider value={portalConfig}>
          <ExtensionsContext.Provider
            value={{ nav: [], routes: [], slots: [], questionnaires: {}, widgets: contributed }}
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
    flagsOff = new Set(['careTeams']);
    const { container } = renderWithWidgets();

    const kpi = container.querySelector('.ohs-kpi-grid') as HTMLElement;
    expect(await within(kpi).findByText('Reports KPI')).toBeInTheDocument();
    expect(kpi.lastElementChild).toHaveTextContent('Reports KPI');

    const rows = container.querySelectorAll<HTMLElement>('.ohs-dash-row');
    expect(rows).toHaveLength(4);
    expect(await within(rows[1]).findByText('Reports trend')).toBeInTheDocument();
    expect(within(rows[0]).getByText('recentUsersTitle')).toBeInTheDocument();
    expect(within(rows[2]).getByText('recentLocationsTitle')).toBeInTheDocument();
  });

  it('sorts extension KPI tiles in among the built-in cards and caps the strip at four', async () => {
    const { container } = renderWithWidgets([
      { id: 'practice.late', region: 'kpi', order: 50, load: loads(() => <p>Late KPI</p>) },
      { id: 'practice.early', region: 'kpi', order: 5, load: loads(() => <p>Early KPI</p>) },
    ]);

    const kpi = container.querySelector('.ohs-kpi-grid') as HTMLElement;
    expect(await within(kpi).findByText('Early KPI')).toBeInTheDocument();
    expect(kpi.firstElementChild).toHaveTextContent('Early KPI');
    expect(kpiLabels(container)).toEqual(KPI_LABELS.slice(0, 3));
    expect(within(kpi).queryByText('Late KPI')).not.toBeInTheDocument();
  });

  it('pairs main and side cards by position and gives a trailing side card a side-only row', async () => {
    const { container } = renderWithWidgets([
      { id: 'practice.main', region: 'main', order: 25, load: loads(() => <p>Paired main</p>) },
      { id: 'practice.side', region: 'side', order: 25, load: loads(() => <p>Paired side</p>) },
      { id: 'practice.lone', region: 'side', order: 50, load: loads(() => <p>Lone side</p>) },
    ]);

    const rows = container.querySelectorAll<HTMLElement>('.ohs-dash-row');
    expect(rows).toHaveLength(6);
    expect(await within(rows[2]).findByText('Paired main')).toBeInTheDocument();
    expect(await within(rows[2]).findByText('Paired side')).toBeInTheDocument();
    expect(rows[2]).not.toHaveAttribute('data-side-only');
    expect(await within(rows[5]).findByText('Lone side')).toBeInTheDocument();
    expect(rows[5]).toHaveAttribute('data-side-only');
    expect([...rows].filter((row) => row.hasAttribute('data-side-only'))).toEqual([rows[5]]);
  });

  it('pairs by position, so an unpaired main widget moves the side cards below it up a row', async () => {
    const { container } = renderWithWidgets([
      { id: 'practice.visits', region: 'main', order: 15, load: loads(() => <p>Visits</p>) },
    ]);

    const rows = container.querySelectorAll<HTMLElement>('.ohs-dash-row');
    expect(rows).toHaveLength(5);
    expect(await within(rows[1]).findByText('Visits')).toBeInTheDocument();
    expect(within(rows[1]).getByText('distributionLocations')).toBeInTheDocument();
    expect(within(rows[4]).getByText('recentCareTeamsTitle')).toBeInTheDocument();
    expect(within(rows[4]).queryByText(/^distribution/)).not.toBeInTheDocument();
  });

  it('shows a failed tile for a widget that throws while the rest of the dashboard renders', async () => {
    renderWithWidgets();

    expect(await screen.findByRole('alert')).toHaveTextContent('errorTitle');
    expect(screen.getByText('kpiTotalUsers')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(await screen.findByText('Reports trend')).toBeInTheDocument();
  });
});
