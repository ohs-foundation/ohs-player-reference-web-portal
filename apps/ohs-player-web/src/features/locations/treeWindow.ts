import type { LocationNode } from './hierarchy';

export interface FlatRow {
  node: LocationNode;
  depth: number;
  expandable: boolean;
  /** One entry per ancestor level: true when that ancestor has a following sibling (its │ continues). */
  ancestorHasNext: boolean[];
  isLast: boolean;
}

/** Fixed row height for windowing (matches `min-h-15` / 3.75rem). */
export const TREE_ROW_HEIGHT = 60;
export const TREE_OVERSCAN = 8;

export function flatten(root: LocationNode, expanded: ReadonlySet<string>): FlatRow[] {
  const rows: FlatRow[] = [];
  const walk = (node: LocationNode, depth: number, ancestorHasNext: boolean[], isLast: boolean) => {
    const expandable = node.children.length > 0 || node.hasMoreChildren;
    rows.push({ node, depth, expandable, ancestorHasNext, isLast });
    if (expanded.has(node.id)) {
      node.children.forEach((child, i) => {
        const childIsLast = i === node.children.length - 1;
        walk(child, depth + 1, [...ancestorHasNext, !isLast], childIsLast);
      });
    }
  };
  walk(root, 0, [], true);
  return rows;
}

/** Inclusive slice of rows to paint for a scroll window (pure — unit-tested). */
export function visibleRowRange(
  rowCount: number,
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number = TREE_ROW_HEIGHT,
  overscan: number = TREE_OVERSCAN,
): { start: number; end: number } {
  if (rowCount === 0) return { start: 0, end: 0 };
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(rowCount, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
  return { start, end };
}
