import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent,
} from 'react';
import { IconChevronDown, IconChevronRight } from '../../components/ui/icons';
import { useTranslation } from 'ohs-player-web-core';
import type { LocationNode } from './hierarchy';
import { levelFromType } from './locationLevel';
import { LocationLevelBadge } from './LocationLevelBadge';
import { LocationStatusBadge } from './locationStatus';
import { LocationRowMenu } from './LocationRowMenu';
import { flatten, visibleRowRange, TREE_ROW_HEIGHT, type FlatRow } from './treeWindow';

/** Fallback viewport when ResizeObserver has not measured yet (tests / first paint). */
const DEFAULT_VIEWPORT = 480;

export interface LocationTreeProps {
  root: LocationNode;
  expanded: ReadonlySet<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  /** Re-roots the view on that node — the hierarchy API has no in-place paging. */
  onLoadMore: (id: string) => void;
  onEdit: (id: string) => void;
}

const INDENT = 32;

/** Connector cells (│ ├ └): rows are items-stretch so each cell's inset-y-0 line joins the rows above/below. */
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
        return (
          <span key={`${nodeId}-guide-${i}`} className="relative block h-full" style={{ width: INDENT }}>
            {!isNodeLevel && hasNext ? (
              <span className="absolute inset-y-0 left-1/2 w-px bg-border-secondary" />
            ) : null}
            {isNodeLevel ? (
              <>
                <span className={`absolute left-1/2 w-px bg-border-secondary ${isLast ? 'top-0 h-1/2' : 'inset-y-0'}`} />
                <span className="absolute left-1/2 right-0 top-1/2 h-px bg-border-secondary" />
              </>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

/** "N+" when hasMoreChildren — the API exposes no total child count. */
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
      className={`group flex h-full cursor-pointer items-stretch rounded-sm pl-2 pr-4 outline-none transition-colors
        focus-visible:shadow-[0_0_0_3px_var(--ohs-color-focus-ring)]
        ohs-state-layer ${isSelected ? 'bg-primary-container' : ''}`}
    >
      <TreeGuides nodeId={node.id} ancestorHasNext={ancestorHasNext} isLast={isLast} />
      <span className="flex min-w-0 flex-1 items-center">
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
            {isExpanded ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" aria-hidden="true" />
        )}

        <span className="ml-2 flex min-w-0 flex-1 flex-col gap-0.5 py-1">
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_VIEWPORT);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      if (h > 0) setViewportHeight(h);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep keyboard focus on a still-mounted row when the expanded set changes.
  useEffect(() => {
    if (!rows.some((r) => r.node.id === focusId) && rows[0]) {
      setFocusId(rows[0].node.id);
    }
  }, [rows, focusId]);

  const { start, end } = visibleRowRange(rows.length, scrollTop, viewportHeight);
  const slice = rows.slice(start, end);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const focusRow = useCallback(
    (id: string) => {
      setFocusId(id);
      const idx = rows.findIndex((r) => r.node.id === id);
      const el = scrollRef.current;
      if (idx >= 0 && el) {
        const top = idx * TREE_ROW_HEIGHT;
        const bottom = top + TREE_ROW_HEIGHT;
        if (top < el.scrollTop) el.scrollTop = top;
        else if (bottom > el.scrollTop + el.clientHeight) el.scrollTop = bottom - el.clientHeight;
        setScrollTop(el.scrollTop);
      }
      requestAnimationFrame(() => rowRefs.current.get(id)?.focus());
    },
    [rows],
  );

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

  const totalHeight = rows.length * TREE_ROW_HEIGHT;

  return (
    <div
      ref={scrollRef}
      role="tree"
      aria-label={t('locationsTreeLabel')}
      className="min-h-80 max-h-[min(70vh,40rem)] overflow-auto py-1"
      onScroll={onScroll}
    >
      <div className="relative w-full" style={{ height: totalHeight }}>
        {slice.map((row, i) => {
          const index = start + i;
          return (
            <div
              key={row.node.id}
              className="absolute right-0 left-0"
              style={{ top: index * TREE_ROW_HEIGHT, height: TREE_ROW_HEIGHT }}
            >
              <TreeRow
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
