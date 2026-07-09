import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { RiArrowDownSLine, RiArrowRightSLine } from '@remixicon/react';
import { useTranslation } from 'ohs-player-web-core';
import type { LocationNode } from './hierarchy';
import { levelFromType } from './locationLevel';
import { LocationLevelBadge } from './LocationLevelBadge';
import { LocationStatusBadge } from './locationStatus';
import { LocationRowMenu } from './LocationRowMenu';

// Level + status are INLINE on every hierarchy node, so each row renders its meta line directly — no fetch.

interface FlatRow {
  node: LocationNode;
  depth: number;
  expandable: boolean;
  /** Per ancestor level (excluding this node): does that ancestor have a following sibling? Drives which
   *  vertical guide lines continue through this row. Length === depth. */
  ancestorHasNext: boolean[];
  /** Is this node the last child of its parent? Draws an elbow (└) instead of a tee (├). */
  isLast: boolean;
}

/** Depth-first flatten of the currently-expanded nodes into a roving-tabindex row list. */
function flatten(root: LocationNode, expanded: ReadonlySet<string>): FlatRow[] {
  const rows: FlatRow[] = [];
  const walk = (node: LocationNode, depth: number, ancestorHasNext: boolean[], isLast: boolean) => {
    const expandable = node.children.length > 0 || node.hasMoreChildren;
    rows.push({ node, depth, expandable, ancestorHasNext, isLast });
    if (expanded.has(node.id)) {
      node.children.forEach((child, i) => {
        const childIsLast = i === node.children.length - 1;
        // A child at this depth continues its parent's vertical line only when the parent is not last.
        walk(child, depth + 1, [...ancestorHasNext, !isLast], childIsLast);
      });
    }
  };
  walk(root, 0, [], true);
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
  /** Open the edit drawer for a node (locations.edit only). */
  onEdit: (id: string) => void;
}

const INDENT = 32; // px per depth level — the gutter each connector column occupies.

/**
 * True tree connector lines. One fixed-width column per depth level; the column center hosts the
 * vertical line (│), and the node's own column draws a tee/elbow (├ / └) plus a horizontal branch to
 * the chevron. Rows are `items-stretch`, so a column's `inset-y-0` vertical butts against the rows
 * above/below for a continuous line. 1px, border-secondary token (≈ the Figma's #D9D9D9).
 */
function TreeGuides({
  nodeId,
  ancestorHasNext,
  isLast,
}: Readonly<{ nodeId: string; ancestorHasNext: boolean[]; isLast: boolean }>): React.ReactElement | null {
  if (ancestorHasNext.length === 0) return null;
  return (
    <span className="relative flex shrink-0 self-stretch" aria-hidden="true">
      {ancestorHasNext.map((hasNext, i) => {
        const isNodeLevel = i === ancestorHasNext.length - 1;
        // Guide cells are positional depth levels (append-only, never reordered) — an index key is stable here.
        return (
          <span key={`${nodeId}-guide-${i}`} className="relative block h-full" style={{ width: INDENT }}>
            {/* Ancestor levels: a full-height vertical only when that ancestor has a following sibling. */}
            {!isNodeLevel && hasNext ? (
              <span className="absolute inset-y-0 left-1/2 w-px bg-border-secondary" />
            ) : null}
            {isNodeLevel ? (
              <>
                {/* Vertical trunk: full-height for a tee (├, more siblings below), top-half for an elbow (└). */}
                <span className={`absolute left-1/2 w-px bg-border-secondary ${isLast ? 'top-0 h-1/2' : 'inset-y-0'}`} />
                {/* Horizontal branch from the trunk to the child's chevron. */}
                <span className="absolute left-1/2 right-0 top-1/2 h-px bg-border-secondary" />
              </>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Metadata line under the name: ROOT (root only) • <level> • N Child locations. Centered-bullet
 * separators. `hasMoreChildren` renders "N+" since the API exposes no separate total child count.
 */
function rowMeta(node: LocationNode, t: (k: string, v?: Record<string, string | number>) => string): string {
  const parts: string[] = [];
  if (node.partOf === null) parts.push(t('locationLevelRoot'));
  const level = levelFromType(node.type);
  if (level) parts.push(t(level.labelKey));
  if (node.children.length > 0 || node.hasMoreChildren) {
    const key = node.hasMoreChildren ? 'locationsChildLocationsMore' : 'locationsChildLocations';
    parts.push(t(key, { count: node.children.length }));
  }
  return parts.join(' • ');
}

/**
 * Administrative-level badge beside the name (Country / County / Facility…). "ROOT" is NOT a badge here
 * — it lives only in the metadata line (rowMeta), matching the Figma "ROOT • Country • …" layout.
 */
function RowLevelBadge({ node }: Readonly<{ node: LocationNode }>): React.ReactElement | null {
  const level = levelFromType(node.type);
  return level ? <LocationLevelBadge tone={level.tone} labelKey={level.labelKey} /> : null;
}

interface TreeRowProps {
  row: FlatRow;
  isExpanded: boolean;
  isSelected: boolean;
  focused: boolean;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>, row: FlatRow) => void;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onLoadMore: (id: string) => void;
  onFocusRow: (id: string) => void;
  onEdit: (id: string) => void;
}

function TreeRow({
  row,
  isExpanded,
  isSelected,
  focused,
  registerRef,
  onKeyDown,
  onToggle,
  onSelect,
  onLoadMore,
  onFocusRow,
  onEdit,
}: Readonly<TreeRowProps>): React.ReactElement {
  const { t } = useTranslation();
  const { node, depth, expandable, ancestorHasNext, isLast } = row;
  const label = node.name ?? t('locationsUnnamed', { id: node.id });
  const meta = rowMeta(node, t);
  return (
    <div
      ref={(el) => registerRef(node.id, el)}
      role="treeitem"
      aria-level={depth + 1}
      aria-expanded={expandable ? isExpanded : undefined}
      aria-selected={isSelected}
      tabIndex={focused ? 0 : -1}
      onKeyDown={(e) => onKeyDown(e, row)}
      onClick={() => {
        onFocusRow(node.id);
        onSelect(node.id);
      }}
      className={`group flex min-h-15 cursor-pointer items-stretch rounded-sm pl-2 pr-4 outline-none transition-colors
        focus-visible:shadow-[0_0_0_3px_var(--ohs-color-focus-ring)]
        ${isSelected ? 'bg-primary-container' : 'hover:bg-surface-variant'}`}
    >
      <TreeGuides nodeId={node.id} ancestorHasNext={ancestorHasNext} isLast={isLast} />
      {/* Content group is vertically centered; the row itself stretches so the guides span edge-to-edge. */}
      <span className="flex min-w-0 flex-1 items-center">
        {/* Chevron gutter: fixed width so chevrons line up vertically across all levels; abuts the connectors. */}
        {expandable ? (
          <button
            type="button"
            aria-label={isExpanded ? t('collapse') : t('expand')}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-surface hover:text-text"
          >
            {isExpanded ? <RiArrowDownSLine size={20} /> : <RiArrowRightSLine size={20} />}
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" aria-hidden="true" />
        )}

        <span className="ml-2 flex min-w-0 flex-1 flex-col gap-1 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className={`truncate text-sm font-semibold ${node.name ? 'text-primary' : 'italic text-text-muted'}`}>
              {label}
            </span>
            <RowLevelBadge node={node} />
          </span>
          {meta ? <span className="truncate text-xs text-text-muted">{meta}</span> : null}
        </span>

        {node.hasMoreChildren && isExpanded ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onLoadMore(node.id);
            }}
            className="ml-2 shrink-0 text-xs text-primary underline"
          >
            {t('locationsLoadMore')}
          </button>
        ) : null}

        {node.status ? (
          <span className="ml-3 shrink-0">
            <LocationStatusBadge status={node.status} />
          </span>
        ) : null}

        <span className="ml-1 shrink-0">
          <LocationRowMenu nodeId={node.id} onView={onSelect} onEdit={onEdit} />
        </span>
      </span>
    </div>
  );
}

export function LocationTree({
  root,
  expanded,
  selectedId,
  onToggle,
  onSelect,
  onLoadMore,
  onEdit,
}: Readonly<LocationTreeProps>): React.ReactElement {
  const { t } = useTranslation();
  const rows = useMemo(() => flatten(root, expanded), [root, expanded]);
  const [focusId, setFocusId] = useState<string>(root.id);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const focusRow = useCallback((id: string) => {
    setFocusId(id);
    rowRefs.current.get(id)?.focus();
  }, []);

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
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
      {rows.map((row) => (
        <TreeRow
          key={row.node.id}
          row={row}
          isExpanded={expanded.has(row.node.id)}
          isSelected={selectedId === row.node.id}
          focused={focusId === row.node.id}
          registerRef={registerRef}
          onKeyDown={onKeyDown}
          onToggle={onToggle}
          onSelect={onSelect}
          onLoadMore={onLoadMore}
          onFocusRow={setFocusId}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
