import type { ResolvedDashboardConfig } from '../config/resolvePortalConfig';
import {
  allowedBy,
  isWidgetPattern,
  type DashboardLayout,
} from '../features/dashboard/dashboardLayout';
import type { DashboardRegion } from './types';

export interface DashboardWidgetShape {
  id: string;
  regions: readonly DashboardRegion[];
}

export interface DashboardCheck {
  dashboard: ResolvedDashboardConfig;
  problems: readonly string[];
}

const PREFIX = 'Configuration document: ';

function placementProblem(
  region: DashboardRegion,
  widget: DashboardWidgetShape | undefined,
  earlier: string | undefined,
  known: string,
): string | undefined {
  if (!widget) return `is not a dashboard widget. Known ids: ${known}`;
  if (earlier) return `is already placed at ${earlier}`;
  if (!widget.regions.includes(region)) {
    return `cannot sit in ${region}, it belongs in ${widget.regions.join(' or ')}`;
  }
  return undefined;
}

function availableProblem(
  entry: string,
  ids: readonly string[],
  known: string,
): string | undefined {
  const pattern = isWidgetPattern(entry);
  if (entry.slice(0, pattern ? -2 : undefined).includes('*') || entry === '.*') {
    return 'is not a widget id or a "<prefix>.*" pattern';
  }
  if (pattern) return ids.some(allowedBy([entry])) ? undefined : 'matches no dashboard widget';
  return ids.includes(entry) ? undefined : `is not a dashboard widget. Known ids: ${known}`;
}

/**
 * Checks the document's dashboard ids against the widgets this portal has, built in and
 * contributed, and drops each id that fails with a problem naming its path.
 */
export function checkDashboard(
  dashboard: ResolvedDashboardConfig,
  widgets: readonly DashboardWidgetShape[],
): DashboardCheck {
  const byId = new Map(widgets.map((widget) => [widget.id, widget]));
  const ids = widgets.map((widget) => widget.id);
  const known = ids.join(', ');
  const problems: string[] = [];
  const placedAt = new Map<string, string>();

  const checkRegion = (region: DashboardRegion, list: readonly string[]): string[] =>
    list.filter((id, index) => {
      const path = `dashboard.layout.${region}[${index}]`;
      const problem = placementProblem(region, byId.get(id), placedAt.get(id), known);
      if (problem) problems.push(`${PREFIX}${path} "${id}" ${problem}`);
      else placedAt.set(id, path);
      return !problem;
    });

  const { layout: source, available: entries } = dashboard;
  const layout: DashboardLayout | undefined = source && {
    kpi: checkRegion('kpi', source.kpi),
    main: checkRegion('main', source.main),
    side: checkRegion('side', source.side),
  };
  const available = entries?.filter((entry, index) => {
    const problem = availableProblem(entry, ids, known);
    if (problem) problems.push(`${PREFIX}dashboard.available[${index}] "${entry}" ${problem}`);
    return !problem;
  });

  return { dashboard: { ...dashboard, layout, available }, problems };
}
