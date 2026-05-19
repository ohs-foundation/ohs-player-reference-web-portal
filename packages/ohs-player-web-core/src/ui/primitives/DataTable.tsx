import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';

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
  lastUpdatedLabel?: string;
  caption?: ReactNode;
  selectable?: boolean;
  selectedKeys?: ReadonlySet<string>;
  onSelectionChange?: (keys: Set<string>) => void;
}

type SortDir = 'asc' | 'desc';

type MdCheckboxEl = HTMLElement & { checked: boolean; indeterminate: boolean };

function TableCheckbox({
  checked,
  indeterminate,
  label,
  onChange,
}: {
  checked?: boolean;
  indeterminate?: boolean;
  label: string;
  onChange: () => void;
}): React.ReactElement {
  const ref = useRef<MdCheckboxEl | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.checked = Boolean(checked);
    el.indeterminate = Boolean(indeterminate);
  }, [checked, indeterminate]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('change', onChange);
    return (): void => el.removeEventListener('change', onChange);
  }, [onChange]);

  return <md-checkbox ref={ref as React.RefObject<HTMLElement>} aria-label={label} />;
}

function SortIcon({ dir }: { dir?: SortDir }): React.ReactElement {
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

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  loading,
  emptyState,
  errorState,
  lastUpdatedLabel,
  caption,
  selectable,
  selectedKeys,
  onSelectionChange,
}: DataTableProps<Row>): React.ReactElement {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

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
    onSelectionChange(isAllSelected ? new Set() : new Set(allKeys));
  };

  const toggleRow = (key: string): void => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  if (errorState) {
    return <div className="ohs-table-wrapper">{errorState}</div>;
  }

  if (!loading && rows.length === 0 && emptyState) {
    return <div className="ohs-table-wrapper">{emptyState}</div>;
  }

  return (
    <div className="ohs-table-wrapper">
      <table className="ohs-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {selectable ? (
              <th style={{ width: '40px' }}>
                <TableCheckbox
                  checked={isAllSelected}
                  indeterminate={isSomeSelected}
                  label={t('selectAll')}
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
            sortedRows.map((row) => {
              const key = rowKey(row);
              const isSelected = selectedKeys?.has(key) ?? false;
              return (
                <tr key={key} data-selected={isSelected || undefined}>
                  {selectable ? (
                    <td style={{ width: '40px' }}>
                      <TableCheckbox
                        checked={isSelected}
                        label={t('selectRow')}
                        onChange={() => toggleRow(key)}
                      />
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
      {lastUpdatedLabel ? (
        <div className="ohs-table__footer">{lastUpdatedLabel}</div>
      ) : null}
    </div>
  );
}
