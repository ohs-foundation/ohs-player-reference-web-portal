import { useMemo, useState } from 'react';
import { IconAddCircle, IconChevronDown, IconFilterList, IconMore } from '../../components/ui/icons';
import {
  OhsDropdownMenu,
  PermissionGuard,
  useRefreshResources,
  useSearch,
  useStatusBar,
  useTranslation,
} from 'ohs-player-web-core';
import {
  Button,
  ChipSet,
  DataTable,
  EmptyState,
  ErrorState,
  FilterChip,
  IconButton,
  Inline,
  LinearProgress,
  Page,
  PageHeader,
  SearchField,
  Stack,
  StatusBadge,
} from '../../components/ui';
import orgEmptyIllustration from '../../assets/illustrations/org-empty.svg';
import { ORGANIZATION_TYPE_OPTIONS } from '../../config/organizations';
import { OrganizationDetailsDrawer, type ManagedLocation, type OrgRow } from './OrganizationDetailsDrawer';
import { OrganizationFormDrawer } from './OrganizationFormDrawer';
import type { Option } from '../users/userFormOptions';
import { useInitialSearchTerm } from '../search/useInitialSearchTerm';

type LocRow = { id?: string; name?: string; managingOrganization?: { reference?: string } };

const TYPE_LABEL_BY_CODE = new Map(ORGANIZATION_TYPE_OPTIONS.map((o) => [o.value, o.label]));

/** The resource id is the identifier (server-assigned), consistent with Users and Care Teams. */
function identifierOf(org: OrgRow): string {
  return org.id ?? '';
}

function typeCodeOf(org: OrgRow): string {
  return org.type?.[0]?.coding?.[0]?.code ?? '';
}

function typeLabelOf(org: OrgRow): string {
  const code = typeCodeOf(org);
  return code ? (TYPE_LABEL_BY_CODE.get(code) ?? code) : '';
}

function emailOf(org: OrgRow): string {
  return org.telecom?.find((tc) => tc.system === 'email')?.value ?? '';
}

export function OrganizationsPage() {
  const { t } = useTranslation();
  const status = useStatusBar();
  const refresh = useRefreshResources();
  // `_revinclude` carries each org's managed Locations in the same bundle. Deriving them from the
  // Location search instead would only ever see its first page, so a link outside that page reads
  // as "none on record" — `Location.managingOrganization` is the only place the link is stored.
  const orgs = useSearch('Organization', {
    _count: '200',
    _revinclude: 'Location:organization',
  });
  const locs = useSearch('Location', { _count: '500' });

  const [q, setQ] = useState(useInitialSearchTerm());
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const resourcesOf = <T,>(data: unknown, resourceType?: string): T[] =>
    ((data as { entry?: { resource?: (T & { resourceType?: string }) | undefined }[] } | undefined)
      ?.entry ?? [])
      .map((e) => e.resource)
      .filter((r): r is T & { resourceType?: string } => Boolean(r))
      .filter((r) => !resourceType || r.resourceType === resourceType);

  const locList = useMemo(() => resourcesOf<LocRow>(locs.data, 'Location'), [locs.data]);

  /** The `_revinclude`d Locations — every one carries a `managingOrganization`. */
  const managedLocList = useMemo(
    () => resourcesOf<LocRow>(orgs.data, 'Location'),
    [orgs.data],
  );

  /** Locations grouped by the org they're managed by (`Location.managingOrganization`). */
  const locationsByOrgId = useMemo(() => {
    const m = new Map<string, ManagedLocation[]>();
    for (const l of managedLocList) {
      const orgId = l.managingOrganization?.reference?.replace(/^Organization\//, '');
      if (!orgId || !l.id) continue;
      const list = m.get(orgId) ?? [];
      list.push({ id: l.id, name: l.name ?? l.id });
      m.set(orgId, list);
    }
    return m;
  }, [managedLocList]);

  // Options for an org's location picker: unmanaged Locations plus the ones this org already manages —
  // excludes Locations managed by another org so we don't silently steal them (managingOrganization is 0..1).
  // The org's own locations come from the `_revinclude` so they survive falling outside the Location page.
  const locationOptionsFor = (orgId?: string): Option[] => {
    const seen = new Set<string>();
    const options: Option[] = [];
    const add = (l: LocRow) => {
      if (!l.id || seen.has(l.id)) return;
      seen.add(l.id);
      options.push({ value: `Location/${l.id}`, label: l.name ?? l.id });
    };

    for (const l of managedLocList) {
      const managerId = l.managingOrganization?.reference?.replace(/^Organization\//, '');
      if (managerId && managerId === orgId) add(l);
    }
    for (const l of locList) {
      const managerId = l.managingOrganization?.reference?.replace(/^Organization\//, '');
      if (!managerId || managerId === orgId) add(l);
    }
    return options;
  };

  const orgList = useMemo(() => {
    const list = resourcesOf<OrgRow>(orgs.data, 'Organization');
    return list.map((o) => ({ ...o, managedLocations: o.id ? locationsByOrgId.get(o.id) : undefined }));
  }, [orgs.data, locationsByOrgId]);

  const isActive = (org: OrgRow): boolean => org.active !== false;

  const filteredRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orgList.filter((org) => {
      if (!org.id) return false;
      if (term && !`${org.name ?? ''} ${org.id}`.toLowerCase().includes(term)) return false;
      if (statusFilter === 'active' && !isActive(org)) return false;
      if (statusFilter === 'inactive' && isActive(org)) return false;
      return true;
    });
  }, [orgList, q, statusFilter]);

  let orgsError: string | null = null;
  if (orgs.error) {
    orgsError = orgs.error instanceof Error ? orgs.error.message : String(orgs.error);
  }

  const isFiltering = q.trim() !== '' || statusFilter !== 'all';
  const noOrgs = !orgs.isLoading && !orgsError && orgList.length === 0 && !isFiltering;
  const viewOrg = orgList.find((o) => o.id === viewId) ?? null;
  const editOrg = orgList.find((o) => o.id === editId) ?? null;

  const openCreate = (): void => {
    setCreateOpen(true);
  };

  return (
    <Page>
      <PageHeader
        title={t('pageOrganizations')}
        description={t('pageOrganizationsDescription')}
        actions={
          <>
            {orgList.length > 0 ? (
              <Button
                variant="secondary"
                type="button"
                iconRight={<IconChevronDown size={20} />}
                onClick={() => status.notify({ tone: 'info', title: t('exportComingSoon') })}
              >
                {t('exportLabel')}
              </Button>
            ) : null}
            <PermissionGuard permission="orgs.create">
              <Button type="button" iconLeft={<IconAddCircle size={20} />} onClick={openCreate}>
                {t('addOrganization')}
              </Button>
            </PermissionGuard>
          </>
        }
      />

      {orgs.isLoading ? <LinearProgress /> : null}

      {createOpen ? (
        <OrganizationFormDrawer
          locationOptions={locationOptionsFor()}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            status.notify({ tone: 'success', title: t('organizationCreated') });
          }}
        />
      ) : null}

      {editOrg ? (
        <OrganizationFormDrawer
          org={editOrg}
          managedLocations={editOrg.managedLocations}
          locationOptions={locationOptionsFor(editOrg.id)}
          onClose={() => setEditId(null)}
          onSuccess={() => {
            setEditId(null);
            status.notify({ tone: 'success', title: t('organizationUpdated') });
          }}
        />
      ) : null}

      {noOrgs ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState
            illustration={<img src={orgEmptyIllustration} alt="" width={112} height={105} />}
            title={t('emptyTitle')}
            description={t('organizationsEmptyDescription')}
            action={
              <PermissionGuard permission="orgs.create">
                <Button type="button" iconLeft={<IconAddCircle size={20} />} onClick={openCreate}>
                  {t('addOrganization')}
                </Button>
              </PermissionGuard>
            }
          />
        </div>
      ) : (
        <DataTable<OrgRow>
          toolbar={
            <Stack gap={3}>
              <Inline
                style={{ flexWrap: 'wrap', gap: 'var(--ohs-sys-spacing-3, 12px)', alignItems: 'center' }}
              >
                <SearchField
                  label={t('search')}
                  name="orgSearch"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('searchByNameOrId')}
                />
                <Button
                  variant="secondary"
                  type="button"
                  iconLeft={<IconFilterList size={20} />}
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((v) => !v)}
                >
                  {statusFilter !== 'all' ? `${t('filterLabel')} (1)` : t('filterLabel')}
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
                  {statusFilter !== 'all' ? (
                    <button type="button" className="ohs-users-filters__clear" onClick={() => setStatusFilter('all')}>
                      {t('clearFilters')}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </Stack>
          }
          columns={[
            { key: 'identifier', header: t('columnIdentifier'), mono: true, render: (o) => identifierOf(o) || '—' },
            {
              key: 'name',
              header: t('columnName'),
              sortable: true,
              sortValue: (o) => (o.name ?? '').toLowerCase(),
              render: (o) => (
                <button
                  type="button"
                  className="ohs-rowlink"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (o.id) setViewId(o.id);
                  }}
                >
                  {o.name ?? o.id}
                </button>
              ),
            },
            {
              key: 'type',
              header: t('organizationType'),
              sortable: true,
              sortValue: (o) => typeLabelOf(o).toLowerCase(),
              render: (o) => typeLabelOf(o) || '—',
            },
            { key: 'email', header: t('emailAddress'), render: (o) => emailOf(o) || '—' },
            {
              key: 'status',
              header: t('columnStatus'),
              sortable: true,
              sortValue: (o) => (isActive(o) ? 1 : 0),
              render: (o) =>
                isActive(o) ? (
                  <StatusBadge tone="success" icon={<span className="ohs-badge__dot" />}>{t('statusActive')}</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral" icon={<span className="ohs-badge__dot" />}>{t('statusInactive')}</StatusBadge>
                ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (o) => (
                <OhsDropdownMenu.Root>
                  <OhsDropdownMenu.Trigger asChild>
                    <IconButton label={t('rowActions')} onClick={(e) => e.stopPropagation()}>
                      <IconMore size={20} />
                    </IconButton>
                  </OhsDropdownMenu.Trigger>
                  <OhsDropdownMenu.Portal>
                    <OhsDropdownMenu.Content className="ohs-dropdown-content" align="end" sideOffset={4}>
                      <OhsDropdownMenu.Item
                        className="ohs-dropdown-item"
                        onSelect={() => {
                          if (o.id) setViewId(o.id);
                        }}
                      >
                        {t('viewDetails')}
                      </OhsDropdownMenu.Item>
                    </OhsDropdownMenu.Content>
                  </OhsDropdownMenu.Portal>
                </OhsDropdownMenu.Root>
              ),
            },
          ]}
          rows={filteredRows}
          rowKey={(o) => o.id ?? ''}
          loading={orgs.isLoading}
          selectable
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(o) => {
            const id = o.id;
            if (id) setViewId((cur) => cur ?? id);
          }}
          pagination
          initialPageSize={10}
          errorState={orgsError ? <ErrorState description={orgsError} /> : undefined}
          emptyState={
            <EmptyState
              title={t('emptyTitle')}
              description={isFiltering ? t('filterEmptyGeneric') : t('organizationsEmptyDescription')}
            />
          }
        />
      )}

      {viewOrg ? (
        <OrganizationDetailsDrawer
          org={viewOrg}
          active={isActive(viewOrg)}
          typeLabel={typeLabelOf(viewOrg)}
          identifierValue={identifierOf(viewOrg)}
          email={emailOf(viewOrg)}
          onClose={() => setViewId(null)}
          onEdit={() => {
            const id = viewOrg.id;
            setViewId(null);
            if (id) setEditId(id);
          }}
          onChanged={() => {
            void refresh(['Organization', 'Location']);
          }}
        />
      ) : null}
    </Page>
  );
}
