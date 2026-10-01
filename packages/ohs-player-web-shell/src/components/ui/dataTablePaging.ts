import type { DataTableServerPagination } from './DataTable';

/** Footer state shared by client and server paging; pages are 1-based here. */
export interface PaginationState {
  start: number;
  end: number;
  /** Grand total when known; without it the footer shows the range and previous/next only. */
  total?: number;
  page: number;
  /** Page count when known; drives the numbered page buttons. */
  pageCount?: number;
  pageSize: number;
  canPrev: boolean;
  canNext: boolean;
  onPage: (page: number) => void;
  onPageSize: (pageSize: number) => void;
}

export function paginationSummary(
  { start, end, total }: PaginationState,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  return total === undefined
    ? t('tableShowingRange', { start, end })
    : t('tableShowing', { start, end, total });
}

export function serverPaginationState(
  server: DataTableServerPagination,
  rowsOnPage: number,
): PaginationState {
  const offset = server.page * server.pageSize;
  const total = server.mode === 'numbered' ? server.total : undefined;
  return {
    start: rowsOnPage === 0 ? 0 : offset + 1,
    end: offset + rowsOnPage,
    total,
    page: server.page + 1,
    pageCount: total === undefined ? undefined : Math.max(1, Math.ceil(total / server.pageSize)),
    pageSize: server.pageSize,
    canPrev: server.page > 0,
    canNext: server.hasNext,
    onPage: (page) => server.onPageChange(page - 1),
    onPageSize: server.onPageSizeChange,
  };
}
