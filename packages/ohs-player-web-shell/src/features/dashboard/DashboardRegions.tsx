import { Fragment, type ReactNode } from 'react';

export interface RegionItem {
  key: string;
  order: number;
  node: ReactNode;
}

export function RegionItems({ items }: Readonly<{ items: readonly RegionItem[] }>): ReactNode {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item) => <Fragment key={item.key}>{item.node}</Fragment>);
}

export function DashboardRows({
  main,
  side,
}: Readonly<{ main: readonly RegionItem[]; side: readonly RegionItem[] }>): ReactNode {
  const orders = [...new Set([...main, ...side].map((item) => item.order))].sort((a, b) => a - b);
  return orders.map((order) => {
    const mainItems = main.filter((item) => item.order === order);
    const sideItems = side.filter((item) => item.order === order);
    return (
      <div
        key={order}
        className="ohs-dash-row"
        data-side-only={mainItems.length === 0 ? true : undefined}
      >
        <RegionItems items={mainItems} />
        <RegionItems items={sideItems} />
      </div>
    );
  });
}
