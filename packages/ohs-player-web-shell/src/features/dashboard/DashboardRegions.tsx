import { Fragment, type ReactNode } from 'react';
import { pairRows } from './dashboardLayout';

export interface DashboardCard {
  key: string;
  node: ReactNode;
  /** Spans both columns in a row of its own. */
  full?: boolean;
}

export function RegionCards({ cards }: Readonly<{ cards: readonly DashboardCard[] }>): ReactNode {
  return cards.map((card) => <Fragment key={card.key}>{card.node}</Fragment>);
}

/** The main and side columns as rows, paired by position, with full width cards on their own. */
export function DashboardRows({
  main,
  side,
}: Readonly<{ main: readonly DashboardCard[]; side: readonly DashboardCard[] }>): ReactNode {
  return pairRows(main, side).map((row, index) => (
    <div
      key={index}
      className="ohs-dash-row"
      data-full={row.full ? true : undefined}
      data-side-only={!row.main && !row.full ? true : undefined}
    >
      <RegionCards cards={[row.main, row.side].filter((card) => card !== undefined)} />
    </div>
  ));
}
