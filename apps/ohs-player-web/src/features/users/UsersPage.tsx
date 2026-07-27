import { useMemo, useState } from 'react';
import { RiAddLine, RiArrowDownSLine, RiFilter3Line, RiMore2Fill } from '@remixicon/react';
import usersEmptyIllustration from '../../assets/illustrations/users-empty.svg';
import {
  OhsDropdownMenu,
  PermissionGuard,
  useOptimisticInsert,
  useRefreshResources,
  useSearch,
  useStatusBar,
  useTranslation,
} from 'ohs-player-web-core';
import { Avatar, Button, ChipSet, DataTable, EmptyState, ErrorState, FilterChip, IconButton, Inline, LinearProgress, Page, PageHeader, SearchField, Stack, StatusBadge } from '../../components/ui';
import { UserCreateEntryDrawer } from './UserCreateEntryDrawer';
import { UserEditDrawer } from './UserEditDrawer';
import { UserDetailsDrawer } from './UserDetailsDrawer';
import { StackedSelect } from './userFormControls';
import { useInitialSearchTerm } from '../search/useInitialSearchTerm';
import { useDebounced } from '../search/useGlobalSearch';

type Bundle = { entry?: { resource?: { resourceType?: string; id?: string } }[]; total?: number };

type PractitionerRow = {
  id?: string;
  active?: boolean;
  name?: { family?: string; given?: string[] }[];
  telecom?: { system?: string; value?: string }[];
};

function fullName(p: PractitionerRow): string {
  const n = p.name?.[0];
  return `${n?.given?.join(' ') ?? ''} ${n?.family ?? ''}`.trim();
}
function emailOf(p: PractitionerRow): string {
  return p.telecom?.find((tc) => tc.system === 'email')?.value ?? '';
}
function identifierOf(p: PractitionerRow): string {
  return p.id ?? '—';
}

function practitionerIdFromReference(ref: string | undefined): string | undefined {
  if (!ref) return undefined;
  return ref.replace(/^Practitioner\//, '');
}

function buildPractitionerRoleMap(
  bundle: { entry?: { resource?: Record<string, unknown> }[] } | undefined,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const ent of bundle?.entry ?? []) {
    const pr = ent.resource as {
      practitioner?: { reference?: string };
      code?: { coding?: { code?: string }[] }[];
    };
    const pid = practitionerIdFromReference(pr.practitioner?.reference);
    if (!pid) continue;
    const codes =
      pr.code?.flatMap((c) => c.coding?.map((x) => x.code).filter(Boolean) as string[]) ?? [];
    if (!map.has(pid)) map.set(pid, new Set());
    for (const c of codes) map.get(pid)!.add(c);
  }
  return map;
}

/** Practitioner id → organisation id, from PractitionerRole.organization references. */
function buildPractitionerOrgMap(
  bundle: { entry?: { resource?: Record<string, unknown> }[] } | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const ent of bundle?.entry ?? []) {
    const pr = ent.resource as {
      practitioner?: { reference?: string };
      organization?: { reference?: string };
    };
    const pid = practitionerIdFromReference(pr.practitioner?.reference);
    const orgRef = pr.organization?.reference;
    if (!pid || !orgRef || map.has(pid)) continue;
    map.set(pid, orgRef.replace(/^Organization\//, ''));
  }
  return map;
}

/** Organisation id → display name, from an Organization search bundle. */
function buildOrgNameMap(
  bundle: { entry?: { resource?: { id?: string; name?: string } }[] } | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const ent of bundle?.entry ?? []) {
    const org = ent.resource;
    if (org?.id) map.set(org.id, org.name ?? org.id);
  }
  return map;
}

export function UsersPage() {
  const { t } = useTranslation();
  const status = useStatusBar();
  const refresh = useRefreshResources();
  const insert = useOptimisticInsert();
  const [q, setQ] = useState(useInitialSearchTerm());
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  // One drawer at a time: details OR edit, never both (avoids the two-drawer overlay).
  const [viewer, setViewer] = useState<{ mode: 'details' | 'edit'; id: string } | null>(null);
  const openDetails = (id: string) => setViewer({ mode: 'details', id });
  const openEdit = (id: string) => setViewer({ mode: 'edit', id });
  const closeViewer = () => setViewer(null);

  const activeFilterCount = (statusFilter === 'all' ? 0 : 1) + (roleFilter ? 1 : 0);

  const clearFilters = (): void => {
    setStatusFilter('all');
    setRoleFilter('');
  };

  // Server-side name search (debounced so each keystroke doesn't refire the query): `name:contains`
  // matches given/family on the server, so the search runs against the full dataset rather than only
  // the first page fetched client-side. `_count: '500'` still caps each response page (no pagination
  // yet), but with server filtering you only reach it if 500+ users match the term. Status/role still
  // filter client-side on the returned set (role derives from the separate PractitionerRole search).
  const debouncedQ = useDebounced(q.trim(), 300);
  const searchParams = useMemo<Record<string, string>>(() => {
    const params: Record<string, string> = { _count: '500' };
    if (debouncedQ) params['name:contains'] = debouncedQ;
    return params;
  }, [debouncedQ]);
  const search = useSearch('Practitioner', searchParams);
  const roleSearch = useSearch('PractitionerRole', { _count: '500' });
  const orgSearch = useSearch('Organization', { _count: '500' });

  const bundle = search.data as Bundle | undefined;
  const rawRows = useMemo(
    () =>
      (bundle?.entry?.map((e) => e.resource).filter(Boolean) ?? []) as PractitionerRow[],
    [bundle?.entry],
  );

  const roleMap = useMemo(
    () =>
      buildPractitionerRoleMap(
        roleSearch.data as { entry?: { resource?: Record<string, unknown> }[] },
      ),
    [roleSearch.data],
  );

  const orgIdByPractitioner = useMemo(
    () =>
      buildPractitionerOrgMap(
        roleSearch.data as { entry?: { resource?: Record<string, unknown> }[] },
      ),
    [roleSearch.data],
  );

  const orgNameById = useMemo(
    () => buildOrgNameMap(orgSearch.data as { entry?: { resource?: { id?: string; name?: string } }[] }),
    [orgSearch.data],
  );

  const roleOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const s of roleMap.values()) {
      for (const c of s) codes.add(c);
    }
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    return sorted.map((code) => ({ value: code, label: code }));
  }, [roleMap]);

  // Name matching is done server-side via `name:contains`; here we only apply the status/role filters
  // to the returned set.
  const filteredRows = useMemo(() => {
    return rawRows.filter((p) => {
      if (!p.id) return false;
      if (statusFilter === 'active' && p.active === false) return false;
      if (statusFilter === 'inactive' && p.active !== false) return false;
      if (roleFilter) {
        const roles = roleMap.get(p.id);
        if (!roles?.has(roleFilter)) return false;
      }
      return true;
    });
  }, [rawRows, statusFilter, roleFilter, roleMap]);

  let searchError: string | null = null;
  if (search.error) {
    searchError = search.error instanceof Error ? search.error.message : String(search.error);
  }

  const openCreate = (): void => {
    setCreateOpen(true);
  };

  const refetchUsers = (): void => {
    void refresh(['Practitioner', 'PractitionerRole']);
  };

  // Show the created user immediately; the optimistic insert reconciles (incl. PractitionerRole-derived
  // columns) in the background without the refetch wiping the row. Plain refresh only if no resource came back.
  const handleUserCreated = (created?: { id?: string } & Record<string, unknown>): void => {
    setCreateOpen(false);
    status.notify({ tone: 'success', title: t('userCreated') });
    if (created) insert('Practitioner', created, { also: ['PractitionerRole'] });
    else refetchUsers();
  };

  const isFiltering = q.trim() !== '' || statusFilter !== 'all' || roleFilter !== '';
  // Only the genuine "no users at all" case hides the toolbar; a no-match search keeps it.
  const noUsers = !search.isLoading && !searchError && rawRows.length === 0 && !isFiltering;

  return (
    <Page>
      <PageHeader
        title={t('pageUsers')}
        description={t('pageUsersDescription')}
        actions={
          <>
            {rawRows.length > 0 ? (
              <Button
                variant="secondary"
                type="button"
                iconRight={<RiArrowDownSLine size={20} />}
                onClick={() => status.notify({ tone: 'info', title: t('exportComingSoon') })}
              >
                {t('exportLabel')}
              </Button>
            ) : null}
            <PermissionGuard permission="users.create">
              <Button type="button" iconLeft={<RiAddLine size={20} />} onClick={openCreate}>
                {t('addUser')}
              </Button>
            </PermissionGuard>
          </>
        }
      />

      {search.isLoading ? <LinearProgress /> : null}

      {createOpen ? (
        <UserCreateEntryDrawer onClose={() => setCreateOpen(false)} onSuccess={handleUserCreated} />
      ) : null}

      {noUsers ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState
            illustration={<img src={usersEmptyIllustration} alt="" width={112} height={130} />}
            title={t('usersEmptyTitle')}
            description={t('usersEmptyDescription')}
            action={
              <PermissionGuard permission="users.create">
                <Button type="button" iconLeft={<RiAddLine size={20} />} onClick={openCreate}>
                  {t('addUser')}
                </Button>
              </PermissionGuard>
            }
          />
        </div>
      ) : (
      <DataTable<PractitionerRow>
        toolbar={
          <Stack gap={3}>
            <Inline justify="between" style={{ flexWrap: 'wrap', gap: 'var(--ohs-sys-spacing-3, 12px)', alignItems: 'center' }}>
              <SearchField
                label={t('search')}
                name="userSearch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('searchByNameOrId')}
              />
              <Button
                variant="secondary"
                type="button"
                iconLeft={<RiFilter3Line size={20} />}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((v) => !v)}
              >
                {activeFilterCount > 0 ? `${t('filterLabel')} (${activeFilterCount})` : t('filterLabel')}
              </Button>
            </Inline>
            {filtersOpen ? (
              <div className="ohs-users-filters">
                <div className="ohs-formfield ohs-users-filters__field">
                  <span className="ohs-formfield__label">{t('filterStatus')}</span>
                  <ChipSet>
                    <FilterChip label={t('filterStatusAll')} selected={statusFilter === 'all'} onChange={() => setStatusFilter('all')} />
                    <FilterChip label={t('filterStatusActive')} selected={statusFilter === 'active'} onChange={() => setStatusFilter('active')} />
                    <FilterChip label={t('filterStatusInactive')} selected={statusFilter === 'inactive'} onChange={() => setStatusFilter('inactive')} />
                  </ChipSet>
                </div>
                <div className="ohs-users-filters__field ohs-users-filters__field--role">
                  <StackedSelect
                    label={t('filterRole')}
                    value={roleFilter}
                    onChange={setRoleFilter}
                    options={roleOptions}
                    placeholder={t('filterRoleAll')}
                  />
                </div>
                {activeFilterCount > 0 ? (
                  <button type="button" className="ohs-users-filters__clear" onClick={clearFilters}>
                    {t('clearFilters')}
                  </button>
                ) : null}
              </div>
            ) : null}
          </Stack>
        }
        columns={[
          {
            key: 'identifier',
            header: t('columnIdentifier'),
            render: (p) => identifierOf(p),
          },
          {
            key: 'name',
            header: t('columnName'),
            sortable: true,
            sortValue: (p) => fullName(p).toLowerCase(),
            render: (p) => {
              const name = fullName(p) || (p.id ?? '');
              const email = emailOf(p);
              return (
                <Inline justify="start" style={{ gap: 'var(--ohs-sys-spacing-3, 12px)', alignItems: 'center' }}>
                  <Avatar name={name} />
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <button
                      type="button"
                      className="ohs-rowlink"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (p.id) openDetails(p.id);
                      }}
                    >
                      {name}
                    </button>
                    {email ? (
                      <span style={{ fontSize: 'var(--ohs-sys-typescale-body-small-size, 12px)', color: 'var(--ohs-color-text-muted, #696969)' }}>
                        {email}
                      </span>
                    ) : null}
                  </span>
                </Inline>
              );
            },
          },
          {
            key: 'role',
            header: t('columnRole'),
            render: (p) => {
              const codes = p.id
                ? [...(roleMap.get(p.id) ?? [])].sort((a, b) => a.localeCompare(b)).join(', ')
                : '';
              return codes || '—';
            },
          },
          {
            key: 'organisation',
            header: t('columnOrganisation'),
            render: (p) => {
              const orgId = p.id ? orgIdByPractitioner.get(p.id) : undefined;
              return (orgId ? orgNameById.get(orgId) : undefined) ?? '—';
            },
          },
          {
            key: 'status',
            header: t('columnStatus'),
            sortable: true,
            sortValue: (p) => (p.active === false ? 0 : 1),
            render: (p) =>
              p.active === false ? (
                <StatusBadge tone="neutral" icon={<span className="ohs-badge__dot" />}>{t('statusInactive')}</StatusBadge>
              ) : (
                <StatusBadge tone="success" icon={<span className="ohs-badge__dot" />}>{t('statusActive')}</StatusBadge>
              ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (p) => (
              <OhsDropdownMenu.Root>
                <OhsDropdownMenu.Trigger asChild>
                  <IconButton label={t('rowActions')} onClick={(e) => e.stopPropagation()}>
                    <RiMore2Fill size={20} />
                  </IconButton>
                </OhsDropdownMenu.Trigger>
                <OhsDropdownMenu.Portal>
                  <OhsDropdownMenu.Content className="ohs-dropdown-content" align="end" sideOffset={4}>
                    <OhsDropdownMenu.Item
                      className="ohs-dropdown-item"
                      onSelect={() => {
                        if (p.id) openDetails(p.id);
                      }}
                    >
                      {t('viewDetails')}
                    </OhsDropdownMenu.Item>
                    <PermissionGuard permission="users.edit">
                      <OhsDropdownMenu.Item
                        className="ohs-dropdown-item"
                        onSelect={() => {
                          if (p.id) openEdit(p.id);
                        }}
                      >
                        {t('edit')}
                      </OhsDropdownMenu.Item>
                    </PermissionGuard>
                  </OhsDropdownMenu.Content>
                </OhsDropdownMenu.Portal>
              </OhsDropdownMenu.Root>
            ),
          },
        ]}
        rows={filteredRows}
        rowKey={(p) => p.id ?? ''}
        loading={search.isLoading}
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(p) => {
          // Functional update (reads latest state) so the stray click fired as a kebab menu closes
          // can't override the edit/details the menu item just set — only opens when nothing is open.
          const id = p.id;
          if (id) setViewer((cur) => cur ?? { mode: 'details', id });
        }}
        pagination
        initialPageSize={10}
        errorState={searchError ? <ErrorState description={searchError} /> : undefined}
        emptyState={
          <EmptyState
            title={t('emptyTitle')}
            description={isFiltering ? t('filterEmpty') : t('emptyDescription')}
          />
        }
      />
      )}

      {viewer?.mode === 'details' ? (
        <UserDetailsDrawer
          id={viewer.id}
          onClose={closeViewer}
          onEdit={() => openEdit(viewer.id)}
          onDeleted={() => {
            closeViewer();
            status.notify({ tone: 'success', title: t('userDeactivated') });
            refetchUsers();
          }}
        />
      ) : null}

      {viewer?.mode === 'edit' ? (
        <UserEditDrawer
          id={viewer.id}
          onClose={closeViewer}
          onSuccess={() => {
            closeViewer();
            status.notify({ tone: 'success', title: t('saved') });
            refetchUsers();
          }}
        />
      ) : null}
    </Page>
  );
}
