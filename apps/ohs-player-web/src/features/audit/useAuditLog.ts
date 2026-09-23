import { useMemo, useState } from 'react';
import type { AuditEvent } from '@medplum/fhirtypes';
import { activityItemFromAuditEvent, type ActivityItem, usePagedSearch } from 'ohs-player-web-core';
import type { DataTableServerPagination } from 'ohs-player-web-shell';
import { type AuditFilters, auditSearchParams } from './auditFilters';

export interface AuditRow {
  event: AuditEvent;
  item: ActivityItem;
}

export interface AuditLog {
  rows: AuditRow[];
  pagination: DataTableServerPagination;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
}

export function useAuditLog(filters: AuditFilters): AuditLog {
  const filterKey = JSON.stringify(filters);
  const [pageSize, setPageSize] = useState(10);
  // Page state belongs to one filter set, so a filter change never fetches a stale offset.
  const [paging, setPaging] = useState({ key: filterKey, page: 0 });
  const page = paging.key === filterKey ? paging.page : 0;
  const params = useMemo(() => auditSearchParams(filters), [filters]);

  const result = usePagedSearch<AuditEvent>('AuditEvent', { page, pageSize, params });

  return {
    rows: result.rows.map((event) => ({ event, item: activityItemFromAuditEvent(event) })),
    pagination: {
      page,
      pageSize,
      total: result.total,
      hasNext: result.hasNext,
      mode: result.paginationMode,
      onPageChange: (next) => setPaging({ key: filterKey, page: next }),
      onPageSizeChange: (size) => {
        setPageSize(size);
        setPaging({ key: filterKey, page: 0 });
      },
    },
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
  };
}
