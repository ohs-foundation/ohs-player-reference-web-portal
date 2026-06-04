import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'ohs-player-web-core';
import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import { Checkbox } from './Checkbox';

export interface DataTableColumn<Row> {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  sortable?: boolean;
  sortValue?: (row: Row) => string | number;
}

export interface DataTableProps<Row> {
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  loading?: boolean;
  emptyState?: ReactNode;
  errorState?: ReactNode;
  caption?: ReactNode;
  /** Optional content rendered inside the table container, above the table (e.g. search + filter). */
  toolbar?: ReactNode;
  selectable?: boolean;
  selectedKeys?: ReadonlySet<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /** Row click handler (e.g. open a details drawer). The select + actions cells stop propagation. */
  onRowClick?: (row: Row) => void;
  /** Enable client-side pagination + footer. */
  pagination?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: readonly number[];
}

type SortDir = 'asc' | 'desc';

function SortIcon({ dir }: Readonly<{ dir?: SortDir }>): React.ReactElement {
  if (!dir) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.35, flexShrink: 0 }}>
        <polyline points="8 15 12 19 16 15" />
        <polyline points="8 9 12 5 16 9" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {dir === 'asc'
        ? <polyline points="8 9 12 5 16 9" />
        : <polyline points="8 15 12 19 16 15" />}
    </svg>
  );
}

function pageWindow(page: number, totalPages: number): number[] {
  const size = Math.min(5, totalPages);
  let start = Math.max(1, page - Math.floor(size / 2));
  start = Math.min(start, Math.max(1, totalPages - size + 1));
  return Array.from({ length: size }, (_, i) => start + i);
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  loading,
  emptyState,
  errorState,
  caption,
  toolbar,
  selectable,
  selectedKeys,
  onSelectionChange,
  onRowClick,
  pagination,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
}: Readonly<DataTableProps<Row>>): React.ReactElement {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, columns]);

  const total = sortedRows.length;
  const totalPages = pagination ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const visibleRows = useMemo(() => {
    if (!pagination) return sortedRows;
    const sliceStart = (page - 1) * pageSize;
    return sortedRows.slice(sliceStart, sliceStart + pageSize);
  }, [pagination, sortedRows, page, pageSize]);

  const handleSortClick = (key: string): void => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const allKeys = useMemo(() => new Set(rows.map(rowKey)), [rows, rowKey]);
  const isAllSelected = selectedKeys != null && allKeys.size > 0 && allKeys.size === selectedKeys.size;
  const isSomeSelected = selectedKeys != null && selectedKeys.size > 0 && !isAllSelected;

  const toggleAll = (): void => {
    if (!onSelectionChange) return;
    // Any existing selection (all or indeterminate) clears; only an empty selection selects all.
    const hasSelection = (selectedKeys?.size ?? 0) > 0;
    onSelectionChange(hasSelection ? new Set() : new Set(allKeys));
  };

  const toggleRow = (key: string): void => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  const showEmpty = !loading && rows.length === 0 && Boolean(emptyState);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="ohs-table-wrapper">
      {toolbar ? <div className="ohs-table__toolbar">{toolbar}</div> : null}

      {errorState ? (
        errorState
      ) : showEmpty ? (
        emptyState
      ) : (
        <>
          <table className="ohs-table">
            {caption ? <caption>{caption}</caption> : null}
            <thead>
              <tr>
                {selectable ? (
                  <th style={{ width: '40px' }}>
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isSomeSelected}
                      ariaLabel={t('selectAll')}
                      onChange={toggleAll}
                    />
                  </th>
                ) : null}
                {columns.map((c) => (
                  <th
                    key={c.key}
                    style={{ width: c.width, textAlign: c.align ?? 'left' }}
                    aria-sort={
                      c.sortable
                        ? sortKey === c.key
                          ? sortDir === 'asc' ? 'ascending' : 'descending'
                          : 'none'
                        : undefined
                    }
                  >
                    {c.sortable ? (
                      <button type="button" className="ohs-table__sort-btn" onClick={() => handleSortClick(c.key)}>
                        {c.header}
                        <SortIcon dir={sortKey === c.key ? sortDir : undefined} />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)}>{t('loading')}</td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const key = rowKey(row);
                  const isSelected = selectedKeys?.has(key) ?? false;
                  return (
                    <tr
                      key={key}
                      data-selected={isSelected || undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      style={onRowClick ? { cursor: 'pointer' } : undefined}
                    >
                      {selectable ? (
                        <td style={{ width: '40px' }} onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={isSelected} ariaLabel={t('selectRow')} onChange={() => toggleRow(key)} />
                        </td>
                      ) : null}
                      {columns.map((c) => (
                        <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>
                          {c.render(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {pagination && total > 0 ? (
            <div className="ohs-pagination">
              <span>{t('tableShowing', { start, end, total })}</span>
              <div className="ohs-pagination__per-page">
                <span>{t('tableItemsPerPage')}</span>
                <select
                  className="ohs-select ohs-pagination__select"
                  aria-label={t('tableItemsPerPage')}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {pageSizeOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ohs-pagination__pages">
                <button
                  type="button"
                  className="ohs-pagination__page"
                  aria-label={t('paginationPrev')}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <RiArrowLeftSLine size={20} />
                </button>
                {pageWindow(page, totalPages).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="ohs-pagination__page"
                    aria-current={n === page ? 'page' : undefined}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className="ohs-pagination__page"
                  aria-label={t('paginationNext')}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <RiArrowRightSLine size={20} />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
