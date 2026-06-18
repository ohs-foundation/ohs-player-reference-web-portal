import { Card, DonutChart, EmptyState, Spinner, type DonutSegment } from '../../components/ui';
import { useTranslation } from 'ohs-player-web-core';

export interface DistributionCardProps {
  title: string;
  segments: readonly DonutSegment[];
  loading: boolean;
}

function pct(value: number, total: number): string {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';
}

/** A donut of Active vs Inactive counts with a percentage legend. Empty when the population is zero. */
export function DistributionCard({ title, segments, loading }: Readonly<DistributionCardProps>): React.ReactElement {
  const { t } = useTranslation();
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card>
      <h3 className="ohs-card-header__title" style={{ marginBottom: 'var(--ohs-spacing-3, 12px)' }}>
        {title}
      </h3>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--ohs-spacing-6, 32px)' }}>
          <Spinner />
        </div>
      ) : total === 0 ? (
        <EmptyState description={t('distributionEmpty')} />
      ) : (
        <>
          <DonutChart segments={segments} ariaLabel={title} />
          <div className="ohs-donut-legend">
            {segments.map((s) => (
              <div key={s.label} className="ohs-donut-legend__row">
                <span className="ohs-donut-legend__swatch" style={{ background: s.color }} aria-hidden="true" />
                <span>{s.label}</span>
                <span className="ohs-donut-legend__pct">{pct(s.value, total)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
