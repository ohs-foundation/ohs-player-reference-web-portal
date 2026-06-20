import { Card, Spinner } from '../../components/ui';

export interface StatCardProps {
  label: string;
  value: number | undefined;
  loading: boolean;
  /** URL of the exported KPI icon tile (a self-contained 40×40 SVG carrying its own colour). */
  iconSrc: string;
}

/**
 * One KPI card: the exported icon tile, a label, and the live count. No trend row — the backend exposes
 * no prior-period figure to compute a delta against, so none is shown rather than fabricated.
 */
export function StatCard({ label, value, loading, iconSrc }: Readonly<StatCardProps>): React.ReactElement {
  return (
    <Card className="ohs-kpi">
      <img className="ohs-kpi__tile" src={iconSrc} alt="" width={40} height={40} />
      <div>
        <p className="ohs-kpi__label">{label}</p>
        <p className="ohs-kpi__value">{loading ? <Spinner /> : (value ?? '—')}</p>
      </div>
    </Card>
  );
}
