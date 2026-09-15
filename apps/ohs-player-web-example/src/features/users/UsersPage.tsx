import type { Bundle, Practitioner } from '@medplum/fhirtypes';
import { OhsDropdownMenu, useSearch, useTranslation } from 'ohs-player-web-core';
import {
  DataTable,
  EmptyState,
  ErrorState,
  IconButton,
  IconMore,
  Page,
  PageHeader,
  Slot,
  type DataTableColumn,
} from 'ohs-player-web-shell';

function fullName(practitioner: Practitioner): string {
  const name = practitioner.name?.[0];
  return [name?.given?.join(' '), name?.family].filter(Boolean).join(' ');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function RowActions({ practitioner }: Readonly<{ practitioner: Practitioner }>) {
  const { t } = useTranslation();
  return (
    <OhsDropdownMenu.Root>
      <OhsDropdownMenu.Trigger asChild>
        <IconButton label={t('rowActions')}>
          <IconMore size={20} />
        </IconButton>
      </OhsDropdownMenu.Trigger>
      <OhsDropdownMenu.Portal>
        <OhsDropdownMenu.Content className="ohs-dropdown-content" align="end" sideOffset={4}>
          <Slot name="users.rowActions" context={{ practitioner }} />
        </OhsDropdownMenu.Content>
      </OhsDropdownMenu.Portal>
    </OhsDropdownMenu.Root>
  );
}

export function UsersPage() {
  const { t } = useTranslation();
  const search = useSearch('Practitioner', { _count: '50' });
  const practitioners = ((search.data as Bundle<Practitioner> | undefined)?.entry ?? [])
    .map((entry) => entry.resource)
    .filter((resource): resource is Practitioner => Boolean(resource));

  const columns: DataTableColumn<Practitioner>[] = [
    { key: 'id', header: t('columnIdentifier'), mono: true, render: (p) => p.id ?? '—' },
    { key: 'name', header: t('columnName'), render: (p) => fullName(p) || '—' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => <RowActions practitioner={p} />,
    },
  ];

  return (
    <Page>
      <PageHeader title={t('pageUsers')} description={t('pageUsersDescription')} />
      <DataTable
        columns={columns}
        rows={practitioners}
        rowKey={(p) => p.id ?? ''}
        loading={search.isLoading}
        errorState={
          search.error ? <ErrorState description={errorMessage(search.error)} /> : undefined
        }
        emptyState={<EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />}
        pagination
        initialPageSize={10}
      />
    </Page>
  );
}
