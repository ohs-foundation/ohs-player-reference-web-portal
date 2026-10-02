import { useMemo } from 'react';
import { useSearch } from 'ohs-player-web-core';
import { monthWindows, type MonthWindow } from './monthWindows';

type CountBundle = { total?: number };
type SearchBundle<Row> = { entry?: { resource?: Row }[] };

export interface ResourceStats {
  /** Population total (`_summary=count`). */
  total: number | undefined;
  /** Active count; inactive is derived as `total - active` so the split always covers the population. */
  active: number | undefined;
  loading: boolean;
  error: string | null;
}

function countOf(data: unknown): number | undefined {
  return (data as CountBundle | undefined)?.total;
}

function rowsOf<Row>(data: unknown): Row[] {
  return ((data as SearchBundle<Row> | undefined)?.entry ?? [])
    .map((e) => e.resource)
    .filter((r): r is Row => Boolean(r));
}

/**
 * Bundles the dashboard's FHIR queries for one resource type: a population count, an active count, and
 * the most-recently-updated rows. `activeParam` differs by resource — Practitioner/Organization use
 * `active=true` (boolean), Location/CareTeam use `status=active` (code).
 */
export function useResourceStats(
  resourceType: string,
  activeParam: Record<string, string>,
): ResourceStats {
  const totalQ = useSearch(resourceType, { _summary: 'count' });
  const activeQ = useSearch(resourceType, { _summary: 'count', ...activeParam });
  return {
    total: countOf(totalQ.data),
    active: countOf(activeQ.data),
    loading: totalQ.isLoading || activeQ.isLoading,
    error: errorText(totalQ.error ?? activeQ.error),
  };
}

function errorText(error: Error | null): string | null {
  return error ? error.message : null;
}

export interface RecentResult<Row> {
  rows: Row[];
  loading: boolean;
  error: string | null;
}

/** The N most-recently-updated rows of a resource type (real "recently added/updated"). */
export function useRecent<Row>(resourceType: string, count = 5): RecentResult<Row> {
  const q = useSearch(resourceType, { _count: String(count), _sort: '-_lastUpdated' });
  const rows = useMemo(() => rowsOf<Row>(q.data), [q.data]);
  return {
    rows,
    loading: q.isLoading,
    error: errorText(q.error),
  };
}

export interface MonthlyCount {
  start: Date;
  value: number;
}

export interface MonthlyCounts {
  points: MonthlyCount[];
  loading: boolean;
  error: string | null;
}

function lastUpdatedIn(window: MonthWindow): Record<string, string | readonly string[]> {
  return { _summary: 'count', _lastUpdated: [window.ge, window.lt] };
}

/**
 * Records of `resourceType` last updated in each of the last six calendar months, one count search
 * per month. FHIR keeps no creation date on these resources, so `_lastUpdated` is the only date.
 */
export function useMonthlyCounts(resourceType: string): MonthlyCounts {
  const windows = useMemo(() => monthWindows(new Date()), []);
  const months = [
    useSearch(resourceType, lastUpdatedIn(windows[0])),
    useSearch(resourceType, lastUpdatedIn(windows[1])),
    useSearch(resourceType, lastUpdatedIn(windows[2])),
    useSearch(resourceType, lastUpdatedIn(windows[3])),
    useSearch(resourceType, lastUpdatedIn(windows[4])),
    useSearch(resourceType, lastUpdatedIn(windows[5])),
  ];
  return {
    points: windows.map((window, index) => ({
      start: window.start,
      value: countOf(months[index].data) ?? 0,
    })),
    loading: months.some((month) => month.isLoading),
    error: months.map((month) => errorText(month.error)).find(Boolean) ?? null,
  };
}
