import { type ReactNode } from 'react';
import { Card, Spinner } from '../../components/ui';

export interface StatCardProps {
  label: string;
  value: number | undefined;
  loading: boolean;
  icon: ReactNode;
  /** Accent index 1–4 → `--ohs-accent-{n}` token pair for the icon tile. */
  accent: 1 | 2 | 3 | 4;
}

/**
 * One KPI card: an accent icon tile, a label, and the live count. No trend row — the backend exposes
 * no prior-period figure to compute a delta against, so none is shown rather than fabricated.
 */
export function StatCard({ label, value, loading, icon, accent }: Readonly<StatCardProps>): React.ReactElement {
  return (
    <Card className="ohs-kpi">
      <span
        className="ohs-kpi__tile"
        aria-hidden="true"
        style={{
          background: `var(--ohs-accent-${accent}-surface)`,
          color: `var(--ohs-accent-${accent})`,
        }}
      >
        {icon}
      </span>
      <div>
        <p className="ohs-kpi__label">{label}</p>
        <p className="ohs-kpi__value">{loading ? <Spinner /> : (value ?? '—')}</p>
      </div>
    </Card>
  );
}
