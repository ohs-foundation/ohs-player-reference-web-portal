import type { ExtensionWidget } from 'ohs-player-web-core';
import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVIGATION, type NavEntry } from '../../config/navigation';
import type { DashboardRegion } from '../../host/types';
import { BUILTIN_WIDGET_IDS, builtinWidgets, extensionWidgets } from './widgetCatalogue';

const load = () => Promise.resolve({ default: () => null });

const entry = (navigation: readonly NavEntry[], id: string) =>
  builtinWidgets(navigation).find((widget) => widget.id === id);

describe('builtinWidgets', () => {
  it('lists every built in id once, KPIs then lists then charts', () => {
    expect(builtinWidgets(DEFAULT_NAVIGATION).map((widget) => widget.id)).toEqual([
      ...BUILTIN_WIDGET_IDS,
    ]);
  });

  it.each([
    ['kpi.locations', 'kpi', ['kpi'], 'widgetCategoryKpi', 'kpiTotalLocations'],
    ['recent.locations', 'list', ['main'], 'widgetCategoryLists', 'recentLocationsTitle'],
    ['chart.locationsByStatus', 'chart', ['side'], 'widgetCategoryCharts', 'distributionLocations'],
  ])('describes %s as a %s card for %j', (id, kind, regions, categoryKey, titleKey) => {
    expect(entry(DEFAULT_NAVIGATION, id)).toMatchObject({
      kind,
      regions,
      categoryKey,
      titleKey,
      order: 20,
    });
  });

  it('gates every card of an entity by its screen nav entry', () => {
    const requires = { flag: 'locationMgmt', permission: 'locations.view' };

    for (const id of ['kpi.locations', 'recent.locations', 'chart.locationsByStatus']) {
      expect(entry(DEFAULT_NAVIGATION, id)?.requires).toEqual(requires);
    }
  });

  it('follows a document that rewrites the nav entry', () => {
    const navigation = DEFAULT_NAVIGATION.map((nav) =>
      nav.id === 'users' ? { ...nav, requires: { flag: 'staff', permission: 'staff.view' } } : nav,
    );

    expect(entry(navigation, 'recent.users')?.requires).toEqual({
      flag: 'staff',
      permission: 'staff.view',
    });
  });
});

describe('chart entries', () => {
  it('lets the new charts be added without placing them on a default dashboard', () => {
    const added = builtinWidgets(DEFAULT_NAVIGATION).filter((widget) => !widget.startsOnDashboard);

    expect(added.map((widget) => [widget.id, widget.regions, widget.order])).toEqual([
      ['chart.updatedByMonth.users', ['side'], 50],
      ['chart.updatedByMonth.locations', ['side'], 60],
      ['chart.updatedByMonth.organizations', ['side'], 70],
      ['chart.updatedByMonth.careTeams', ['side'], 80],
      ['chart.activeShare', ['side', 'main'], 90],
    ]);
    expect(entry(DEFAULT_NAVIGATION, 'chart.updatedByMonth.users')?.requires).toEqual({
      flag: 'userMgmt',
      permission: 'users.view',
    });
    expect(entry(DEFAULT_NAVIGATION, 'chart.activeShare')?.requires).toBeUndefined();
  });
});

describe('extensionWidgets', () => {
  const widget = (overrides: Partial<ExtensionWidget<DashboardRegion>>) => ({
    id: 'schedules.active',
    region: 'kpi' as const,
    order: 50,
    load,
    ...overrides,
  });

  it('maps a namespaced widget to an entry in its region, grouped under its manifest', () => {
    const requires = { flag: 'schedules', permission: 'schedules.view' };
    const [mapped] = extensionWidgets([widget({ requires })]);

    expect(mapped).toMatchObject({
      id: 'schedules.active',
      kind: 'kpi',
      categoryKey: 'schedules',
      titleKey: 'schedules.active',
      regions: ['kpi'],
      order: 50,
      requires,
    });
  });

  it("takes the picker title and group from the widget's titleKey and category", () => {
    const [mapped] = extensionWidgets([
      widget({ titleKey: 'schedulesKpi', category: 'widgetCategorySchedules' }),
    ]);

    expect(mapped).toMatchObject({
      titleKey: 'schedulesKpi',
      categoryKey: 'widgetCategorySchedules',
    });
  });

  it('treats a main or side widget as a list card', () => {
    const mapped = extensionWidgets([
      widget({ id: 'practice.visits', region: 'main' }),
      widget({ id: 'practice.trend', region: 'side' }),
    ]);

    expect(mapped.map((entry) => [entry.kind, entry.regions])).toEqual([
      ['list', ['main']],
      ['list', ['side']],
    ]);
  });
});
