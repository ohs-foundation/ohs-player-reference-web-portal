import { useMemo } from 'react';
import { useSearch } from 'ohs-player-web-core';

export interface ActivityItem {
  id: string;
  /** Action verb from `AuditEvent.action` (C/R/U/D); undefined for older events that didn't record it. */
  action?: 'C' | 'R' | 'U' | 'D';
  /** Resource type from the entity reference, e.g. 'Location'. */
  resourceType: string;
  /** Resource id from the entity reference. */
  resourceId: string;
  /** Optional human description carried on the entity. */
  description?: string;
  who: string;
  /** ISO timestamp (`recorded`). */
  recorded?: string;
}

type AuditEventResource = {
  id?: string;
  action?: string;
  recorded?: string;
  agent?: { who?: { display?: string } }[];
  entity?: { what?: { reference?: string }; description?: string }[];
};
type SearchBundle = { entry?: { resource?: AuditEventResource }[] };

const FEED_COUNT = 12;

function parseReference(ref: string | undefined): { resourceType: string; resourceId: string } {
  const [resourceType = '', resourceId = ''] = (ref ?? '').split('/');
  return { resourceType, resourceId };
}

/** The most recent `AuditEvent`s as a normalised activity feed (newest first). */
export function useRecentActivity(): { items: ActivityItem[]; loading: boolean; error: string | null } {
  const q = useSearch('AuditEvent', { _sort: '-date', _count: String(FEED_COUNT) });

  const items = useMemo<ActivityItem[]>(() => {
    const rows = ((q.data as SearchBundle | undefined)?.entry ?? [])
      .map((e) => e.resource)
      .filter((r): r is AuditEventResource => Boolean(r));
    return rows.map((r) => {
      const entity = r.entity?.[0];
      const { resourceType, resourceId } = parseReference(entity?.what?.reference);
      const action = r.action;
      return {
        id: r.id ?? `${resourceType}/${resourceId}/${r.recorded ?? ''}`,
        action: action === 'C' || action === 'R' || action === 'U' || action === 'D' ? action : undefined,
        resourceType,
        resourceId,
        description: entity?.description,
        who: r.agent?.[0]?.who?.display ?? '',
        recorded: r.recorded,
      };
    });
  }, [q.data]);

  return {
    items,
    loading: q.isLoading,
    error: q.error ? (q.error instanceof Error ? q.error.message : String(q.error)) : null,
  };
}
