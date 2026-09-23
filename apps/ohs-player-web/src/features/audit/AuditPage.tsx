import { useCallback, useMemo, useState } from 'react';
import type { AuditEvent } from '@medplum/fhirtypes';
import { useTranslation } from 'ohs-player-web-core';
import {
  Button,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  Page,
  PageHeader,
  StatusBadge,
} from 'ohs-player-web-shell';
import { AuditDetailsDrawer } from './AuditDetailsDrawer';
import { AuditFilterBar } from './AuditFilterBar';
import { actionLabelKey, actionTone, auditErrorMessage, recordedDate } from './auditPresentation';
import { useAuditFilters } from './useAuditFilters';
import { type AuditRow, useAuditLog } from './useAuditLog';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function auditColumns(
  t: Translate,
  formatDateTime: (d: Date) => string,
  open: (row: AuditRow) => void,
): DataTableColumn<AuditRow>[] {
  return [
    {
      key: 'when',
      header: t('auditColumnWhen'),
      render: ({ item }) => {
        const recorded = recordedDate(item.recorded);
        return recorded ? <time dateTime={item.recorded}>{formatDateTime(recorded)}</time> : '—';
      },
    },
    { key: 'who', header: t('auditColumnWho'), render: ({ item }) => item.who || '—' },
    {
      key: 'action',
      header: t('auditColumnAction'),
      render: ({ item }) => (
        <StatusBadge tone={actionTone(item.action)} icon={<span className="ohs-badge__dot" />}>
          {t(actionLabelKey(item.action))}
        </StatusBadge>
      ),
    },
    {
      key: 'resourceType',
      header: t('auditColumnResourceType'),
      render: ({ item }) => item.resourceType || '—',
    },
    {
      key: 'resource',
      header: t('auditColumnResource'),
      mono: true,
      render: (row) => {
        const { item } = row;
        const action = t(actionLabelKey(item.action));
        const label = item.resourceType
          ? t('auditOpenDetails', { action, resource: `${item.resourceType} ${item.resourceId}` })
          : t('auditOpenDetailsNoResource', { action });
        return (
          <button
            type="button"
            className="ohs-rowlink"
            aria-label={label}
            onClick={(e) => {
              e.stopPropagation();
              open(row);
            }}
          >
            {item.resourceId || t('auditNoResource')}
          </button>
        );
      },
    },
  ];
}

export function AuditPage(): React.ReactElement {
  const { t, formatDateTime } = useTranslation();
  const { filters, setters, clear, hasFilters } = useAuditFilters();
  const log = useAuditLog(filters);
  const [viewing, setViewing] = useState<AuditEvent | null>(null);

  const open = useCallback((row: AuditRow) => setViewing((current) => current ?? row.event), []);
  const columns = useMemo(() => auditColumns(t, formatDateTime, open), [t, formatDateTime, open]);

  const clearAction = hasFilters ? (
    <Button variant="ghost" type="button" onClick={clear}>
      {t('filterClearAll')}
    </Button>
  ) : undefined;

  return (
    <Page>
      <PageHeader title={t('pageAudit')} description={t('pageAuditDescription')} />
      <DataTable<AuditRow>
        columns={columns}
        rows={log.rows}
        rowKey={(row) => row.item.id}
        loading={log.isLoading}
        onRowClick={open}
        toolbar={
          <AuditFilterBar
            filters={filters}
            setters={setters}
            hasFilters={hasFilters}
            onClearAll={clear}
            refreshing={log.isFetching && !log.isLoading}
          />
        }
        emptyState={
          <EmptyState
            title={t('auditEmptyTitle')}
            description={t(hasFilters ? 'auditEmptyFilteredDescription' : 'auditEmptyDescription')}
            action={clearAction}
          />
        }
        errorState={
          log.error ? (
            <ErrorState
              title={t('auditErrorTitle')}
              description={auditErrorMessage(log.error, t)}
            />
          ) : undefined
        }
        serverPagination={!log.error && log.rows.length > 0 ? log.pagination : undefined}
      />
      {viewing ? <AuditDetailsDrawer event={viewing} onClose={() => setViewing(null)} /> : null}
    </Page>
  );
}
