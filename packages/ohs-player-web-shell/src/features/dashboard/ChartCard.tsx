import type { ReactNode } from 'react';
import { Card, EmptyState, ErrorState, Spinner } from '../../components/ui';

export interface ChartCardProps {
  title: string;
  loading: boolean;
  error?: string | null;
  /** Shows `emptyText` instead of the chart, such as when every value is zero. */
  empty: boolean;
  emptyText: string;
  children: ReactNode;
}

/** A titled dashboard card around one chart, with its loading, error and empty states. */
export function ChartCard({
  title,
  loading,
  error,
  empty,
  emptyText,
  children,
}: Readonly<ChartCardProps>): ReactNode {
  let body: ReactNode = children;
  if (error) body = <ErrorState description={error} />;
  else if (loading) body = <Spinner />;
  else if (empty) body = <EmptyState description={emptyText} />;

  return (
    <Card className="ohs-dist-card">
      <h3 className="ohs-card-header__title ohs-dist-card__title">{title}</h3>
      <div className="ohs-dist-card__body">{body}</div>
    </Card>
  );
}
