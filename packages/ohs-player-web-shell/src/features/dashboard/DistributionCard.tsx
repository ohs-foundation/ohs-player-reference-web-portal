import { useTranslation } from 'ohs-player-web-core';
import type { ReactNode } from 'react';
import { DonutChart, type DonutSegment } from '../../components/ui';
import { ChartCard } from './ChartCard';

export interface DistributionCardProps {
  title: string;
  segments: readonly DonutSegment[];
  loading: boolean;
  error?: string | null;
}

function pct(value: number, total: number): string {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';
}

/** A donut of Active vs Inactive counts with a percentage legend. Empty when the population is zero. */
export function DistributionCard({
  title,
  segments,
  loading,
  error,
}: Readonly<DistributionCardProps>): ReactNode {
  const { t } = useTranslation();
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <ChartCard
      title={title}
      loading={loading}
      error={error}
      empty={total === 0}
      emptyText={t('distributionEmpty')}
    >
      <DonutChart segments={segments} ariaLabel={title} />
      <div className="ohs-donut-legend">
        {segments.map((s) => (
          <div key={s.label} className="ohs-donut-legend__row">
            <span
              className="ohs-donut-legend__swatch"
              style={{ background: s.color }}
              aria-hidden="true"
            />
            <span>{s.label}</span>
            <span className="ohs-donut-legend__pct">{pct(s.value, total)}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
