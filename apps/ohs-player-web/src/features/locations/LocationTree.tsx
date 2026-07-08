import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { RiArrowRightSLine } from '@remixicon/react';
import { useTranslation } from 'ohs-player-web-core';
import type { LocationNode } from './hierarchy';

// NOTE: the hierarchy DTO carries only id/name/partOf/children/hasMoreChildren — NOT the administrative
// level or physicalType (those live on the full Location). Per-node fetches would be N requests, so the
// level badge + physical-type chip are shown in the detail panel (which reads the full Location), and tree
// rows stay lightweight (name + expand state). Revisit if the hierarchy API starts returning level.

interface FlatRow {
  node: LocationNode;
  depth: number;
  expandable: boolean;
}

/** Depth-first flatten of the currently-expanded nodes into a roving-tabindex row list. */
function flatten(root: LocationNode, expanded: ReadonlySet<string>): FlatRow[] {
  const rows: FlatRow[] = [];
  const walk = (node: LocationNode, depth: number) => {
    const expandable = node.children.length > 0 || node.hasMoreChildren;
    rows.push({ node, depth, expandable });
    if (expanded.has(node.id)) {
      for (const child of node.children) walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return rows;
}

export interface LocationTreeProps {
  root: LocationNode;
  expanded: ReadonlySet<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  /** node.hasMoreChildren → re-root to that node (no in-place paging yet; see hierarchy.ts open dependency). */
  onLoadMore: (id: string) => void;
}

export function LocationTree({
  root,
  expanded,
  selectedId,
  onToggle,
  onSelect,
  onLoadMore,
}: Readonly<LocationTreeProps>): React.ReactElement {
  const { t } = useTranslation();
  const rows = useMemo(() => flatten(root, expanded), [root, expanded]);
  const [focusId, setFocusId] = useState<string>(root.id);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const focusRow = useCallback((id: string) => {
    setFocusId(id);
    rowRefs.current.get(id)?.focus();
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, row: FlatRow) => {
      const idx = rows.findIndex((r) => r.node.id === row.node.id);
      const isExpanded = expanded.has(row.node.id);
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (idx < rows.length - 1) focusRow(rows[idx + 1].node.id);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (idx > 0) focusRow(rows[idx - 1].node.id);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (row.expandable && !isExpanded) onToggle(row.node.id);
          else if (isExpanded && row.node.children[0]) focusRow(row.node.children[0].id);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (row.expandable && isExpanded) onToggle(row.node.id);
          else if (row.node.partOf) focusRow(row.node.partOf);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect(row.node.id);
          break;
        case 'Home':
          e.preventDefault();
          focusRow(rows[0].node.id);
          break;
        case 'End':
          e.preventDefault();
          focusRow(rows[rows.length - 1].node.id);
          break;
      }
    },
    [rows, expanded, focusRow, onToggle, onSelect],
  );

  return (
    <div role="tree" aria-label={t('locationsTreeLabel')} className="py-1">
      {rows.map((row) => {
        const { node, depth, expandable } = row;
        const isExpanded = expanded.has(node.id);
        const isSelected = selectedId === node.id;
        const label = node.name ?? t('locationsUnnamed', { id: node.id });
        const childCount = node.children.length;
        return (
          <div
            key={node.id}
            ref={(el) => {
              if (el) rowRefs.current.set(node.id, el);
              else rowRefs.current.delete(node.id);
            }}
            role="treeitem"
            aria-level={depth + 1}
            aria-expanded={expandable ? isExpanded : undefined}
            aria-selected={isSelected}
            tabIndex={focusId === node.id ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, row)}
            onClick={() => {
              setFocusId(node.id);
              onSelect(node.id);
            }}
            className={`group flex cursor-pointer items-center gap-2 rounded-sm py-2 pr-3 outline-none transition-colors
              focus-visible:shadow-[0_0_0_3px_var(--ohs-color-focus-ring)]
              ${isSelected ? 'bg-primary-container font-medium text-primary' : 'hover:bg-surface-variant'}`}
            style={{ paddingLeft: `${12 + depth * 22}px` }}
          >
            {expandable ? (
              <button
                type="button"
                aria-label={isExpanded ? t('collapse') : t('expand')}
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(node.id);
                }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-surface hover:text-text"
              >
                <RiArrowRightSLine size={18} className={isExpanded ? 'rotate-90 transition-transform' : 'transition-transform'} />
              </button>
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
                <span className="h-1.5 w-1.5 rounded-pill bg-border-tertiary" />
              </span>
            )}
            <span className={`flex-1 truncate text-sm ${node.name ? '' : 'italic text-text-muted'}`}>{label}</span>
            {childCount > 0 ? (
              <span className="shrink-0 rounded-pill bg-surface-variant px-2 py-0.5 text-xs text-text-muted">
                {childCount}
              </span>
            ) : null}
            {node.hasMoreChildren && isExpanded ? (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadMore(node.id);
                }}
                className="shrink-0 text-xs text-primary underline"
              >
                {t('locationsLoadMore')}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
