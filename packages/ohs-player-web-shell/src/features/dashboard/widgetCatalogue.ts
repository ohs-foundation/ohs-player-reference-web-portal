import type { ExtensionWidget } from 'ohs-player-web-core';
import { createElement, useMemo, type ComponentType, type ReactNode } from 'react';
import type { Requirement } from '../../auth/useRequirement';
import { usePortalConfig } from '../../config/portalConfigContext';
import type { NavEntry } from '../../config/navigation';
import { useExtensions } from '../../host/extensionsContext';
import type { DashboardRegion } from '../../host/types';
import {
  ActiveShare,
  RecentCareTeams,
  RecentLocations,
  RecentOrganizations,
  RecentUsers,
  StatusDistribution,
  UpdatedByMonth,
  type RecentWidgetProps,
} from './builtinWidgets';
import { ExtensionWidgetTile } from './ExtensionWidgetTile';
import { KpiCard } from './KpiCard';
import { gatedKpis, type GatedKpi, type KpiId } from './kpiCatalogue';

/** Ids of the dashboard cards the shell ships, for a configuration document's `dashboard` field. */
export const BUILTIN_WIDGET_IDS = [
  'kpi.users',
  'kpi.locations',
  'kpi.organizations',
  'kpi.careTeams',
  'recent.users',
  'recent.locations',
  'recent.organizations',
  'recent.careTeams',
  'chart.usersByStatus',
  'chart.locationsByStatus',
  'chart.organizationsByStatus',
  'chart.careTeamsByStatus',
  'chart.updatedByMonth.users',
  'chart.updatedByMonth.locations',
  'chart.updatedByMonth.organizations',
  'chart.updatedByMonth.careTeams',
  'chart.activeShare',
] as const;

/** One of the shell's own dashboard card ids. */
export type BuiltinWidgetId = (typeof BUILTIN_WIDGET_IDS)[number];

export type WidgetKind = 'kpi' | 'list' | 'chart';

/** One card the dashboard can show, built in or contributed by an extension. */
export interface WidgetDefinition {
  id: string;
  kind: WidgetKind;
  categoryKey: string;
  titleKey: string;
  regions: readonly DashboardRegion[];
  order: number;
  requires?: Requirement;
  /** Whether the derived default layout places this card. Cards without it are only added. */
  startsOnDashboard: boolean;
  render: () => ReactNode;
}

const CATEGORY_KEY: Readonly<Record<WidgetKind, string>> = {
  kpi: 'widgetCategoryKpi',
  list: 'widgetCategoryLists',
  chart: 'widgetCategoryCharts',
};

interface EntityCards {
  recent: ComponentType<RecentWidgetProps>;
  recentKeys: RecentWidgetProps;
  distributionTitleKey: string;
  monthlyTitleKey: string;
}

const ENTITY_CARDS: Readonly<Record<KpiId, EntityCards>> = {
  users: {
    recent: RecentUsers,
    recentKeys: { titleKey: 'recentUsersTitle', subtitleKey: 'recentUsersSubtitle' },
    distributionTitleKey: 'distributionUsers',
    monthlyTitleKey: 'chartUpdatedByMonthUsers',
  },
  locations: {
    recent: RecentLocations,
    recentKeys: { titleKey: 'recentLocationsTitle', subtitleKey: 'recentLocationsSubtitle' },
    distributionTitleKey: 'distributionLocations',
    monthlyTitleKey: 'chartUpdatedByMonthLocations',
  },
  organizations: {
    recent: RecentOrganizations,
    recentKeys: {
      titleKey: 'recentOrganizationsTitle',
      subtitleKey: 'recentOrganizationsSubtitle',
    },
    distributionTitleKey: 'distributionOrganizations',
    monthlyTitleKey: 'chartUpdatedByMonthOrganizations',
  },
  careTeams: {
    recent: RecentCareTeams,
    recentKeys: { titleKey: 'recentCareTeamsTitle', subtitleKey: 'recentCareTeamsSubtitle' },
    distributionTitleKey: 'distributionCareTeams',
    monthlyTitleKey: 'chartUpdatedByMonthCareTeams',
  },
};

function kpiWidget(kpi: GatedKpi): WidgetDefinition {
  return {
    id: `kpi.${kpi.id}`,
    kind: 'kpi',
    categoryKey: CATEGORY_KEY.kpi,
    titleKey: kpi.labelKey,
    regions: ['kpi'],
    order: kpi.order,
    requires: kpi.requires,
    startsOnDashboard: true,
    render: () => createElement(KpiCard, { kpi }),
  };
}

function recentWidget(kpi: GatedKpi): WidgetDefinition {
  const { recent, recentKeys } = ENTITY_CARDS[kpi.id];
  return {
    id: `recent.${kpi.id}`,
    kind: 'list',
    categoryKey: CATEGORY_KEY.list,
    titleKey: recentKeys.titleKey,
    regions: ['main'],
    order: kpi.order,
    requires: kpi.requires,
    startsOnDashboard: true,
    render: () => createElement(recent, recentKeys),
  };
}

function statusWidget(kpi: GatedKpi): WidgetDefinition {
  const titleKey = ENTITY_CARDS[kpi.id].distributionTitleKey;
  return {
    id: `chart.${kpi.id}ByStatus`,
    kind: 'chart',
    categoryKey: CATEGORY_KEY.chart,
    titleKey,
    regions: ['side'],
    order: kpi.order,
    requires: kpi.requires,
    startsOnDashboard: true,
    render: () => createElement(StatusDistribution, { kpi, titleKey }),
  };
}

function monthlyWidget(kpi: GatedKpi): WidgetDefinition {
  const titleKey = ENTITY_CARDS[kpi.id].monthlyTitleKey;
  return {
    id: `chart.updatedByMonth.${kpi.id}`,
    kind: 'chart',
    categoryKey: CATEGORY_KEY.chart,
    titleKey,
    regions: ['side'],
    order: kpi.order + 40,
    requires: kpi.requires,
    startsOnDashboard: false,
    render: () => createElement(UpdatedByMonth, { kpi, titleKey }),
  };
}

function activeShareWidget(kpis: readonly GatedKpi[]): WidgetDefinition {
  const byId = Object.fromEntries(kpis.map((kpi) => [kpi.id, kpi])) as Record<KpiId, GatedKpi>;
  const titleKey = 'chartActiveShare';
  return {
    id: 'chart.activeShare',
    kind: 'chart',
    categoryKey: CATEGORY_KEY.chart,
    titleKey,
    regions: ['side', 'main'],
    order: 90,
    startsOnDashboard: false,
    render: () => createElement(ActiveShare, { ...byId, titleKey }),
  };
}

/** The shell's own cards, each gated by its screen's nav entry in `navigation`. */
export function builtinWidgets(navigation: readonly NavEntry[]): WidgetDefinition[] {
  const kpis = gatedKpis(navigation);
  return [
    ...kpis.map(kpiWidget),
    ...kpis.map(recentWidget),
    ...kpis.map(statusWidget),
    ...kpis.map(monthlyWidget),
    activeShareWidget(kpis),
  ];
}

/** Namespaced extension widgets as catalogue entries, grouped under their `category` or manifest id. */
export function extensionWidgets(
  widgets: readonly ExtensionWidget<DashboardRegion>[],
): WidgetDefinition[] {
  return widgets.map((widget) => ({
    id: widget.id,
    kind: widget.region === 'kpi' ? 'kpi' : 'list',
    categoryKey: widget.category ?? widget.id.slice(0, widget.id.indexOf('.')),
    titleKey: widget.titleKey ?? widget.id,
    regions: [widget.region],
    order: widget.order,
    requires: widget.requires,
    startsOnDashboard: true,
    render: () => createElement(ExtensionWidgetTile, { widget }),
  }));
}

/** Every card this portal can show: the shell's own, then each installed extension's. */
export function useWidgetCatalogue(): readonly WidgetDefinition[] {
  const { navigation } = usePortalConfig();
  const { widgets } = useExtensions();
  return useMemo(
    () => [...builtinWidgets(navigation), ...extensionWidgets(widgets)],
    [navigation, widgets],
  );
}
