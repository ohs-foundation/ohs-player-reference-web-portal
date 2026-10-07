import { useMemo } from 'react';
import { useSearch, useTranslation } from 'ohs-player-web-core';
import { describeError } from '../../lib/describeError';

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
  const { t } = useTranslation();
  const totalQ = useSearch(resourceType, { _summary: 'count' });
  const activeQ = useSearch(resourceType, { _summary: 'count', ...activeParam });
  return {
    total: countOf(totalQ.data),
    active: countOf(activeQ.data),
    loading: totalQ.isLoading || activeQ.isLoading,
    error: errorText(totalQ.error ?? activeQ.error, t),
  };
}

function errorText(error: Error | null, t: (key: string) => string): string | null {
  return error ? describeError(error, t).description : null;
}

export interface RecentResult<Row> {
  rows: Row[];
  loading: boolean;
  error: string | null;
}

/** The N most-recently-updated rows of a resource type (real "recently added/updated"). */
export function useRecent<Row>(resourceType: string, count = 5): RecentResult<Row> {
  const { t } = useTranslation();
  const q = useSearch(resourceType, { _count: String(count), _sort: '-_lastUpdated' });
  const rows = useMemo(() => rowsOf<Row>(q.data), [q.data]);
  return {
    rows,
    loading: q.isLoading,
    error: errorText(q.error, t),
  };
}
