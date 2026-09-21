import { useTranslation } from 'ohs-player-web-core';
import { Card, KpiBadge, Spinner } from '../../components/ui';
import { IconArrowDownLeft, IconArrowUpRight, type IconComponent } from '../../components/ui/icons';

export interface StatCardProps {
  label: string;
  value: number | undefined;
  loading: boolean;
  badgeColor: string;
  glyph: IconComponent;
  /** Percentage change against the prior period. Omitted while no backend exposes one. */
  trendPercent?: number;
}

/** One KPI card: scalloped badge, label, live count, and — when a delta exists — a trend row. */
export function StatCard({
  label,
  value,
  loading,
  badgeColor,
  glyph,
  trendPercent,
}: Readonly<StatCardProps>): React.ReactElement {
  return (
    <Card className="ohs-kpi">
      <KpiBadge color={badgeColor} glyph={glyph} />
      <div className="ohs-kpi__text">
        <p className="ohs-kpi__label">{label}</p>
        <p className="ohs-kpi__value">{loading ? <Spinner /> : (value ?? '—')}</p>
        {trendPercent === undefined ? null : <StatTrend percent={trendPercent} />}
      </div>
    </Card>
  );
}

function StatTrend({ percent }: Readonly<{ percent: number }>): React.ReactElement {
  const { t } = useTranslation();
  const rising = percent >= 0;
  const Arrow = rising ? IconArrowUpRight : IconArrowDownLeft;

  return (
    <p className="ohs-kpi__trend" data-direction={rising ? 'up' : 'down'}>
      <Arrow size={18} aria-hidden="true" />
      {t(rising ? 'kpiTrendIncrease' : 'kpiTrendDecrease', { value: Math.abs(percent) })}
    </p>
  );
}
