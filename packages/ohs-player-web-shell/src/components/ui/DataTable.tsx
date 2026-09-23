import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'ohs-player-web-core';
import { Checkbox } from './Checkbox';
import { DataTablePagination } from './DataTablePagination';
import { paginationSummary, serverPaginationState, type PaginationState } from './dataTablePaging';

export interface DataTableColumn<Row> {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  sortable?: boolean;
  sortValue?: (row: Row) => string | number;
  /** Render the cell in the code face — for identifiers and other machine-readable values. */
  mono?: boolean;
}

/** Server-driven paging (e.g. from `usePagedSearch`): `rows` is already one page; the table draws the footer. */
export interface DataTableServerPagination {
  /** 0-based page, as `usePagedSearch` counts. */
  page: number;
  pageSize: number;
  /** Grand total when the server reports one; used in `'numbered'` mode. */
  total?: number;
  hasNext: boolean;
  /** `'numbered'` shows page buttons and the total; `'links'` shows the range with previous/next only. */
  mode: 'numbered' | 'links';
  /** Receives the 0-based page to load. */
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
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
  /** Snaps back to page 1 whenever this changes — pass the page's applied filter state. */
  pageResetKey?: string;
  /**
   * Server paging footer. When set, `rows` are rendered as given and `pagination`,
   * `initialPageSize` and `pageResetKey` are ignored; `pageSizeOptions` still applies.
   */
  serverPagination?: DataTableServerPagination;
  /** Drop the wrapper's border/shadow/background and the min-width — for embedding inside a Card. */
  flush?: boolean;
  /** M3 density: each step down removes 4px of row height. Interactive targets stay >= 44px. */
  density?: 0 | -1 | -2;
}

type SortDir = 'asc' | 'desc';

function SortIcon({ dir }: Readonly<{ dir?: SortDir }>): React.ReactElement {
  if (!dir) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ opacity: 0.35, flexShrink: 0 }}
      >
        <polyline points="8 15 12 19 16 15" />
        <polyline points="8 9 12 5 16 9" />
      </svg>
    );
  }
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {dir === 'asc' ? <polyline points="8 9 12 5 16 9" /> : <polyline points="8 15 12 19 16 15" />}
    </svg>
  );
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
  density,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  pageResetKey,
  serverPagination,
  flush,
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

  const clientPaging = Boolean(pagination) && !serverPagination;
  const total = sortedRows.length;
  const totalPages = clientPaging ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [pageResetKey]);

  const visibleRows = useMemo(() => {
    if (!clientPaging) return sortedRows;
    const sliceStart = (page - 1) * pageSize;
    return sortedRows.slice(sliceStart, sliceStart + pageSize);
  }, [clientPaging, sortedRows, page, pageSize]);

  const handleSortClick = (key: string): void => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const allKeys = useMemo(() => new Set(rows.map(rowKey)), [rows, rowKey]);
  const isAllSelected =
    selectedKeys != null && allKeys.size > 0 && allKeys.size === selectedKeys.size;
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
  const clientState: PaginationState = {
    start: total === 0 ? 0 : (page - 1) * pageSize + 1,
    end: Math.min(page * pageSize, total),
    total,
    page,
    pageCount: totalPages,
    pageSize,
    canPrev: page > 1,
    canNext: page < totalPages,
    onPage: setPage,
    onPageSize: (next) => {
      setPageSize(next);
      setPage(1);
    },
  };
  let footer: PaginationState | undefined;
  let announced: PaginationState | undefined;
  if (serverPagination) {
    footer =
      rows.length > 0 && !loading
        ? serverPaginationState(serverPagination, rows.length)
        : undefined;
    announced = footer;
  } else if (clientPaging) {
    footer = total > 0 ? clientState : undefined;
    announced = loading ? undefined : clientState;
  }

  return (
    <div
      className="ohs-table-wrapper"
      data-flush={flush ? 'true' : undefined}
      data-density={density ? String(density) : undefined}
    >
      {toolbar ? <div className="ohs-table__toolbar">{toolbar}</div> : null}

      {announced && !errorState ? (
        <span className="sr-only" role="status">
          {paginationSummary(announced, t)}
        </span>
      ) : null}

      {errorState ? (
        errorState
      ) : showEmpty ? (
        emptyState
      ) : (
        <>
          <div className="ohs-table__scroll">
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
                            ? sortDir === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                          : undefined
                      }
                    >
                      {c.sortable ? (
                        <button
                          type="button"
                          className="ohs-table__sort-btn"
                          onClick={() => handleSortClick(c.key)}
                        >
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
                            <Checkbox
                              checked={isSelected}
                              ariaLabel={t('selectRow')}
                              onChange={() => toggleRow(key)}
                            />
                          </td>
                        ) : null}
                        {columns.map((c) => (
                          <td
                            key={c.key}
                            style={{ textAlign: c.align ?? 'left' }}
                            data-mono={c.mono ? 'true' : undefined}
                          >
                            {c.render(row)}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {footer ? <DataTablePagination state={footer} pageSizeOptions={pageSizeOptions} /> : null}
        </>
      )}
    </div>
  );
}
