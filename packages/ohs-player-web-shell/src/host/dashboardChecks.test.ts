import { describe, expect, it } from 'vitest';
import type { ResolvedDashboardConfig } from '../config/resolvePortalConfig';
import { checkDashboard, type DashboardWidgetShape } from './dashboardChecks';

const widgets: DashboardWidgetShape[] = [
  { id: 'kpi.users', regions: ['kpi'] },
  { id: 'recent.users', regions: ['main'] },
  { id: 'chart.usersByStatus', regions: ['side'] },
  { id: 'chart.activeShare', regions: ['side', 'main'] },
  { id: 'schedules.active', regions: ['kpi'] },
];

function check(dashboard: Partial<ResolvedDashboardConfig>) {
  return checkDashboard({ userCustomization: true, ...dashboard }, widgets);
}

const layout = (parts: { kpi?: string[]; main?: string[]; side?: string[] }) => ({
  kpi: [],
  main: [],
  side: [],
  ...parts,
});

describe('checkDashboard', () => {
  it('accepts built in and extension ids in a region their widget allows', () => {
    const dashboard = {
      layout: layout({ kpi: ['schedules.active', 'kpi.users'], main: ['chart.activeShare'] }),
      available: ['kpi.*', 'schedules.*', 'recent.users'],
    };

    expect(check(dashboard)).toEqual({
      dashboard: { userCustomization: true, ...dashboard },
      problems: [],
    });
  });

  it('names an unknown id with its path and the ids the portal knows, and drops it', () => {
    const result = check({ layout: layout({ main: ['recent.users', 'recent.visits'] }) });

    expect(result.dashboard.layout?.main).toEqual(['recent.users']);
    expect(result.problems).toEqual([
      'Configuration document: dashboard.layout.main[1] "recent.visits" is not a dashboard widget. Known ids: kpi.users, recent.users, chart.usersByStatus, chart.activeShare, schedules.active',
    ]);
  });

  it('drops an id placed in a region its widget does not allow', () => {
    const result = check({ layout: layout({ side: ['recent.users'] }) });

    expect(result.dashboard.layout?.side).toEqual([]);
    expect(result.problems).toEqual([
      'Configuration document: dashboard.layout.side[0] "recent.users" cannot sit in side, it belongs in main',
    ]);
  });

  it('keeps the first placement of an id listed twice and names the earlier one', () => {
    const result = check({
      layout: layout({ main: ['chart.activeShare'], side: ['chart.activeShare'] }),
    });

    expect(result.dashboard.layout).toEqual(layout({ main: ['chart.activeShare'] }));
    expect(result.problems).toEqual([
      'Configuration document: dashboard.layout.side[0] "chart.activeShare" is already placed at dashboard.layout.main[0]',
    ]);
  });

  it.each([
    ['nothing.*', 'matches no dashboard widget'],
    ['kpi.*.users', 'is not a widget id or a "<prefix>.*" pattern'],
    ['*', 'is not a widget id or a "<prefix>.*" pattern'],
    ['.*', 'is not a widget id or a "<prefix>.*" pattern'],
  ])('drops the available entry %s, which %s', (entry, problem) => {
    const result = check({ available: ['kpi.*', entry] });

    expect(result.dashboard.available).toEqual(['kpi.*']);
    expect(result.problems).toEqual([
      `Configuration document: dashboard.available[1] "${entry}" ${problem}`,
    ]);
  });

  it('drops an exact available id the portal does not know', () => {
    const result = check({ available: ['schedules.missing'] });

    expect(result.dashboard.available).toEqual([]);
    expect(result.problems[0]).toMatch(
      /^Configuration document: dashboard\.available\[0\] "schedules\.missing" is not a dashboard widget\./,
    );
  });
});
