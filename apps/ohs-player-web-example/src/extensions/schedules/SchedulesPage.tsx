import type { Bundle, Schedule } from '@medplum/fhirtypes';
import { useSearch, useTranslation } from 'ohs-player-web-core';
import {
  describeError,
  DataTable,
  EmptyState,
  ErrorState,
  Page,
  PageHeader,
  StatusBadge,
  type DataTableColumn,
} from 'ohs-player-web-shell';
import { Link, useSearchParams } from 'react-router-dom';

function actorsOf(schedule: Schedule): string {
  const actors = (schedule.actor ?? []).map((actor) => actor.display ?? actor.reference);
  return actors.filter(Boolean).join(', ') || '—';
}

export default function SchedulesPage(): React.ReactElement {
  const { t, formatDate } = useTranslation();
  const [params] = useSearchParams();
  const actor = params.get('actor') ?? undefined;
  const search = useSearch('Schedule', actor ? { actor, _count: '50' } : { _count: '50' });
  const schedules = ((search.data as Bundle<Schedule> | undefined)?.entry ?? [])
    .map((entry) => entry.resource)
    .filter((resource): resource is Schedule => Boolean(resource));

  const horizonOf = ({ planningHorizon }: Schedule): string => {
    const dates = [planningHorizon?.start, planningHorizon?.end];
    if (dates.every((date) => !date)) return '—';
    return dates.map((date) => (date ? formatDate(new Date(date)) : '…')).join(' – ');
  };

  const columns: DataTableColumn<Schedule>[] = [
    { key: 'id', header: t('columnIdentifier'), mono: true, render: (s) => s.id ?? '—' },
    { key: 'actor', header: t('schedulesColumnActor'), render: actorsOf },
    { key: 'horizon', header: t('schedulesColumnPlanningHorizon'), render: horizonOf },
    {
      key: 'status',
      header: t('columnStatus'),
      render: (s) =>
        s.active === false ? (
          <StatusBadge tone="neutral">{t('statusInactive')}</StatusBadge>
        ) : (
          <StatusBadge tone="success">{t('statusActive')}</StatusBadge>
        ),
    },
  ];

  return (
    <Page>
      <PageHeader
        title={t('schedulesTitle')}
        description={actor ? t('schedulesForActor', { actor }) : t('schedulesDescription')}
        actions={actor ? <Link to="/schedules">{t('schedulesShowAll')}</Link> : undefined}
      />
      <DataTable
        columns={columns}
        rows={schedules}
        rowKey={(s) => s.id ?? ''}
        loading={search.isLoading}
        errorState={search.error ? <ErrorState {...describeError(search.error, t)} /> : undefined}
        emptyState={
          <EmptyState
            title={t('schedulesEmptyTitle')}
            description={t('schedulesEmptyDescription')}
          />
        }
      />
    </Page>
  );
}
