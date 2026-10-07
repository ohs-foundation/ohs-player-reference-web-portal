import { Fragment, type ReactNode } from 'react';

export interface DashboardCard {
  key: string;
  node: ReactNode;
}

export function RegionCards({ cards }: Readonly<{ cards: readonly DashboardCard[] }>): ReactNode {
  return cards.map((card) => <Fragment key={card.key}>{card.node}</Fragment>);
}

/** One row per position, pairing `main[i]` with `side[i]`; a row with no main card is side only. */
export function DashboardRows({
  main,
  side,
}: Readonly<{ main: readonly DashboardCard[]; side: readonly DashboardCard[] }>): ReactNode {
  return Array.from({ length: Math.max(main.length, side.length) }, (_, index) => {
    const mainCard = main.at(index);
    const sideCard = side.at(index);
    return (
      <div key={index} className="ohs-dash-row" data-side-only={mainCard ? undefined : true}>
        <RegionCards cards={[mainCard, sideCard].filter((card) => card !== undefined)} />
      </div>
    );
  });
}
