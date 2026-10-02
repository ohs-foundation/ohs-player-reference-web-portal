import { PermissionGuard, useStatusBar, useTranslation } from 'ohs-player-web-core';
import { Page, PageHeader, Stack } from '../components/ui';
import { KpiCard } from '../features/dashboard/KpiCard';
import { KpiPicker } from '../features/dashboard/KpiPicker';
import { VisibleKpis } from '../features/dashboard/VisibleKpis';
import { useDashboardKpis } from '../features/dashboard/useDashboardKpis';
import type { KpiDefinition, KpiId } from '../features/dashboard/kpiCatalogue';
import { builtinWidgets } from '../features/dashboard/widgetCatalogue';
import {
  DashboardRows,
  RegionItems,
  type RegionItem,
} from '../features/dashboard/DashboardRegions';
import { ExtensionWidgetTile } from '../features/dashboard/ExtensionWidgetTile';
import { usePortalConfig } from '../config/portalConfigContext';
import { useExtensions } from '../host/extensionsContext';
import type { DashboardRegion } from '../host/types';

export function DashboardPage(): React.ReactElement {
  const { t } = useTranslation();
  const { notify } = useStatusBar();
  const { widgets } = useExtensions();
  const { navigation } = usePortalConfig();
  const kpis = useDashboardKpis();
  const catalogue = builtinWidgets(navigation).filter((entry) => entry.kind !== 'kpi');

  const contributed = (region: DashboardRegion): RegionItem[] =>
    widgets
      .filter((widget) => widget.region === region)
      .map((widget) => ({
        key: widget.id,
        order: widget.order,
        node: <ExtensionWidgetTile widget={widget} />,
      }));

  const kpiItems = (available: readonly KpiDefinition[]): RegionItem[] => [
    ...available
      .filter((kpi) => kpis.selected.includes(kpi.id))
      .map((kpi) => ({ key: kpi.id, order: kpi.order, node: <KpiCard kpi={kpi} /> })),
    ...contributed('kpi'),
  ];

  const saveKpis = (ids: readonly KpiId[]): void => {
    kpis.save(ids);
    notify({ tone: 'success', title: t('kpiSaved') });
  };

  const builtin = (region: DashboardRegion): RegionItem[] =>
    catalogue
      .filter((entry) => entry.regions.includes(region))
      .map((entry) => ({ key: entry.id, order: entry.order, node: entry.render() }));

  const main = [...builtin('main'), ...contributed('main')];
  const side = [...builtin('side'), ...contributed('side')];

  return (
    <VisibleKpis>
      {(available) => {
        const kpi = kpiItems(available);
        return (
          <Page>
            <PageHeader
              title={t('pageDashboard')}
              description={t('pageDashboardDescription')}
              actions={
                <KpiPicker
                  options={available}
                  selected={kpis.selected}
                  max={kpis.max}
                  onSave={saveKpis}
                />
              }
            />
            <PermissionGuard permission="dashboard.view">
              <Stack gap={5}>
                {kpi.length > 0 ? (
                  <section aria-label={t('pageDashboard')} className="ohs-kpi-grid">
                    <RegionItems items={kpi} />
                  </section>
                ) : null}

                <DashboardRows main={main} side={side} />
              </Stack>
            </PermissionGuard>
          </Page>
        );
      }}
    </VisibleKpis>
  );
}
