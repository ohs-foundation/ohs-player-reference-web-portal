import { useMemo, useState } from 'react';
import { RiAddLine, RiArrowDownSLine, RiFilter3Line, RiMore2Fill } from '@remixicon/react';
import {
  OhsDropdownMenu,
  PermissionGuard,
  useRefreshResources,
  useSearch,
  useStatusBar,
  useTranslation,
} from 'ohs-player-web-core';
import {
  Avatar,
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
import { CareTeamDetailsDrawer, type CareTeamRow } from './CareTeamDetailsDrawer';
import { CareTeamFormDrawer } from './CareTeamFormDrawer';

type PractRow = { id?: string; active?: boolean; name?: { family?: string; given?: string[] }[] };
type OrgRow = { id?: string; name?: string };

function practName(p: PractRow): string {
  const n = p.name?.[0];
  return `${n?.given?.join(' ') ?? ''} ${n?.family ?? ''}`.trim() || (p.id ?? '');
}

function memberIds(team: CareTeamRow): string[] {
  return (team.participant ?? [])
    .map((p) => p.member?.reference?.replace(/^Practitioner\//, ''))
    .filter((x): x is string => Boolean(x));
}

export function CareTeamsPage() {
  const { t } = useTranslation();
  const status = useStatusBar();
  const refresh = useRefreshResources();
  const teams = useSearch('CareTeam', { _count: '200' });
  const pract = useSearch('Practitioner', { _count: '500' });
  const orgs = useSearch('Organization', { _count: '500' });

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const resourcesOf = <T,>(data: unknown): T[] =>
    ((data as { entry?: { resource?: T }[] } | undefined)?.entry ?? [])
      .map((e) => e.resource)
      .filter((r): r is T => Boolean(r));

  const practList = useMemo(() => resourcesOf<PractRow>(pract.data), [pract.data]);
  const practNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of practList) if (p.id) m.set(p.id, practName(p));
    return m;
  }, [practList]);
  const practOptions = useMemo(
    () =>
      practList
        .filter((p) => p.id && p.active !== false)
        .map((p) => ({ value: p.id as string, label: practName(p) })),
    [practList],
  );

  const orgList = useMemo(() => resourcesOf<OrgRow>(orgs.data), [orgs.data]);
  const orgNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orgList) if (o.id) m.set(o.id, o.name ?? o.id);
    return m;
  }, [orgList]);
  const orgOptions = useMemo(
    () => orgList.filter((o) => o.id).map((o) => ({ value: `Organization/${o.id}`, label: o.name ?? (o.id as string) })),
    [orgList],
  );
  const orgNameOf = (team: CareTeamRow): string | undefined => {
    const id = team.managingOrganization?.[0]?.reference?.replace(/^Organization\//, '');
    return id ? orgNameById.get(id) ?? id : undefined;
  };

  const teamList = useMemo(() => resourcesOf<CareTeamRow>(teams.data), [teams.data]);

  const isActive = (team: CareTeamRow): boolean => (team.status ?? 'active') === 'active';

  const filteredRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return teamList.filter((team) => {
      if (!team.id) return false;
      if (term && !`${team.name ?? ''} ${team.id}`.toLowerCase().includes(term)) return false;
      if (statusFilter === 'active' && !isActive(team)) return false;
      if (statusFilter === 'inactive' && isActive(team)) return false;
      return true;
    });
    // isActive is a pure derivation of stable inputs
  }, [teamList, q, statusFilter]);

  let teamsError: string | null = null;
  if (teams.error) {
    teamsError = teams.error instanceof Error ? teams.error.message : String(teams.error);
  }

  const isFiltering = q.trim() !== '' || statusFilter !== 'all';
  const noTeams = !teams.isLoading && !teamsError && teamList.length === 0 && !isFiltering;
  const viewTeam = teamList.find((tm) => tm.id === viewId) ?? null;
  const editTeam = teamList.find((tm) => tm.id === editId) ?? null;

  const openCreate = (): void => {
    setCreateOpen(true);
  };

  return (
    <Page>
      <PageHeader
        title={t('pageCareTeams')}
        description={t('pageCareTeamsDescription')}
        actions={
          <>
            {teamList.length > 0 ? (
              <Button
                variant="secondary"
                type="button"
                iconRight={<RiArrowDownSLine size={20} />}
                onClick={() => status.notify({ tone: 'info', title: t('exportComingSoon') })}
              >
                {t('exportLabel')}
              </Button>
            ) : null}
            <PermissionGuard permission="careteams.manage">
              <Button type="button" iconLeft={<RiAddLine size={20} />} onClick={openCreate}>
                {t('addCareTeam')}
              </Button>
            </PermissionGuard>
          </>
        }
      />

      {teams.isLoading ? <LinearProgress /> : null}

      {createOpen ? (
        <CareTeamFormDrawer
          practOptions={practOptions}
          orgOptions={orgOptions}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            status.notify({ tone: 'success', title: t('careTeamCreated') });
            void refresh('CareTeam');
          }}
        />
      ) : null}

      {editTeam ? (
        <CareTeamFormDrawer
          team={editTeam}
          practOptions={practOptions}
          orgOptions={orgOptions}
          onClose={() => setEditId(null)}
          onSuccess={() => {
            setEditId(null);
            status.notify({ tone: 'success', title: t('careTeamUpdated') });
            void refresh('CareTeam');
          }}
        />
      ) : null}

      {noTeams ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            action={
              <PermissionGuard permission="careteams.manage">
                <Button type="button" iconLeft={<RiAddLine size={20} />} onClick={openCreate}>
                  {t('addCareTeam')}
                </Button>
              </PermissionGuard>
            }
          />
        </div>
      ) : (
        <DataTable<CareTeamRow>
          toolbar={
            <Stack gap={3}>
              <Inline
                justify="between"
                style={{ flexWrap: 'wrap', gap: 'var(--ohs-spacing-3, 12px)', alignItems: 'center' }}
              >
                <SearchField
                  label={t('search')}
                  name="careTeamSearch"
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
            { key: 'identifier', header: t('columnIdentifier'), render: (tm) => tm.id ?? '—' },
            {
              key: 'name',
              header: t('columnName'),
              sortable: true,
              sortValue: (tm) => (tm.name ?? '').toLowerCase(),
              render: (tm) => {
                const members = memberIds(tm);
                return (
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ohs-spacing-1, 4px)', minWidth: 0 }}>
                    <button
                      type="button"
                      className="ohs-rowlink"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (tm.id) setViewId(tm.id);
                      }}
                    >
                      {tm.name ?? tm.id}
                    </button>
                    <Inline justify="start" style={{ gap: 'var(--ohs-spacing-2, 8px)', alignItems: 'center' }}>
                      {members.length > 0 ? (
                        <span className="ohs-avatar-stack">
                          {members.slice(0, 3).map((mid) => (
                            <Avatar key={mid} name={practNameById.get(mid) ?? mid} className="ohs-avatar--sm" />
                          ))}
                        </span>
                      ) : null}
                      <span style={{ fontSize: 'var(--ohs-font-text-s-size, 12px)', color: 'var(--ohs-color-text-muted, #696969)' }}>
                        {t('membersCount', { count: members.length })}
                      </span>
                    </Inline>
                  </span>
                );
              },
            },
            {
              key: 'organisation',
              header: t('columnOrganisation'),
              sortable: true,
              sortValue: (tm) => (orgNameOf(tm) ?? '').toLowerCase(),
              render: (tm) => orgNameOf(tm) ?? '—',
            },
            {
              key: 'status',
              header: t('columnStatus'),
              sortable: true,
              sortValue: (tm) => (isActive(tm) ? 1 : 0),
              render: (tm) =>
                isActive(tm) ? (
                  <StatusBadge tone="success" icon={<span className="ohs-badge__dot" />}>{t('statusActive')}</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral" icon={<span className="ohs-badge__dot" />}>{t('statusInactive')}</StatusBadge>
                ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (tm) => (
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
                          if (tm.id) setViewId(tm.id);
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
          rowKey={(tm) => tm.id ?? ''}
          loading={teams.isLoading}
          selectable
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(tm) => {
            const id = tm.id;
            if (id) setViewId((cur) => cur ?? id);
          }}
          pagination
          initialPageSize={10}
          errorState={teamsError ? <ErrorState description={teamsError} /> : undefined}
          emptyState={
            <EmptyState
              title={t('emptyTitle')}
              description={isFiltering ? t('filterEmptyGeneric') : t('emptyDescription')}
            />
          }
        />
      )}

      {viewTeam ? (
        <CareTeamDetailsDrawer
          team={viewTeam}
          active={isActive(viewTeam)}
          practNameById={practNameById}
          orgName={orgNameOf(viewTeam)}
          onClose={() => setViewId(null)}
          onEdit={() => {
            const id = viewTeam.id;
            setViewId(null);
            if (id) setEditId(id);
          }}
          onChanged={() => {
            void refresh('CareTeam');
          }}
        />
      ) : null}
    </Page>
  );
}
