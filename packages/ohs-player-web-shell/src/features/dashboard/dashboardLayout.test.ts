import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVIGATION } from '../../config/navigation';
import {
  addWidget,
  defaultLayout,
  EMPTY_LAYOUT,
  isAtKpiCap,
  moveWidget,
  removeWidget,
  sanitizeLayout,
  type DashboardLayout,
} from './dashboardLayout';
import { builtinWidgets, extensionWidgets } from './widgetCatalogue';

const load = () => Promise.resolve({ default: () => null });

const builtin = builtinWidgets(DEFAULT_NAVIGATION);
const schedules = extensionWidgets([{ id: 'schedules.active', region: 'kpi', order: 50, load }]);
const catalogue = [...builtin, ...schedules];

const FOUR_KPIS = ['kpi.users', 'kpi.locations', 'kpi.organizations', 'kpi.careTeams'];

const hidden =
  (...ids: string[]) =>
  (id: string) =>
    !ids.includes(id);

describe('defaultLayout', () => {
  it('places every built in card by order, as the dashboard has always shown them', () => {
    expect(defaultLayout(builtin)).toEqual({
      kpi: FOUR_KPIS,
      main: ['recent.users', 'recent.locations', 'recent.organizations', 'recent.careTeams'],
      side: [
        'chart.usersByStatus',
        'chart.locationsByStatus',
        'chart.organizationsByStatus',
        'chart.careTeamsByStatus',
      ],
    });
  });

  it('cuts the KPI strip to four, extension tiles included', () => {
    expect(defaultLayout(catalogue).kpi).toEqual(FOUR_KPIS);
  });

  it('sorts an extension tile in among the visible built in cards', () => {
    const visible = catalogue.filter((entry) =>
      ['kpi.users', 'schedules.active', 'recent.users'].includes(entry.id),
    );

    expect(defaultLayout(visible)).toEqual({
      kpi: ['kpi.users', 'schedules.active'],
      main: ['recent.users'],
      side: [],
    });
  });
});

describe('sanitizeLayout', () => {
  it.each([null, 'kpi', [], { kpi: [] }, { kpi: [], main: [], side: 'x' }])(
    'reads %j as no layout',
    (value) => {
      expect(sanitizeLayout(value, catalogue)).toBeUndefined();
    },
  );

  it('keeps an empty layout empty', () => {
    expect(sanitizeLayout(EMPTY_LAYOUT, catalogue)).toEqual(EMPTY_LAYOUT);
  });

  it('drops unknown ids, ids in a region their card does not allow, repeats and non strings', () => {
    const value = {
      kpi: ['kpi.users', 'recent.users', 7, 'kpi.users', 'gone.widget'],
      main: ['recent.users', 'kpi.locations'],
      side: ['chart.usersByStatus', 'recent.users'],
    };

    expect(sanitizeLayout(value, catalogue)).toEqual({
      kpi: ['kpi.users'],
      main: ['recent.users'],
      side: ['chart.usersByStatus'],
    });
  });

  it('keeps stored order', () => {
    const value = { kpi: ['schedules.active', 'kpi.careTeams'], main: [], side: [] };

    expect(sanitizeLayout(value, catalogue)?.kpi).toEqual(['schedules.active', 'kpi.careTeams']);
  });

  it('drops ids that fail allowed', () => {
    const value = { kpi: ['kpi.users', 'schedules.active'], main: [], side: [] };
    const allowed = (id: string) => id.startsWith('kpi.');

    expect(sanitizeLayout(value, catalogue, { allowed })?.kpi).toEqual(['kpi.users']);
  });

  it('cuts visible KPIs to four and keeps hidden ones without counting them', () => {
    const value = { kpi: ['kpi.careTeams', ...FOUR_KPIS, 'schedules.active'], main: [], side: [] };

    expect(sanitizeLayout(value, catalogue)?.kpi).toEqual([
      'kpi.careTeams',
      'kpi.users',
      'kpi.locations',
      'kpi.organizations',
    ]);
    expect(sanitizeLayout(value, catalogue, { isVisible: hidden('kpi.careTeams') })?.kpi).toEqual([
      'kpi.careTeams',
      ...FOUR_KPIS.slice(0, 3),
      'schedules.active',
    ]);
  });
});

describe('editing helpers', () => {
  const layout: DashboardLayout = {
    kpi: ['kpi.users', 'kpi.locations'],
    main: ['recent.users', 'recent.locations', 'recent.organizations'],
    side: ['chart.usersByStatus'],
  };

  it('adds a card at the end of its region', () => {
    expect(addWidget(layout, 'side', 'chart.careTeamsByStatus').side).toEqual([
      'chart.usersByStatus',
      'chart.careTeamsByStatus',
    ]);
  });

  it('does not add a card that is already placed', () => {
    expect(addWidget(layout, 'main', 'recent.users')).toBe(layout);
  });

  it('refuses a fifth visible KPI and counts extension tiles toward the cap', () => {
    const full = {
      ...layout,
      kpi: ['kpi.users', 'kpi.locations', 'kpi.careTeams', 'schedules.active'],
    };

    expect(isAtKpiCap(full)).toBe(true);
    expect(addWidget(full, 'kpi', 'kpi.organizations')).toBe(full);
  });

  it('does not count a hidden KPI toward the cap', () => {
    const full = {
      ...layout,
      kpi: ['kpi.users', 'kpi.locations', 'kpi.careTeams', 'schedules.active'],
    };
    const isVisible = hidden('kpi.careTeams');

    expect(isAtKpiCap(full, isVisible)).toBe(false);
    expect(addWidget(full, 'kpi', 'kpi.organizations', isVisible).kpi).toHaveLength(5);
  });

  it('removes a card from whichever region holds it', () => {
    expect(removeWidget(layout, 'recent.locations').main).toEqual([
      'recent.users',
      'recent.organizations',
    ]);
  });

  it('moves a card one place and stops at the edges', () => {
    expect(moveWidget(layout, 'recent.locations', -1).main).toEqual([
      'recent.locations',
      'recent.users',
      'recent.organizations',
    ]);
    expect(moveWidget(layout, 'recent.users', -1)).toBe(layout);
    expect(moveWidget(layout, 'recent.organizations', 1)).toBe(layout);
    expect(moveWidget(layout, 'not.placed', 1)).toBe(layout);
  });

  it('moves past a hidden card to the next visible one', () => {
    const isVisible = hidden('recent.locations');

    expect(moveWidget(layout, 'recent.users', 1, isVisible).main).toEqual([
      'recent.organizations',
      'recent.locations',
      'recent.users',
    ]);
    expect(moveWidget(layout, 'recent.organizations', 1, isVisible)).toBe(layout);
  });
});
