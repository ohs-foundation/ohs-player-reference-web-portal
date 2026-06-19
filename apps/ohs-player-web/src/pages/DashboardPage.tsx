import { PermissionGuard, useTranslation } from 'ohs-player-web-core';
import { Link } from 'react-router-dom';
import totalUsersIcon from '../assets/illustrations/total-users.svg';
import totalLocationsIcon from '../assets/illustrations/total-locations.svg';
import totalOrganisationsIcon from '../assets/illustrations/total-organisations.svg';
import totalCareTeamsIcon from '../assets/illustrations/total-careteams.svg';
import {
  Avatar,
  LinearProgress,
  Page,
  PageHeader,
  Stack,
  StatusBadge,
  type DataTableColumn,
  type DonutSegment,
} from '../components/ui';
import { StatCard } from '../features/dashboard/StatCard';
import { RecentCard } from '../features/dashboard/RecentCard';
import { DistributionCard } from '../features/dashboard/DistributionCard';
import { useRecent, useResourceStats } from '../features/dashboard/useDashboardData';

type Named = { id?: string; name?: string };
type PractitionerRow = {
  id?: string;
  active?: boolean;
  name?: { family?: string; given?: string[] }[];
  telecom?: { system?: string; value?: string }[];
};
type LocationRow = Named & { status?: string; physicalType?: { coding?: { display?: string; code?: string }[] } };
type OrganizationRow = Named & { active?: boolean; type?: { coding?: { display?: string; code?: string }[] }[] };
type CareTeamRow = Named & { status?: string };

const ACTIVE_COLOR = 'var(--ohs-color-positive)';
const INACTIVE_COLOR = 'var(--ohs-color-neutral-surface)';

function fullName(p: PractitionerRow): string {
  const n = p.name?.[0];
  return `${n?.given?.join(' ') ?? ''} ${n?.family ?? ''}`.trim();
}

function statusBadge(active: boolean, t: (k: string) => string): React.ReactElement {
  return (
    <StatusBadge tone={active ? 'success' : 'neutral'} icon={<span className="ohs-badge__dot" />}>
      {active ? t('statusActive') : t('statusInactive')}
    </StatusBadge>
  );
}

/** Active vs (total − active) as donut segments; `undefined` counts read as 0 so the card shows empty. */
function activeSplit(
  total: number | undefined,
  active: number | undefined,
  t: (k: string) => string,
): DonutSegment[] {
  const a = active ?? 0;
  const inactive = Math.max(0, (total ?? 0) - a);
  return [
    { label: t('statusActive'), value: a, color: ACTIVE_COLOR },
    { label: t('statusInactive'), value: inactive, color: INACTIVE_COLOR },
  ];
}

export function DashboardPage(): React.ReactElement {
  const { t } = useTranslation();

  const users = useResourceStats('Practitioner', { active: 'true' });
  const locations = useResourceStats('Location', { status: 'active' });
  const orgs = useResourceStats('Organization', { active: 'true' });
  const careTeams = useResourceStats('CareTeam', { status: 'active' });

  const recentUsers = useRecent<PractitionerRow>('Practitioner');
  const recentLocations = useRecent<LocationRow>('Location');
  const recentOrgs = useRecent<OrganizationRow>('Organization');
  const recentCareTeams = useRecent<CareTeamRow>('CareTeam');

  const anyStatsLoading = users.loading || locations.loading || orgs.loading || careTeams.loading;

  const personCell = (name: string, id: string, email: string, to: string): React.ReactElement => (
    <div className="ohs-dash-person">
      <Avatar name={name || id} />
      <span style={{ minWidth: 0 }}>
        <Link to={to} className="ohs-dash-person__name">
          {name || id}
        </Link>
        {email ? <span className="ohs-dash-person__sub">{email}</span> : null}
      </span>
    </div>
  );

  const userColumns: DataTableColumn<PractitionerRow>[] = [
    { key: 'id', header: t('columnIdentifier'), render: (p) => p.id ?? '—' },
    {
      key: 'name',
      header: t('columnName'),
      render: (p) =>
        personCell(
          fullName(p),
          p.id ?? '',
          p.telecom?.find((tc) => tc.system === 'email')?.value ?? '',
          `/users`,
        ),
    },
    { key: 'status', header: t('columnStatus'), render: (p) => statusBadge(p.active !== false, t) },
  ];

  const locationColumns: DataTableColumn<LocationRow>[] = [
    { key: 'id', header: t('columnIdentifier'), render: (l) => l.id ?? '—' },
    { key: 'name', header: t('columnName'), render: (l) => l.name ?? l.id ?? '—' },
    {
      key: 'type',
      header: t('columnType'),
      render: (l) => l.physicalType?.coding?.[0]?.display ?? l.physicalType?.coding?.[0]?.code ?? '—',
    },
    { key: 'status', header: t('columnStatus'), render: (l) => statusBadge(l.status === 'active', t) },
  ];

  const orgColumns: DataTableColumn<OrganizationRow>[] = [
    { key: 'id', header: t('columnIdentifier'), render: (o) => o.id ?? '—' },
    { key: 'name', header: t('columnName'), render: (o) => o.name ?? o.id ?? '—' },
    {
      key: 'type',
      header: t('columnType'),
      render: (o) => o.type?.[0]?.coding?.[0]?.display ?? o.type?.[0]?.coding?.[0]?.code ?? '—',
    },
    { key: 'status', header: t('columnStatus'), render: (o) => statusBadge(o.active !== false, t) },
  ];

  const careTeamColumns: DataTableColumn<CareTeamRow>[] = [
    { key: 'id', header: t('columnIdentifier'), render: (c) => c.id ?? '—' },
    { key: 'name', header: t('columnName'), render: (c) => c.name ?? c.id ?? '—' },
    { key: 'status', header: t('columnStatus'), render: (c) => statusBadge(c.status === 'active', t) },
  ];

  return (
    <Page>
      <PageHeader title={t('pageDashboard')} description={t('pageDashboardDescription')} />
      {anyStatsLoading ? <LinearProgress style={{ marginBottom: 'var(--ohs-spacing-4, 16px)' }} /> : null}

      <PermissionGuard permission="dashboard.view">
        <Stack gap={5}>
          <section aria-label={t('pageDashboard')} className="ohs-kpi-grid">
            <StatCard label={t('kpiTotalUsers')} value={users.total} loading={users.loading} iconSrc={totalUsersIcon} />
            <StatCard label={t('kpiTotalLocations')} value={locations.total} loading={locations.loading} iconSrc={totalLocationsIcon} />
            <StatCard label={t('kpiTotalOrganizations')} value={orgs.total} loading={orgs.loading} iconSrc={totalOrganisationsIcon} />
            <StatCard label={t('kpiTotalCareTeams')} value={careTeams.total} loading={careTeams.loading} iconSrc={totalCareTeamsIcon} />
          </section>

          <div className="ohs-dash-row">
            <RecentCard
              title={t('recentUsersTitle')}
              subtitle={t('recentUsersSubtitle')}
              viewAllTo="/users"
              columns={userColumns}
              rows={recentUsers.rows}
              rowKey={(p) => p.id ?? ''}
              loading={recentUsers.loading}
              error={recentUsers.error}
            />
            <DistributionCard title={t('distributionUsers')} loading={users.loading} segments={activeSplit(users.total, users.active, t)} />
          </div>

          <div className="ohs-dash-row">
            <RecentCard
              title={t('recentLocationsTitle')}
              subtitle={t('recentLocationsSubtitle')}
              viewAllTo="/locations"
              columns={locationColumns}
              rows={recentLocations.rows}
              rowKey={(l) => l.id ?? ''}
              loading={recentLocations.loading}
              error={recentLocations.error}
            />
            <DistributionCard title={t('distributionLocations')} loading={locations.loading} segments={activeSplit(locations.total, locations.active, t)} />
          </div>

          <div className="ohs-dash-row">
            <RecentCard
              title={t('recentOrganizationsTitle')}
              subtitle={t('recentOrganizationsSubtitle')}
              viewAllTo="/organizations"
              columns={orgColumns}
              rows={recentOrgs.rows}
              rowKey={(o) => o.id ?? ''}
              loading={recentOrgs.loading}
              error={recentOrgs.error}
            />
            <DistributionCard title={t('distributionOrganizations')} loading={orgs.loading} segments={activeSplit(orgs.total, orgs.active, t)} />
          </div>

          <div className="ohs-dash-row">
            <RecentCard
              title={t('recentCareTeamsTitle')}
              subtitle={t('recentCareTeamsSubtitle')}
              viewAllTo="/care-teams"
              columns={careTeamColumns}
              rows={recentCareTeams.rows}
              rowKey={(c) => c.id ?? ''}
              loading={recentCareTeams.loading}
              error={recentCareTeams.error}
            />
            <DistributionCard title={t('distributionCareTeams')} loading={careTeams.loading} segments={activeSplit(careTeams.total, careTeams.active, t)} />
          </div>
        </Stack>
      </PermissionGuard>
    </Page>
  );
}
