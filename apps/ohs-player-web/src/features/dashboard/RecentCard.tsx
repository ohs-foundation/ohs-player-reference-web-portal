import { Link } from 'react-router-dom';
import { useTranslation } from 'ohs-player-web-core';
import {
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Spinner,
  type DataTableColumn,
} from '../../components/ui';

export interface RecentCardProps<Row> {
  title: string;
  subtitle: string;
  viewAllTo: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  loading: boolean;
  error?: string | null;
}

/** A "Recently Added X" card: header with a View All link, then a compact table of recent rows. */
export function RecentCard<Row>({
  title,
  subtitle,
  viewAllTo,
  columns,
  rows,
  rowKey,
  loading,
  error,
}: Readonly<RecentCardProps<Row>>): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="ohs-dash-card__head">
        <div>
          <h3 className="ohs-card-header__title">{title}</h3>
          <p className="ohs-card-header__description">{subtitle}</p>
        </div>
        <Link to={viewAllTo} className="ohs-dash-card__viewall">
          {t('viewAll')}
        </Link>
      </div>
      {error ? (
        <ErrorState description={error} />
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--ohs-spacing-6, 32px)' }}>
          <Spinner />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          emptyState={<EmptyState description={t('recentEmpty')} />}
        />
      )}
    </Card>
  );
}
