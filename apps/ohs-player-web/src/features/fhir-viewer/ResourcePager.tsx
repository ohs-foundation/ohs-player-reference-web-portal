import { useTranslation } from 'ohs-player-web-core';
import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import { cn } from '../../lib/cn';

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

interface ResourcePagerProps {
  page: number;
  pageSize: number;
  total: number | undefined;
  rowsOnPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  mode: 'numbered' | 'links';
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}

/** Windowed page numbers around the current page (design shows 1 2 3 …), capped to the total. */
function pageWindow(page: number, pageCount: number): number[] {
  const start = Math.max(0, Math.min(page - 1, pageCount - 3));
  const end = Math.min(pageCount, start + 3);
  const window: number[] = [];
  for (let p = start; p < end; p++) window.push(p);
  return window;
}

/**
 * List pager. In `'numbered'` mode (server returned an accurate total) it shows a page count and
 * numbered buttons; in `'links'` mode it degrades to prev/next only. Backend capability decides —
 * the design's numbered pager is adapted, never emulated.
 */
export function ResourcePager({
  page,
  pageSize,
  total,
  rowsOnPage,
  hasNext,
  hasPrev,
  mode,
  onPage,
  onPageSize,
}: Readonly<ResourcePagerProps>): React.ReactElement {
  const { t } = useTranslation();
  const from = rowsOnPage === 0 ? 0 : page * pageSize + 1;
  const to = page * pageSize + rowsOnPage;
  const pageCount = total !== undefined ? Math.max(1, Math.ceil(total / pageSize)) : undefined;

  const summary =
    mode === 'numbered' && total !== undefined
      ? t('fhirViewerShowingOf', { from, to, total })
      : t('fhirViewerShowing', { from, to });

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
      <p className="m-0 text-sm text-text-muted">{summary}</p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-text-muted">
          {t('fhirViewerItemsPerPage')}
          <select
            aria-label={t('fhirViewerItemsPerPage')}
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className={cn(
              'h-9 rounded border border-border bg-surface text-text text-sm px-2 cursor-pointer',
              'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ohs-color-focus-ring)]',
            )}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <PagerButton
            label={t('fhirViewerPrevPage')}
            disabled={!hasPrev}
            onClick={() => onPage(page - 1)}
          >
            <RiArrowLeftSLine size={18} aria-hidden="true" />
          </PagerButton>

          {mode === 'numbered' && pageCount !== undefined
            ? pageWindow(page, pageCount).map((p) => (
                <PagerButton
                  key={p}
                  label={t('fhirViewerGoToPage', { page: p + 1 })}
                  active={p === page}
                  onClick={() => onPage(p)}
                >
                  {p + 1}
                </PagerButton>
              ))
            : null}

          <PagerButton
            label={t('fhirViewerNextPage')}
            disabled={!hasNext}
            onClick={() => onPage(page + 1)}
          >
            <RiArrowRightSLine size={18} aria-hidden="true" />
          </PagerButton>
        </div>
      </div>
    </div>
  );
}

interface PagerButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function PagerButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: Readonly<PagerButtonProps>): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center min-w-9 h-9 px-2 rounded text-sm cursor-pointer',
        'border transition-colors duration-[120ms]',
        active
          ? 'bg-primary border-primary text-primary-contrast'
          : 'ohs-state-layer bg-surface border-border text-text',
        'disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-surface',
      )}
    >
      {children}
    </button>
  );
}
