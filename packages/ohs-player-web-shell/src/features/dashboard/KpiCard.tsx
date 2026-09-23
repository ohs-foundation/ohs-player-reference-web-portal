import { useTranslation } from 'ohs-player-web-core';
import type { KpiDefinition } from './kpiCatalogue';
import { StatCard } from './StatCard';
import { useResourceStats } from './useDashboardData';

export function KpiCard({ kpi }: Readonly<{ kpi: KpiDefinition }>): React.ReactElement {
  const { t } = useTranslation();
  const stats = useResourceStats(kpi.resourceType, kpi.activeParam);
  return (
    <StatCard
      label={t(kpi.labelKey)}
      value={stats.total}
      loading={stats.loading}
      badgeColor={kpi.badgeColor}
      glyph={kpi.glyph}
    />
  );
}
