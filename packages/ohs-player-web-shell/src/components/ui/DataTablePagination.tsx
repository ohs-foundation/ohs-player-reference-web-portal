import { useTranslation } from 'ohs-player-web-core';
import { IconChevronLeft, IconChevronRight } from './icons';
import { Listbox } from './Listbox';
import { paginationSummary, type PaginationState } from './dataTablePaging';

function pageWindow(page: number, pageCount: number): number[] {
  const size = Math.min(5, pageCount);
  let start = Math.max(1, page - Math.floor(size / 2));
  start = Math.min(start, Math.max(1, pageCount - size + 1));
  return Array.from({ length: size }, (_, i) => start + i);
}

export function DataTablePagination({
  state,
  pageSizeOptions,
}: Readonly<{ state: PaginationState; pageSizeOptions: readonly number[] }>): React.ReactElement {
  const { t } = useTranslation();
  const { page, pageCount, pageSize, canPrev, canNext, onPage, onPageSize } = state;

  return (
    <div className="ohs-pagination">
      <span>{paginationSummary(state, t)}</span>
      <div className="ohs-pagination__per-page">
        <span>{t('tableItemsPerPage')}</span>
        <Listbox
          compact
          className="ohs-pagination__select"
          label={t('tableItemsPerPage')}
          placeholder={String(pageSize)}
          value={[String(pageSize)]}
          options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(next) => onPageSize(Number(next[0]))}
        />
      </div>
      <div className="ohs-pagination__pages">
        <button
          type="button"
          className="ohs-pagination__page"
          aria-label={t('paginationPrev')}
          disabled={!canPrev}
          onClick={() => onPage(page - 1)}
        >
          <IconChevronLeft size={20} />
        </button>
        {pageCount === undefined
          ? null
          : pageWindow(page, pageCount).map((n) => (
              <button
                key={n}
                type="button"
                className="ohs-pagination__page"
                aria-current={n === page ? 'page' : undefined}
                onClick={() => onPage(n)}
              >
                {n}
              </button>
            ))}
        <button
          type="button"
          className="ohs-pagination__page"
          aria-label={t('paginationNext')}
          disabled={!canNext}
          onClick={() => onPage(page + 1)}
        >
          <IconChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
