import { PermissionGuard, useTranslation } from 'ohs-player-web-core';
import { useCallback, useMemo, type ReactNode } from 'react';
import { Page, PageHeader, Stack } from '../components/ui';
import {
  DashboardRows,
  RegionCards,
  type DashboardCard,
} from '../features/dashboard/DashboardRegions';
import { defaultLayout, type DashboardLayout } from '../features/dashboard/dashboardLayout';
import { useDashboardLayout } from '../features/dashboard/useDashboardLayout';
import { VisibleWidgets } from '../features/dashboard/VisibleWidgets';
import { useWidgetCatalogue, type WidgetDefinition } from '../features/dashboard/widgetCatalogue';
import type { DashboardRegion } from '../host/types';

interface DashboardViewProps {
  catalogue: readonly WidgetDefinition[];
  visible: readonly WidgetDefinition[];
}

function cardsIn(
  layout: DashboardLayout,
  region: DashboardRegion,
  visible: ReadonlyMap<string, WidgetDefinition>,
): DashboardCard[] {
  return layout[region].flatMap((id) => {
    const entry = visible.get(id);
    return entry ? [{ key: id, node: entry.render() }] : [];
  });
}

function DashboardView({ catalogue, visible }: Readonly<DashboardViewProps>): ReactNode {
  const { t } = useTranslation();
  const byId = useMemo(() => new Map(visible.map((entry) => [entry.id, entry])), [visible]);
  const isVisible = useCallback((id: string) => byId.has(id), [byId]);
  const defaults = useMemo(() => defaultLayout(visible), [visible]);
  const { layout } = useDashboardLayout({ catalogue, defaults, isVisible });
  const kpi = cardsIn(layout, 'kpi', byId);

  return (
    <Page>
      <PageHeader title={t('pageDashboard')} description={t('pageDashboardDescription')} />
      <PermissionGuard permission="dashboard.view">
        <Stack gap={5}>
          {kpi.length > 0 ? (
            <section aria-label={t('pageDashboard')} className="ohs-kpi-grid">
              <RegionCards cards={kpi} />
            </section>
          ) : null}
          <DashboardRows
            main={cardsIn(layout, 'main', byId)}
            side={cardsIn(layout, 'side', byId)}
          />
        </Stack>
      </PermissionGuard>
    </Page>
  );
}

export function DashboardPage(): ReactNode {
  const catalogue = useWidgetCatalogue();
  return (
    <VisibleWidgets catalogue={catalogue}>
      {(visible) => <DashboardView catalogue={catalogue} visible={visible} />}
    </VisibleWidgets>
  );
}
