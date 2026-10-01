import { useMemo } from 'react';
import { activityItemFromAuditEvent, type ActivityItem, useSearch } from 'ohs-player-web-core';

export type { ActivityItem };

type SearchBundle = { entry?: { resource?: unknown }[] };

const FEED_COUNT = 12;

/** The most recent `AuditEvent`s as a normalised activity feed (newest first). */
export function useRecentActivity(): {
  items: ActivityItem[];
  loading: boolean;
  error: string | null;
} {
  const q = useSearch('AuditEvent', { _sort: '-date', _count: String(FEED_COUNT) });

  const items = useMemo<ActivityItem[]>(
    () =>
      ((q.data as SearchBundle | undefined)?.entry ?? [])
        .map((e) => e.resource)
        .filter(Boolean)
        .map((resource) => activityItemFromAuditEvent(resource)),
    [q.data],
  );

  return {
    items,
    loading: q.isLoading,
    error: q.error ? (q.error instanceof Error ? q.error.message : String(q.error)) : null,
  };
}
